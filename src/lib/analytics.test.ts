import { describe, expect, it } from "vitest";
import {
  getCategoryTotals,
  getMonthlyExpense,
  getMonthlyIncome,
  getMonthlySummary,
  getOverallExpense,
  getOverallIncome,
  getProfitLoss
} from "./analytics";
import type { Transaction } from "../types/finance";

const tx = (partial: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(),
  type: "expense",
  title: "Item",
  amount: 0,
  currency: "INR",
  category: "Other Expense",
  paymentMode: "upi",
  date: "2026-05-12",
  createdAt: "2026-05-12T00:00:00.000Z",
  updatedAt: "2026-05-12T00:00:00.000Z",
  ...partial
});

describe("analytics", () => {
  const transactions = [
    tx({ type: "income", amount: 100000, category: "YouTube Payment" }),
    tx({ type: "expense", amount: 42000, category: "Gadgets" }),
    tx({ type: "expense", amount: 8000, category: "Food" }),
    tx({ type: "income", amount: 9000, date: "2026-04-01" }),
    tx({ type: "transfer" as never, amount: 999999, date: "2026-05-12" })
  ];

  it("builds monthly income, expense, and net summaries", () => {
    expect(getMonthlySummary(transactions, "2026-05")).toMatchObject({
      incomeTotal: 100000,
      expenseTotal: 50000,
      netTotal: 50000
    });
  });

  it("builds category totals", () => {
    expect(getCategoryTotals(transactions, "2026-05")).toEqual({ Gadgets: 42000, Food: 8000 });
  });

  it("calculates monthly income and expense without transfers", () => {
    expect(getMonthlyIncome(transactions, "2026-05")).toBe(100000);
    expect(getMonthlyExpense(transactions, "2026-05")).toBe(50000);
  });

  it("calculates monthly profit and loss", () => {
    expect(getProfitLoss(100000, 50000)).toBe(50000);
    expect(getProfitLoss(10000, 50000)).toBe(-40000);
  });

  it("calculates overall income and expense", () => {
    expect(getOverallIncome(transactions)).toBe(109000);
    expect(getOverallExpense(transactions)).toBe(50000);
    expect(getProfitLoss(getOverallIncome(transactions), getOverallExpense(transactions))).toBe(59000);
  });
});
