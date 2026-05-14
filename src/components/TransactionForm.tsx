import { Save } from "lucide-react";
import { useState } from "react";
import { calculateEmi } from "../lib/emi";
import { todayIso } from "../lib/date";
import { useFinanceStore } from "../store/useFinanceStore";
import type { PaymentMode, Transaction, TransactionType } from "../types/finance";
import { EmiCalculator } from "./EmiCalculator";

type Draft = {
  type: TransactionType;
  title: string;
  amount: number;
  date: string;
  category: string;
  sourceOrMerchant: string;
  paymentMode: PaymentMode;
  notes: string;
  hasEmi: boolean;
  tenureMonths: number;
  annualInterestRatePercent: number;
  lender: string;
  startDate: string;
  createdAt?: string;
};

const baseDraft = (type: TransactionType): Draft => ({
  type,
  title: "",
  amount: 0,
  date: todayIso(),
  category: type === "income" ? "Other Income" : "Other Expense",
  sourceOrMerchant: "",
  paymentMode: type === "income" ? "bank_transfer" : "upi",
  notes: "",
  hasEmi: false,
  tenureMonths: 12,
  annualInterestRatePercent: 0,
  lender: "",
  startDate: todayIso()
});

export function TransactionForm({
  initial,
  transactionId,
  onSaved
}: {
  initial?: Partial<Draft>;
  transactionId?: string;
  onSaved?: () => void;
}) {
  const categories = useFinanceStore((state) => state.db.categories);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const isAuthed = useFinanceStore((state) => state.isAuthed);
  const [draft, setDraft] = useState<Draft>({ ...baseDraft(initial?.type ?? "expense"), ...initial });
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const activeCategories = draft.type === "income" ? categories.income : categories.expense;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    const now = new Date().toISOString();
    const transaction: Transaction = {
      id: transactionId ?? crypto.randomUUID(),
      type: draft.type,
      title: draft.title.trim(),
      amount: Number(draft.amount),
      currency: "INR",
      category: draft.category,
      sourceOrMerchant: draft.sourceOrMerchant || undefined,
      paymentMode: draft.hasEmi ? "emi" : draft.paymentMode,
      date: draft.date,
      notes: draft.notes || undefined,
      emi:
        draft.type === "expense" && draft.hasEmi
          ? calculateEmi({
              principal: Number(draft.amount),
              tenureMonths: Number(draft.tenureMonths),
              annualInterestRatePercent: Number(draft.annualInterestRatePercent),
              startDate: draft.startDate,
              lender: draft.lender
            })
          : undefined,
      createdAt: draft.createdAt ?? now,
      updatedAt: now
    };
    if (transactionId) await updateTransaction(transaction);
    else await addTransaction(transaction);
    setIsSaving(false);
    setDraft(baseDraft(draft.type));
    onSaved?.();
  }

  return (
    <form className="form panel" onSubmit={submit}>
      <div className="segmented transaction-type">
        <button type="button" className={draft.type === "expense" ? "active" : ""} onClick={() => setDraft(baseDraft("expense"))}>Expense</button>
        <button type="button" className={draft.type === "income" ? "active" : ""} onClick={() => setDraft(baseDraft("income"))}>Income</button>
      </div>
      <label>
        <span>{draft.type === "income" ? "Title / source" : "Title"}</span>
        <input required value={draft.title} onChange={(event) => set("title", event.target.value)} placeholder="Rayban Meta Glasses" />
      </label>
      <label>
        <span>Amount</span>
        <input required min="0" step="0.01" type="number" value={draft.amount || ""} onChange={(event) => set("amount", Number(event.target.value))} placeholder="42000" />
      </label>
      <div className="two-col">
        <label>
          <span>Date</span>
          <input required type="date" value={draft.date} onChange={(event) => set("date", event.target.value)} />
        </label>
        <label>
          <span>Category</span>
          <select value={draft.category} onChange={(event) => set("category", event.target.value)}>
            {activeCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
      </div>
      <label>
        <span>{draft.type === "income" ? "Platform / source" : "Merchant / source"}</span>
        <input value={draft.sourceOrMerchant} onChange={(event) => set("sourceOrMerchant", event.target.value)} />
      </label>
      <label>
        <span>Payment mode</span>
        <select value={draft.paymentMode} onChange={(event) => set("paymentMode", event.target.value as PaymentMode)}>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="emi">EMI</option>
          <option value="other">Other</option>
        </select>
      </label>
      {draft.type === "expense" && (
        <label className="toggle-line">
          <input type="checkbox" checked={draft.hasEmi} onChange={(event) => set("hasEmi", event.target.checked)} />
          EMI expense
        </label>
      )}
      {draft.type === "expense" && draft.hasEmi && (
        <div className="nested-form">
          <div className="two-col">
            <label>
              <span>Tenure</span>
              <input type="number" min="1" value={draft.tenureMonths} onChange={(event) => set("tenureMonths", Number(event.target.value))} />
            </label>
            <label>
              <span>Interest %</span>
              <input type="number" min="0" step="0.01" value={draft.annualInterestRatePercent} onChange={(event) => set("annualInterestRatePercent", Number(event.target.value))} />
            </label>
          </div>
          <label>
            <span>Lender</span>
            <input value={draft.lender} onChange={(event) => set("lender", event.target.value)} />
          </label>
          <label>
            <span>Start date</span>
            <input type="date" value={draft.startDate} onChange={(event) => set("startDate", event.target.value)} />
          </label>
          <EmiCalculator principal={draft.amount} tenureMonths={draft.tenureMonths} annualInterestRatePercent={draft.annualInterestRatePercent} startDate={draft.startDate} lender={draft.lender} />
        </div>
      )}
      <label>
        <span>Notes</span>
        <textarea rows={3} value={draft.notes} onChange={(event) => set("notes", event.target.value)} />
      </label>
      <button className="primary-button" disabled={isSaving || !draft.title || draft.amount <= 0}>
        <Save size={18} />
        {isSaving ? "Saving..." : transactionId ? "Update transaction" : "Save transaction"}
      </button>
    </form>
  );
}
