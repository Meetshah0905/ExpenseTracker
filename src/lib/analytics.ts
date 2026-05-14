import type { FinanceDb, Transaction } from "../types/finance";
import { isSameMonth } from "./date";

const isIncome = (transaction: Transaction) => transaction.type === "income";
const isExpense = (transaction: Transaction) => transaction.type === "expense";

export function monthlyTransactions(transactions: Transaction[], month: string) {
  return transactions.filter((transaction) => isSameMonth(transaction.date, month));
}

export function getMonthlyIncome(transactions: Transaction[], month: string) {
  return monthlyTransactions(transactions, month).filter(isIncome).reduce((sum, item) => sum + item.amount, 0);
}

export function getMonthlyExpense(transactions: Transaction[], month: string) {
  return monthlyTransactions(transactions, month).filter(isExpense).reduce((sum, item) => sum + item.amount, 0);
}

export function getOverallIncome(transactions: Transaction[]) {
  return transactions.filter(isIncome).reduce((sum, item) => sum + item.amount, 0);
}

export function getOverallExpense(transactions: Transaction[]) {
  return transactions.filter(isExpense).reduce((sum, item) => sum + item.amount, 0);
}

export function getProfitLoss(income: number, expense: number) {
  return income - expense;
}

export function getMonthlySummary(transactions: Transaction[], month: string) {
  const scoped = monthlyTransactions(transactions, month);
  const incomeTotal = getMonthlyIncome(transactions, month);
  const expenseTotal = getMonthlyExpense(transactions, month);
  const upcomingEmi = scoped
    .filter((item) => item.type === "expense" && item.emi)
    .reduce((sum, item) => sum + (item.emi?.monthlyEmi ?? 0), 0);

  return {
    incomeTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal,
    upcomingEmi,
    count: scoped.length
  };
}

export function getCategoryTotals(transactions: Transaction[], month: string, type: "income" | "expense" = "expense") {
  return monthlyTransactions(transactions, month)
    .filter((item) => item.type === type)
    .reduce<Record<string, number>>((totals, item) => {
      totals[item.category] = (totals[item.category] ?? 0) + item.amount;
      return totals;
    }, {});
}

export function createSnapshotSummary(db: FinanceDb, date: string) {
  const dayTransactions = db.transactions.filter((item) => item.date === date);
  const incomeTotal = dayTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = dayTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

  return {
    createdAt: new Date().toISOString(),
    transactionCount: dayTransactions.length,
    incomeTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal
  };
}

export function getEmiSafety(db: FinanceDb, month: string) {
  const summary = getMonthlySummary(db.transactions, month);
  const activeEmis = db.transactions.filter((item) => item.emi);
  const monthlyEmi = activeEmis.reduce((sum, item) => sum + (item.emi?.monthlyEmi ?? 0), 0);
  const remainingPayable = activeEmis.reduce((sum, item) => sum + (item.emi?.totalPayable ?? 0), 0);
  const percent = summary.incomeTotal > 0 ? (monthlyEmi / summary.incomeTotal) * 100 : 0;
  const rating = percent > 35 ? "Dangerous" : percent > 20 ? "Risky" : percent > 10 ? "Manageable" : "Safe";
  return { monthlyEmi, remainingPayable, activeCount: activeEmis.length, percent, rating };
}

export function getBudgetHealth(db: FinanceDb, month: string) {
  const summary = getMonthlySummary(db.transactions, month);
  const emi = getEmiSafety(db, month);
  const savings = summary.netTotal;
  const expenseLimit = db.userSettings.monthlyExpenseLimit ?? 0;
  const expensePressure = expenseLimit > 0 ? (summary.expenseTotal / expenseLimit) * 100 : 0;
  let score = 100;
  if (summary.incomeTotal <= 0 && summary.expenseTotal > 0) score -= 35;
  if (summary.netTotal < 0) score -= 35;
  if (expensePressure > 100) score -= 25;
  else if (expensePressure > 85) score -= 15;
  if (emi.percent > 35) score -= 30;
  else if (emi.percent > 20) score -= 18;
  else if (emi.percent > 10) score -= 8;
  if (savings > (db.userSettings.savingsTarget ?? 0)) score += 5;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Tight" : score >= 30 ? "Risky" : "Dangerous";
  return { score, label, savings, expenseLimit, expensePressure, remainingBalance: summary.netTotal };
}

export function getDashboardInsights(db: FinanceDb, month: string) {
  const summary = getMonthlySummary(db.transactions, month);
  const categories = getCategoryTotals(db.transactions, month);
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  const emi = getEmiSafety(db, month);
  const health = getBudgetHealth(db, month);
  const insights: string[] = [];
  if (topCategory) insights.push(`You spent most on ${topCategory[0]} this month.`);
  if (emi.percent > 20) insights.push("Your EMI load is getting high.");
  if (health.expenseLimit && health.expenseLimit > summary.expenseTotal) {
    insights.push(`You are ₹${Math.round(health.expenseLimit - summary.expenseTotal).toLocaleString("en-IN")} away from your monthly expense limit.`);
  }
  if (summary.netTotal > 0) insights.push("Your month is still net positive.");
  if (!insights.length) insights.push("Add income and expenses to unlock better insights.");
  return insights;
}
