import { describe, expect, it } from "vitest";
import { migrateDb } from "./migrations";

describe("migrateDb", () => {
  it("creates a valid current database from partial older data", () => {
    const migrated = migrateDb({ version: 0, transactions: [] });
    expect(migrated.version).toBe(1);
    expect(migrated.userSettings.currency).toBe("INR");
    expect(migrated.categories.expense).toContain("EMI");
  });
});
