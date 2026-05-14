import { useMemo, useState } from "react";
import {
  getMonthlyExpense,
  getMonthlyIncome,
  getOverallExpense,
  getOverallIncome,
  getProfitLoss
} from "../lib/analytics";
import { formatInr } from "../lib/currency";
import { useFinanceStore } from "../store/useFinanceStore";

export function FinanceSummaryHero() {
  const [scope, setScope] = useState<"month" | "overall">("month");
  const transactions = useFinanceStore((state) => state.db.transactions);
  const selectedMonth = useFinanceStore((state) => state.selectedMonth);
  const summary = useMemo(() => {
    const income = scope === "month" ? getMonthlyIncome(transactions, selectedMonth) : getOverallIncome(transactions);
    const expense = scope === "month" ? getMonthlyExpense(transactions, selectedMonth) : getOverallExpense(transactions);
    return {
      income,
      expense,
      profitLoss: getProfitLoss(income, expense)
    };
  }, [scope, selectedMonth, transactions]);
  const isLoss = summary.profitLoss < 0;
  const netLabel = isLoss ? "Loss" : "Profit";

  return (
    <section className={`finance-hero ${isLoss ? "loss" : ""}`}>
      <div className="finance-hero-head">
        <div>
          <span>{scope === "month" ? "This Month Summary" : "Overall Summary"}</span>
          <p>{isLoss ? `Net loss ${formatInr(Math.abs(summary.profitLoss))}` : `Net profit ${formatInr(summary.profitLoss)}`}</p>
        </div>
        <div className="summary-toggle" role="group" aria-label="Summary range">
          <button className={scope === "month" ? "active" : ""} onClick={() => setScope("month")}>This Month</button>
          <button className={scope === "overall" ? "active" : ""} onClick={() => setScope("overall")}>Overall</button>
        </div>
      </div>
      <div className="finance-hero-grid">
        <Metric label="Income" value={formatInr(summary.income)} tone="income" />
        <Metric label="Expense" value={formatInr(summary.expense)} tone="expense" />
        <Metric label={netLabel} value={formatInr(Math.abs(summary.profitLoss))} tone={isLoss ? "expense" : "income"} />
      </div>
      <small>{formatInr(summary.income)} in · {formatInr(summary.expense)} out</small>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "income" | "expense" }) {
  return (
    <article>
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </article>
  );
}
