import { Plus } from "lucide-react";
import { Charts } from "../components/Charts";
import { FinanceSummaryHero } from "../components/FinanceSummaryHero";
import { InsightCards } from "../components/InsightCards";
import { SummaryCards } from "../components/SummaryCards";
import { TransactionList } from "../components/TransactionList";
import { formatMonth } from "../lib/date";
import { useFinanceStore } from "../store/useFinanceStore";

export default function DashboardPage({ onAdd }: { onAdd: () => void }) {
  const selectedMonth = useFinanceStore((state) => state.selectedMonth);
  const setSelectedMonth = useFinanceStore((state) => state.setSelectedMonth);

  return (
    <div className="page-stack">
      <FinanceSummaryHero />
      <div className="month-bar">
        <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Select month" />
        <span>{formatMonth(selectedMonth)}</span>
      </div>
      <SummaryCards />
      <InsightCards />
      <Charts />
      <TransactionList compact />
      <button className="primary-button dashboard-add" onClick={onAdd}><Plus size={18} />Add transaction</button>
    </div>
  );
}
