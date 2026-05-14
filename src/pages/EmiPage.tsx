import { useMemo, useState } from "react";
import { Pencil, Trash2, XCircle } from "lucide-react";
import { EmiCalculator } from "../components/EmiCalculator";
import { TransactionForm } from "../components/TransactionForm";
import { todayIso } from "../lib/date";
import { useFinanceStore } from "../store/useFinanceStore";

export default function EmiPage() {
  const [principal, setPrincipal] = useState(42000);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [annualInterestRatePercent, setAnnualInterestRatePercent] = useState(0);
  const [startDate, setStartDate] = useState(todayIso());
  const transactions = useFinanceStore((state) => state.db.transactions);
  const deleteEmiTransaction = useFinanceStore((state) => state.deleteEmiTransaction);
  const closeEmiTransaction = useFinanceStore((state) => state.closeEmiTransaction);
  const emis = useMemo(() => transactions.filter((item) => item.emi), [transactions]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = emis.find((item) => item.id === editingId);

  async function deleteEmi(id: string) {
    const choice = window.prompt("Delete EMI behavior: type keep, unlink, or delete linked transaction", "keep");
    if (choice !== "keep" && choice !== "unlink" && choice !== "delete") return;
    if (window.confirm(`Confirm EMI delete action: ${choice}?`)) await deleteEmiTransaction(id, choice);
  }

  return (
    <div className="page-stack">
      <section className="panel form">
        <h2>EMI calculator</h2>
        <label><span>Principal</span><input type="number" value={principal} onChange={(event) => setPrincipal(Number(event.target.value))} /></label>
        <div className="two-col">
          <label><span>Tenure</span><input type="number" min="1" value={tenureMonths} onChange={(event) => setTenureMonths(Number(event.target.value))} /></label>
          <label><span>Interest %</span><input type="number" min="0" step="0.01" value={annualInterestRatePercent} onChange={(event) => setAnnualInterestRatePercent(Number(event.target.value))} /></label>
        </div>
        <label><span>Start date</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <EmiCalculator principal={principal} tenureMonths={tenureMonths} annualInterestRatePercent={annualInterestRatePercent} startDate={startDate} />
      </section>
      <section className="panel">
        <h2>Commitments</h2>
        {editing && (
          <div className="edit-sheet">
            <div className="section-head">
              <h2>Edit EMI</h2>
              <button className="icon-button neutral" onClick={() => setEditingId(null)} aria-label="Close EMI edit"><XCircle size={18} /></button>
            </div>
            <TransactionForm
              transactionId={editing.id}
              initial={{
                type: "expense",
                title: editing.title,
                amount: editing.amount,
                date: editing.date,
                category: editing.category,
                sourceOrMerchant: editing.sourceOrMerchant ?? "",
                paymentMode: "emi",
                notes: editing.notes ?? "",
                hasEmi: true,
                tenureMonths: editing.emi?.tenureMonths ?? 12,
                annualInterestRatePercent: editing.emi?.annualInterestRatePercent ?? 0,
                lender: editing.emi?.lender ?? "",
                startDate: editing.emi?.startDate ?? editing.date,
                createdAt: editing.createdAt
              }}
              onSaved={() => setEditingId(null)}
            />
          </div>
        )}
        {emis.length ? emis.map((item) => (
          <article className="transaction-row" key={item.id}>
            <div><strong>{item.title}</strong><span>{item.emi?.tenureMonths} months · {item.emi?.lender || "No lender"}</span></div>
            <div className="row-actions">
              <b>₹{Math.round(item.emi?.monthlyEmi ?? 0).toLocaleString("en-IN")}</b>
              <button className="action-button" onClick={() => setEditingId(item.id)}><Pencil size={16} />Edit</button>
              <button className="action-button" onClick={() => closeEmiTransaction(item.id)}><XCircle size={16} />Close</button>
              <button className="action-button danger" onClick={() => deleteEmi(item.id)}><Trash2 size={16} />Delete</button>
            </div>
          </article>
        )) : <p className="empty">No EMI commitments saved.</p>}
      </section>
    </div>
  );
}
