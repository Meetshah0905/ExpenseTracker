import { WalletCards } from "lucide-react";
import { getMonthlySummary } from "../lib/analytics";
import { formatInr } from "../lib/currency";
import { useFinanceStore } from "../store/useFinanceStore";

export function SummaryCards() {
  const transactions = useFinanceStore((state) => state.db.transactions);
  const month = useFinanceStore((state) => state.selectedMonth);
  const summary = getMonthlySummary(transactions, month);
  const cards = [
    ["Income", summary.incomeTotal],
    ["Expenses", summary.expenseTotal],
    ["Net", summary.netTotal],
    ["EMI this month", summary.upcomingEmi]
  ] as const;

  return (
    <section className="summary-grid" aria-label="Monthly summary">
      {cards.map(([label, value]) => (
        <article className="summary-card" key={label}>
          <WalletCards size={17} />
          <span>{label}</span>
          <strong>{formatInr(value)}</strong>
        </article>
      ))}
    </section>
  );
}
