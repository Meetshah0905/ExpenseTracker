import { getCategoryTotals, getMonthlySummary } from "../lib/analytics";
import { formatInr } from "../lib/currency";
import { useFinanceStore } from "../store/useFinanceStore";

export function Charts() {
  const transactions = useFinanceStore((state) => state.db.transactions);
  const month = useFinanceStore((state) => state.selectedMonth);
  const summary = getMonthlySummary(transactions, month);
  const categories = Object.entries(getCategoryTotals(transactions, month)).map(([name, value]) => ({ name, value }));
  const maxCategory = Math.max(...categories.map((item) => item.value), 1);
  const maxFlow = Math.max(summary.incomeTotal, summary.expenseTotal, 1);

  return (
    <section className="chart-stack">
      <div className="panel chart-panel">
        <h2>Income vs expenses</h2>
        <div className="flow-bars">
          <div>
            <span>Income</span>
            <strong>{formatInr(summary.incomeTotal)}</strong>
            <i style={{ transform: `scaleX(${summary.incomeTotal / maxFlow})` }} />
          </div>
          <div>
            <span>Expenses</span>
            <strong>{formatInr(summary.expenseTotal)}</strong>
            <i className="expense-bar" style={{ transform: `scaleX(${summary.expenseTotal / maxFlow})` }} />
          </div>
        </div>
      </div>
      <div className="panel chart-panel">
        <h2>Expenses by category</h2>
        {categories.length ? (
          <div className="category-bars">
            {categories.map((item) => (
              <div key={item.name}>
                <p><span>{item.name}</span><b>{formatInr(item.value)}</b></p>
                <i style={{ transform: `scaleX(${item.value / maxCategory})` }} />
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">No expenses yet.</p>
        )}
      </div>
    </section>
  );
}
