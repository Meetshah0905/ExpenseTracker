import { BadgeIndianRupee, CheckCircle2, IndianRupee, Pencil, Sparkles, TimerReset, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { formatInr } from "../lib/currency";
import { comparePaymentOptions, evaluateSmartBuy, type SmartBuyDraft } from "../lib/smartBuy";
import { useFinanceStore } from "../store/useFinanceStore";
import type { PurchaseDecision } from "../types/finance";

const defaultDraft: SmartBuyDraft = {
  productName: "Rayban Meta Glasses",
  category: "Gadgets",
  price: 42000,
  monthlyIncome: 100000,
  paymentType: "emi",
  tenureMonths: 12,
  annualInterestRatePercent: 0,
  expectedResaleValue: 18000,
  expectedMonthlyIncome: 5000,
  expectedMonthlyTimeSavedHours: 4,
  usageFrequency: "weekly",
  purpose: "content_creation",
  alreadyOwnSimilar: false,
  canDelay30Days: true,
  emotionalPurchase: "maybe",
  mainReason: "Content creation, POV videos, brand shoots, reels, productivity"
};

const recommendationLabels: Record<PurchaseDecision["recommendation"], string> = {
  strong_buy: "Strong Buy",
  buy_carefully: "Buy Carefully",
  wait_30_days: "Wait 30 Days",
  avoid: "Avoid",
  business_investment: "Business Investment"
};

export default function SmartBuyPage() {
  const addPurchaseDecision = useFinanceStore((state) => state.addPurchaseDecision);
  const updatePurchaseDecision = useFinanceStore((state) => state.updatePurchaseDecision);
  const deletePurchaseDecision = useFinanceStore((state) => state.deletePurchaseDecision);
  const convertDecisionToExpense = useFinanceStore((state) => state.convertDecisionToExpense);
  const decisions = useFinanceStore((state) => state.db.purchaseDecisions);
  const [draft, setDraft] = useState<SmartBuyDraft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const result = useMemo(() => evaluateSmartBuy(draft), [draft]);
  const comparisons = useMemo(() => comparePaymentOptions(draft.price, draft.monthlyIncome), [draft.monthlyIncome, draft.price]);
  const set = <K extends keyof SmartBuyDraft>(key: K, value: SmartBuyDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function saveDecision() {
    const now = new Date().toISOString();
    if (editingId) {
      await updatePurchaseDecision({ ...result, id: editingId, createdAt: decisions.find((item) => item.id === editingId)?.createdAt ?? now, updatedAt: now });
      setSavedMessage("Decision updated.");
      setEditingId(null);
    } else {
      await addPurchaseDecision({ ...result, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
      setSavedMessage("Decision saved to Drive database.");
    }
  }

  function editDecision(decision: PurchaseDecision) {
    setEditingId(decision.id);
    setDraft({
      productName: decision.productName,
      category: decision.category,
      price: decision.price,
      monthlyIncome: defaultDraft.monthlyIncome,
      paymentType: decision.paymentType,
      tenureMonths: decision.emi?.tenureMonths ?? 12,
      annualInterestRatePercent: decision.emi?.annualInterestRatePercent ?? 0,
      expectedResaleValue: decision.expectedResaleValue,
      expectedMonthlyIncome: decision.expectedMonthlyIncome,
      expectedMonthlyTimeSavedHours: decision.expectedMonthlyTimeSavedHours ?? 0,
      usageFrequency: decision.usageFrequency,
      purpose: decision.purpose,
      alreadyOwnSimilar: decision.alreadyOwnSimilar,
      canDelay30Days: decision.canDelay30Days,
      emotionalPurchase: decision.emotionalPurchase,
      mainReason: decision.recommendationReason
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="page-stack smart-buy-page">
      <section className="smart-hero">
        <div>
          <span>Worth It Calculator</span>
          <h2>Think before the swipe.</h2>
          <p>Check budget pressure, earning potential, usefulness, and impulse risk before buying.</p>
        </div>
        <Sparkles size={28} />
      </section>

      <section className="panel form">
        <h2>Product decision</h2>
        <label><span>Product name</span><input value={draft.productName} onChange={(event) => set("productName", event.target.value)} /></label>
        <div className="two-col">
          <label><span>Category</span><input value={draft.category} onChange={(event) => set("category", event.target.value)} /></label>
          <label><span>Price</span><input type="number" value={draft.price || ""} onChange={(event) => set("price", Number(event.target.value))} /></label>
        </div>
        <div className="two-col">
          <label><span>Monthly income</span><input type="number" value={draft.monthlyIncome || ""} onChange={(event) => set("monthlyIncome", Number(event.target.value))} /></label>
          <label><span>Payment type</span><select value={draft.paymentType} onChange={(event) => set("paymentType", event.target.value as SmartBuyDraft["paymentType"])}><option value="full">Full payment</option><option value="emi">EMI</option><option value="credit_card">Credit card</option><option value="loan">Loan</option></select></label>
        </div>
        {draft.paymentType !== "full" && (
          <div className="two-col">
            <label><span>Tenure months</span><input type="number" min="1" value={draft.tenureMonths} onChange={(event) => set("tenureMonths", Number(event.target.value))} /></label>
            <label><span>Interest % yearly</span><input type="number" min="0" step="0.01" value={draft.annualInterestRatePercent} onChange={(event) => set("annualInterestRatePercent", Number(event.target.value))} /></label>
          </div>
        )}
        <div className="two-col">
          <label><span>Expected resale after 1 year</span><input type="number" value={draft.expectedResaleValue || ""} onChange={(event) => set("expectedResaleValue", Number(event.target.value))} /></label>
          <label><span>Expected monthly income</span><input type="number" value={draft.expectedMonthlyIncome || ""} onChange={(event) => set("expectedMonthlyIncome", Number(event.target.value))} /></label>
        </div>
        <label><span>Expected monthly time saved</span><input type="number" value={draft.expectedMonthlyTimeSavedHours || ""} onChange={(event) => set("expectedMonthlyTimeSavedHours", Number(event.target.value))} /></label>
        <label><span>Main reason to buy</span><textarea rows={3} value={draft.mainReason} onChange={(event) => set("mainReason", event.target.value)} /></label>
        <div className="two-col">
          <label><span>Purpose</span><select value={draft.purpose} onChange={(event) => set("purpose", event.target.value as SmartBuyDraft["purpose"])}><option value="business">Business</option><option value="content_creation">Content creation</option><option value="productivity">Productivity</option><option value="personal">Personal</option><option value="luxury">Luxury</option></select></label>
          <label><span>Usage</span><select value={draft.usageFrequency} onChange={(event) => set("usageFrequency", event.target.value as SmartBuyDraft["usageFrequency"])}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="rarely">Rarely</option></select></label>
        </div>
        <div className="smart-questions">
          <label className="toggle-line"><input type="checkbox" checked={draft.alreadyOwnSimilar} onChange={(event) => set("alreadyOwnSimilar", event.target.checked)} />Already own something similar</label>
          <label className="toggle-line"><input type="checkbox" checked={draft.canDelay30Days} onChange={(event) => set("canDelay30Days", event.target.checked)} />Can delay by 30 days</label>
          <label><span>Emotional impulse?</span><select value={draft.emotionalPurchase} onChange={(event) => set("emotionalPurchase", event.target.value as SmartBuyDraft["emotionalPurchase"])}><option value="no">No</option><option value="maybe">Maybe</option><option value="yes">Yes</option></select></label>
        </div>
      </section>

      <section className={`panel recommendation-card rec-${result.recommendation}`}>
        <div className="section-head"><h2>{recommendationLabels[result.recommendation]}</h2><BadgeIndianRupee size={22} /></div>
        <p>{result.recommendationReason}</p>
        {result.recommendation === "wait_30_days" && <p className="wait-test"><TimerReset size={16} />Wait 30 days. If you still want it and the numbers still make sense, buy it.</p>}
        <div className="score-grid"><Score label="Affordability" value={result.affordabilityScore} /><Score label="Usefulness" value={result.usefulnessScore} /><Score label="Luxury" value={result.luxuryScore} invert /></div>
        <div className="metrics-grid">
          <Metric label="Monthly payment" value={formatInr(result.monthlyPayment)} />
          <Metric label="Total payable" value={formatInr(result.totalPayable)} />
          <Metric label="Interest" value={formatInr(result.totalInterest)} />
          <Metric label="Break-even" value={result.breakEvenMonths ? `${Math.ceil(result.breakEvenMonths)} months` : "Not clear"} />
          <Metric label="Budget impact" value={`${result.monthlyBurdenPercent.toFixed(1)}%`} />
          <Metric label="Creator ROI" value={result.creatorROI ? `${result.creatorROI.toFixed(1)}x` : "N/A"} />
        </div>
        <button className="primary-button" onClick={saveDecision}><CheckCircle2 size={18} />{editingId ? "Update decision" : "Save decision"}</button>
        {savedMessage && <p className="muted">{savedMessage}</p>}
      </section>

      <section className="panel">
        <h2>What if?</h2>
        <div className="compare-list">
          {comparisons.map((item) => <article key={item.label}><div><strong>{item.label}</strong><span>{item.recommendation} · {item.burden.toFixed(1)}% budget impact</span></div><b>{formatInr(item.monthlyPayment)}</b><small>Total {formatInr(item.totalPayable)} · Interest {formatInr(item.totalInterest)}</small></article>)}
        </div>
      </section>

      <section className="panel smart-prompts">
        <h2>Questions to answer honestly</h2>
        <p>Will this help earn more, save time every week, improve work quality, grow content or business, replace something broken, or pay for itself?</p>
        <p>Can you rent, borrow, or buy a cheaper alternative first? Will you still value it after 6 months? Will the EMI create stress every month?</p>
      </section>

      <section className="panel">
        <h2>Saved decisions</h2>
        <div className="list">
          {decisions.length ? decisions.map((decision) => (
            <article className="decision-row" key={decision.id}>
              <div><strong>{decision.productName}</strong><span>{recommendationLabels[decision.recommendation]} · {formatInr(decision.price)}</span></div>
              <div className="decision-actions">
                <button className="action-button" onClick={() => editDecision(decision)}><Pencil size={16} />Edit</button>
                <button className="action-button" onClick={() => convertDecisionToExpense(decision)}><IndianRupee size={16} />Convert</button>
                <button className="action-button danger" onClick={() => window.confirm(`Delete ${decision.productName}?`) && deletePurchaseDecision(decision.id)}><Trash2 size={16} />Delete</button>
              </div>
            </article>
          )) : <p className="empty">No Smart Buy decisions saved yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Score({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  return <div className="score"><span>{label}</span><strong>{value}</strong><i className={invert ? "invert" : ""} style={{ transform: `scaleX(${value / 100})` }} /></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
