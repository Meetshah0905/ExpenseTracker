import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDb } from "../types/finance";

vi.mock("./googleAuth", () => ({
  requestAccessToken: vi.fn(async () => "token")
}));

describe("driveService", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates the database file when missing", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "1", name: "finance-dashboard-db.json" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { ensureDatabaseFile } = await import("./driveService");
    await expect(ensureDatabaseFile()).resolves.toEqual({ id: "1", name: "finance-dashboard-db.json" });
  });

  it("loads and validates a Drive database", async () => {
    const db = createDefaultDb();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [{ id: "1", name: "finance-dashboard-db.json" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(db), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { loadDatabase } = await import("./driveService");
    await expect(loadDatabase()).resolves.toMatchObject({ version: 1 });
  });

  it("saves an existing database after checking remote revision", async () => {
    const db = createDefaultDb();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [{ id: "1", name: "finance-dashboard-db.json" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(db), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "1", name: "finance-dashboard-db.json" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { saveDatabase } = await import("./driveService");
    await expect(saveDatabase(db)).resolves.toMatchObject({ revision: 2 });
  });

  it("reports token expiry without overwriting data", async () => {
    const db = createDefaultDb();
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("expired", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const { saveDatabase } = await import("./driveService");
    await expect(saveDatabase(db)).rejects.toThrow("Google access expired");
  });

  it("backs up invalid JSON during recovery", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [{ id: "1", name: "finance-dashboard-db.json" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ broken: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { loadDatabase } = await import("./driveService");
    await expect(loadDatabase()).resolves.toMatchObject({ version: 1 });
  });
});
