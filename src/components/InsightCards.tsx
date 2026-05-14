import { Activity, AlertTriangle, CalendarDays, ShieldCheck } from "lucide-react";
import { getBudgetHealth, getDashboardInsights, getEmiSafety } from "../lib/analytics";
import { formatInr } from "../lib/currency";
import { useFinanceStore } from "../store/useFinanceStore";

export function InsightCards() {
  const db = useFinanceStore((state) => state.db);
  const month = useFinanceStore((state) => state.selectedMonth);
  const health = getBudgetHealth(db, month);
  const emi = getEmiSafety(db, month);
  const insights = getDashboardInsights(db, month);
  const snapshots = Object.entries(db.dailySnapshots).slice(-5).reverse();

  return (
    <section className="insight-stack">
      <article className="panel health-panel">
        <div className="section-head"><h2>Budget health</h2><Activity size={18} /></div>
        <div className="health-score"><strong>{health.score}</strong><span>{health.label}</span></div>
        <p className="muted">Remaining balance {formatInr(health.remainingBalance)} · expense limit impact {health.expensePressure.toFixed(0)}%</p>
      </article>
      <article className="panel health-panel">
        <div className="section-head"><h2>EMI safety</h2><ShieldCheck size={18} /></div>
        <div className="health-score"><strong>{emi.percent.toFixed(0)}%</strong><span>{emi.rating}</span></div>
        <p className="muted">{emi.activeCount} active EMIs · {formatInr(emi.monthlyEmi)} monthly · {formatInr(emi.remainingPayable)} total payable</p>
      </article>
      <article className="panel">
        <div className="section-head"><h2>Insights</h2><AlertTriangle size={18} /></div>
        <div className="insight-list">{insights.map((item) => <p key={item}>{item}</p>)}</div>
      </article>
      <article className="panel">
        <div className="section-head"><h2>Snapshot timeline</h2><CalendarDays size={18} /></div>
        <div className="timeline">
          {snapshots.length ? snapshots.map(([date, item]) => (
            <div key={date}><span>{date}</span><strong>{formatInr(item.netTotal)}</strong><small>In {formatInr(item.incomeTotal)} · Out {formatInr(item.expenseTotal)}</small></div>
          )) : <p className="empty">Snapshots appear after Drive sync or saved changes.</p>}
        </div>
      </article>
    </section>
  );
}
