import { supabase } from "./supabase";
import type { Transaction } from "../types/finance";
import { calculateEmi } from "./emi";

/** Fetch all transactions for the current user */
export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;

  return (data || []).map(mapRowToTransaction);
}

/** Insert a transaction (user_id is set automatically via RLS) */
export async function insertTransaction(userId: string, tx: Transaction) {
  const { error } = await supabase.from("transactions").insert({
    id: tx.id,
    user_id: userId,
    type: tx.type,
    title: tx.title,
    merchant: tx.merchant || tx.sourceOrMerchant || null,
    amount: tx.emi ? tx.emi.principal : tx.amount,
    total_amount: tx.total_amount || tx.amount,
    tax_amount: tx.tax_amount || 0,
    discount_amount: tx.discount_amount || 0,
    tip_amount: tx.tip_amount || 0,
    currency: tx.currency || "INR",
    date: tx.date,
    category: tx.category || "General",
    payment_mode: tx.paymentMode || "other",
    is_emi: Boolean(tx.emi),
    emi_months: tx.emi?.tenureMonths || null,
    emi_interest_rate: tx.emi?.annualInterestRatePercent || null,
    notes: tx.notes || null,
    source: tx.source || "manual",
    raw_extracted: tx.raw_extracted_text
      ? safeParseJson(tx.raw_extracted_text)
      : null,
    gemini_confidence: tx.gemini_confidence || null
  });

  if (error) throw error;
}

/** Update a transaction */
export async function updateTransactionInDb(tx: Transaction) {
  const { error } = await supabase
    .from("transactions")
    .update({
      type: tx.type,
      title: tx.title,
      merchant: tx.merchant || tx.sourceOrMerchant || null,
      amount: tx.emi ? tx.emi.principal : tx.amount,
      total_amount: tx.total_amount || tx.amount,
      date: tx.date,
      category: tx.category,
      payment_mode: tx.paymentMode,
      is_emi: Boolean(tx.emi),
      emi_months: tx.emi?.tenureMonths || null,
      emi_interest_rate: tx.emi?.annualInterestRatePercent || null,
      notes: tx.notes || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", tx.id);

  if (error) throw error;
}

/** Delete a transaction */
export async function deleteTransactionInDb(id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// --- Helpers ---

function safeParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function mapRowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    amount: Number(row.total_amount || row.amount),
    total_amount: Number(row.total_amount),
    tax_amount: Number(row.tax_amount || 0),
    discount_amount: Number(row.discount_amount || 0),
    tip_amount: Number(row.tip_amount || 0),
    currency: (row.currency || "INR") as "INR",
    category: row.category || "General",
    sourceOrMerchant: row.merchant,
    merchant: row.merchant,
    paymentMode: (row.payment_mode || "other") as any,
    date: row.date,
    notes: row.notes,
    source: row.source || "manual",
    raw_extracted_text:
      typeof row.raw_extracted === "string"
        ? row.raw_extracted
        : row.raw_extracted
          ? JSON.stringify(row.raw_extracted)
          : undefined,
    gemini_confidence: row.gemini_confidence
      ? Number(row.gemini_confidence)
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    emi: row.is_emi
      ? calculateEmi({
          principal: Number(row.amount),
          tenureMonths: row.emi_months || 12,
          annualInterestRatePercent: Number(row.emi_interest_rate || 0),
          startDate: row.date,
          lender: row.merchant || undefined
        })
      : undefined
  };
}
