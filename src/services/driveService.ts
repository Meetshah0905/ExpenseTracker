import { createSnapshotSummary } from "../lib/analytics";
import { todayIso } from "../lib/date";
import { migrateDb } from "../lib/migrations";
import { createDefaultDb, financeDbSchema, type FinanceDb } from "../types/finance";
import { requestAccessToken } from "./googleAuth";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const DB_FILENAME = "finance-app-data.json";
const LEGACY_DB_FILENAME = "finance-dashboard-db.json";

export type DriveFile = {
  id: string;
  name: string;
  modifiedTime?: string;
};

export type DriveDebugState = {
  dbFileFound: boolean;
  dbFileId?: string;
  dbModifiedTime?: string;
  lastError?: string;
  lastOperation?: string;
};

const debugState: DriveDebugState = {
  dbFileFound: false
};

let databaseFile: DriveFile | null = null;

export function getDriveDebugState() {
  return { ...debugState };
}

function setDebug(update: Partial<DriveDebugState>) {
  Object.assign(debugState, update);
}

function driveError(message: string, response?: Response) {
  const error = new Error(response ? `${message} (${response.status})` : message);
  setDebug({ lastError: error.message });
  return error;
}

async function driveFetch(path: string, init: RequestInit = {}) {
  const token = await requestAccessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    }
  });

  if (response.status === 401) {
    throw driveError("Google access expired. Please reconnect", response);
  }

  return response;
}

export async function findAppDataFile(filename: string): Promise<DriveFile | null> {
  setDebug({ lastOperation: `find:${filename}` });
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    q: `name='${filename.replaceAll("'", "\\'")}' and trashed=false`
  });
  const response = await driveFetch(`${DRIVE_FILES_URL}?${params.toString()}`);
  if (!response.ok) throw driveError("Could not search Google Drive app data", response);
  const data = (await response.json()) as { files: DriveFile[] };
  const file = data.files[0] ?? null;
  if (filename === DB_FILENAME) {
    databaseFile = file;
    setDebug({
      dbFileFound: Boolean(file),
      dbFileId: file?.id,
      dbModifiedTime: file?.modifiedTime,
      lastError: undefined
    });
  }
  return file;
}

export async function createAppDataFile(filename: string, json: unknown): Promise<DriveFile> {
  setDebug({ lastOperation: `create:${filename}` });
  const metadata = {
    name: filename,
    parents: ["appDataFolder"],
    mimeType: "application/json"
  };
  const body = new FormData();
  body.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  body.append("file", new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }));

  const response = await driveFetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name`, {
    method: "POST",
    body
  });
  if (!response.ok) throw driveError("Could not create Google Drive file", response);
  const file = await response.json();
  if (filename === DB_FILENAME) {
    databaseFile = file;
    setDebug({ dbFileFound: true, dbFileId: file.id, lastError: undefined });
  }
  return file;
}

export async function updateAppDataFile(fileId: string, json: unknown): Promise<DriveFile> {
  setDebug({ lastOperation: `update:${fileId}` });
  const response = await driveFetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media&fields=id,name`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json, null, 2)
  });
  if (!response.ok) throw driveError("Could not update Google Drive file", response);
  setDebug({ lastError: undefined });
  return response.json();
}

async function updateAppDataFileMetadata(fileId: string, metadata: Record<string, unknown>): Promise<DriveFile> {
  setDebug({ lastOperation: `metadata:${fileId}` });
  const response = await driveFetch(`${DRIVE_FILES_URL}/${fileId}?fields=id,name,modifiedTime`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata)
  });
  if (!response.ok) throw driveError("Could not update Google Drive metadata", response);
  const file = await response.json();
  setDebug({ dbFileFound: true, dbFileId: file.id, dbModifiedTime: file.modifiedTime, lastError: undefined });
  return file;
}

export async function readAppDataFile<T = unknown>(fileId: string): Promise<T> {
  setDebug({ lastOperation: `read:${fileId}` });
  const response = await driveFetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`);
  if (!response.ok) throw driveError("Could not read Google Drive file", response);
  setDebug({ lastError: undefined });
  return response.json();
}

export async function ensureDatabaseFile() {
  if (databaseFile) return databaseFile;
  const existing = await findAppDataFile(DB_FILENAME);
  if (existing) return existing;
  const legacy = await findAppDataFile(LEGACY_DB_FILENAME);
  if (legacy) {
    const renamed = await updateAppDataFileMetadata(legacy.id, { name: DB_FILENAME });
    databaseFile = renamed;
    return renamed;
  }
  setDebug({ lastOperation: "create_database" });
  return createAppDataFile(DB_FILENAME, createDefaultDb());
}

export async function loadDatabase(): Promise<FinanceDb> {
  const file = await ensureDatabaseFile();
  const raw = await readAppDataFile(file.id);
  const migrated = migrateDb(raw);
  const parsed = financeDbSchema.safeParse(migrated);
  if (!parsed.success) {
    await createBackupFile(raw, "corrupted");
    throw driveError("Drive data looks corrupted. Recovery mode started");
  }
  return parsed.data;
}

export async function saveDatabase(db: FinanceDb) {
  const file = await ensureDatabaseFile();
  const remote = await readAppDataFile<unknown>(file.id).catch(() => null);
  const remoteParsed = financeDbSchema.safeParse(remote ? migrateDb(remote) : null);
  if (remoteParsed.success && remoteParsed.data.updatedAt > db.updatedAt) {
    await createBackupFile(db, "local-conflict");
    throw driveError("Drive has newer data. Force reload from Drive before saving");
  }
  const nextDb = {
    ...db,
    updatedAt: new Date().toISOString(),
    revision: (db.revision ?? 1) + 1,
    lastSyncedAt: new Date().toISOString(),
    sync: {
      ...db.sync,
      driveFileId: file.id,
      lastSyncedAt: new Date().toISOString(),
      lastRemoteModifiedAt: new Date().toISOString()
    }
  };
  await updateAppDataFile(file.id, nextDb);
  return nextDb;
}

export async function createDailySnapshot(db: FinanceDb) {
  const date = todayIso();
  const filename = `snapshots/${date}.json`;
  const snapshot = createSnapshotSummary(db, date);
  const existing = await findAppDataFile(filename);
  if (existing) await updateAppDataFile(existing.id, snapshot);
  else await createAppDataFile(filename, snapshot);
  return snapshot;
}

export async function createBackupFile(json: unknown, reason = "manual") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  return createAppDataFile(`backups/finance-app-data-backup-${stamp}-${reason}.json`, json);
}

export function resetDriveCache() {
  databaseFile = null;
  setDebug({ dbFileFound: false, dbFileId: undefined, dbModifiedTime: undefined });
}
