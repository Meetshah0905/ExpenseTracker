import { Pencil, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { formatInr } from "../lib/currency";
import { useFinanceStore } from "../store/useFinanceStore";
import type { PaymentMode, TransactionType } from "../types/finance";
import { TransactionForm } from "./TransactionForm";

export function TransactionList({ compact = false }: { compact?: boolean }) {
  const transactions = useFinanceStore((state) => state.db.transactions);
  const month = useFinanceStore((state) => state.selectedMonth);
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TransactionType | "all">("all");
  const [paymentMode, setPaymentMode] = useState<PaymentMode | "all">("all");
  const [emiOnly, setEmiOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return transactions
      .filter((item) => item.date.startsWith(month))
      .filter((item) => (type === "all" ? true : item.type === type))
      .filter((item) => (paymentMode === "all" ? true : item.paymentMode === paymentMode))
      .filter((item) => (emiOnly ? Boolean(item.emi) : true))
      .filter((item) => [item.title, item.category, item.sourceOrMerchant].join(" ").toLowerCase().includes(query.toLowerCase()))
      .slice(0, compact ? 5 : undefined);
  }, [compact, emiOnly, month, paymentMode, query, transactions, type]);
  const editing = transactions.find((item) => item.id === editingId);

  return (
    <section className="panel">
      <div className="section-head">
        <h2>{compact ? "Recent transactions" : "Transactions"}</h2>
      </div>
      {!compact && (
        <div className="filters">
          <label className="search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
          </label>
          <select value={type} onChange={(event) => setType(event.target.value as TransactionType | "all")}>
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as PaymentMode | "all")}>
            <option value="all">All modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="emi">EMI</option>
            <option value="other">Other</option>
          </select>
          <label className="toggle-line">
            <input type="checkbox" checked={emiOnly} onChange={(event) => setEmiOnly(event.target.checked)} />
            EMI only
          </label>
        </div>
      )}
      <div className="list">
        {editing && (
          <div className="edit-sheet">
            <div className="section-head">
              <h2>Edit transaction</h2>
              <button className="icon-button neutral" onClick={() => setEditingId(null)} aria-label="Close edit form"><X size={18} /></button>
            </div>
            <TransactionForm
              transactionId={editing.id}
              initial={{
                type: editing.type,
                title: editing.title,
                amount: editing.amount,
                date: editing.date,
                category: editing.category,
                sourceOrMerchant: editing.sourceOrMerchant ?? "",
                paymentMode: editing.paymentMode,
                notes: editing.notes ?? "",
                hasEmi: Boolean(editing.emi),
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
        {filtered.length ? (
          filtered.map((item) => (
            <article className="transaction-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>
                  {item.category} · {item.date}
                </span>
              </div>
              <div className="row-actions">
                <b className={item.type}>{item.type === "income" ? "+" : "-"}{formatInr(item.amount)}</b>
                {!compact && (
                  <>
                    <button className="action-button" onClick={() => setEditingId(item.id)}><Pencil size={16} />Edit</button>
                    <button className="action-button danger" onClick={() => window.confirm(`Delete ${item.title}?`) && deleteTransaction(item.id)}>
                      <Trash2 size={16} />Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="empty">No matching transactions.</p>
        )}
      </div>
    </section>
  );
}
