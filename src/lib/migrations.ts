import { createDefaultDb, financeDbSchema, type FinanceDb } from "../types/finance";

export function migrateDb(raw: unknown): FinanceDb {
  const parsed = financeDbSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  if (raw && typeof raw === "object") {
    const base = createDefaultDb();
    const candidate = raw as Partial<FinanceDb>;
    return financeDbSchema.parse({
      ...base,
      ...candidate,
      schemaVersion: 1,
      appName: "DriveBackedFinance",
      version: 1,
      createdAt: candidate.createdAt ?? new Date().toISOString(),
      updatedAt: candidate.updatedAt ?? new Date().toISOString(),
      revision: candidate.revision ?? 1,
      currency: "INR",
      userSettings: { ...base.userSettings, ...candidate.userSettings },
      categories: { ...base.categories, ...candidate.categories },
      purchaseDecisions: candidate.purchaseDecisions ?? [],
      accounts: candidate.accounts ?? [],
      budgets: candidate.budgets ?? [],
      emis: candidate.emis ?? [],
      snapshots: candidate.snapshots ?? [],
      recurringTransactions: candidate.recurringTransactions ?? [],
      sync: { ...base.sync, ...candidate.sync },
      dailySnapshots: candidate.dailySnapshots ?? {}
    });
  }

  return createDefaultDb();
}
