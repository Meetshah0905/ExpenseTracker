import { create } from "zustand";
import { supabase } from "../lib/supabase";
import {
  createDefaultDb,
  type FinanceDb,
  type PurchaseDecision,
  type SyncStatus,
  type Transaction
} from "../types/finance";
import { todayIso } from "../lib/date";
import { calculateEmi } from "../lib/emi";

type FinanceState = {
  db: FinanceDb;
  selectedMonth: string;
  syncStatus: SyncStatus;
  error?: string;
  isAuthed: boolean;
  user: any | null;
  connectAndLoad: () => Promise<void>;
  signOut: () => Promise<void>;
  loadData: () => Promise<void>;
  loadFromDrive: () => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addPurchaseDecision: (decision: PurchaseDecision) => Promise<void>;
  updatePurchaseDecision: (decision: PurchaseDecision) => Promise<void>;
  deletePurchaseDecision: (id: string) => Promise<void>;
  updateEmiTransaction: (transaction: Transaction) => Promise<void>;
  deleteEmiTransaction: (id: string, linkedBehavior?: "keep" | "unlink" | "delete") => Promise<void>;
  closeEmiTransaction: (id: string) => Promise<void>;
  convertDecisionToExpense: (decision: PurchaseDecision) => Promise<void>;
  retrySync: () => Promise<void>;
  createBackupNow: () => Promise<void>;
  exportJson: () => string;
  importJson: (raw: unknown) => Promise<void>;
  syncDebug: any;
  setSelectedMonth: (month: string) => void;
  initialize: () => void;
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  db: createDefaultDb(),
  selectedMonth: todayIso().slice(0, 7),
  syncStatus: "not_connected",
  isAuthed: true,
  user: { id: "local-user" },

  initialize: () => {
    // Local usage, no real auth for now
    get().loadData();
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),

  connectAndLoad: async () => {
    set({ syncStatus: "connecting", error: undefined });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      set({ syncStatus: "failed", error: error.message });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  loadFromDrive: async () => {
    await get().loadData();
  },

  loadData: async () => {
    const user = get().user;
    if (!user) return;

    set({ syncStatus: "loading" });
    try {
      // Load Transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (txError) throw txError;

      // Load Smart Buy Decisions
      const { data: decisions, error: decError } = await supabase
        .from('smart_buy_decisions')
        .select('*')
        .order('created_at', { ascending: false });

      if (decError) throw decError;

      // Map Supabase data to FinanceDb structure
      // Note: This is a simplified mapping. We might need more detailed mapping later.
      const mappedTransactions: Transaction[] = (transactions || []).map(t => ({
        id: t.id,
        type: t.type,
        title: t.title,
        amount: Number(t.total_amount),
        currency: t.currency as "INR",
        category: t.category,
        sourceOrMerchant: t.merchant,
        paymentMode: t.payment_mode as any,
        date: t.date,
        notes: t.notes,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        emi: t.is_emi ? calculateEmi({
          principal: Number(t.amount),
          tenureMonths: t.emi_months,
          annualInterestRatePercent: Number(t.emi_interest_rate),
          startDate: t.date,
          lender: t.merchant || undefined
        }) : undefined
      }));

      const mappedDecisions: PurchaseDecision[] = (decisions || []).map(d => ({
        id: d.id,
        productName: d.product_name,
        category: d.category,
        price: Number(d.price),
        currency: "INR",
        paymentType: "full", // Placeholder
        expectedMonthlyIncome: 0,
        expectedResaleValue: 0,
        usageFrequency: "weekly",
        purpose: "personal",
        alreadyOwnSimilar: false,
        canDelay30Days: false,
        emotionalPurchase: "no",
        affordabilityScore: d.affordability_score,
        usefulnessScore: d.usefulness_score,
        luxuryScore: d.luxury_score,
        recommendation: d.recommendation as any,
        recommendationReason: d.recommendation_reason,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));

      set({
        db: {
          ...get().db,
          transactions: mappedTransactions,
          purchaseDecisions: mappedDecisions,
          updatedAt: new Date().toISOString()
        },
        syncStatus: "synced"
      });
    } catch (error) {
      set({ syncStatus: "failed", error: error instanceof Error ? error.message : "Failed to load data" });
    }
  },

  addTransaction: async (transaction) => {
    set({ syncStatus: "syncing" });
    try {
      const { error } = await supabase.from('transactions').insert({
        id: transaction.id,
        type: transaction.type,
        title: transaction.title,
        merchant: transaction.merchant || transaction.sourceOrMerchant,
        amount: transaction.emi ? transaction.emi.principal : transaction.amount,
        total_amount: transaction.total_amount || transaction.amount,
        tax_amount: transaction.tax_amount || 0,
        discount_amount: transaction.discount_amount || 0,
        tip_amount: transaction.tip_amount || 0,
        date: transaction.date,
        category: transaction.category,
        payment_mode: transaction.paymentMode,
        is_emi: Boolean(transaction.emi),
        emi_months: transaction.emi?.tenureMonths,
        emi_interest_rate: transaction.emi?.annualInterestRatePercent,
        notes: transaction.notes,
        source: transaction.source || 'manual',
        raw_extracted_text: transaction.raw_extracted_text,
        gemini_confidence: transaction.gemini_confidence,
        items: transaction.items || [],
        created_at: transaction.createdAt,
        updated_at: transaction.updatedAt
      });

      if (error) throw error;
      
      set(state => ({
        db: {
          ...state.db,
          transactions: [transaction, ...state.db.transactions]
        },
        syncStatus: "synced"
      }));
    } catch (error) {
      set({ syncStatus: "failed", error: error instanceof Error ? error.message : "Failed to save transaction" });
    }
  },

  updateTransaction: async (transaction) => {
    set({ syncStatus: "syncing" });
    try {
      const { error } = await supabase.from('transactions').update({
        type: transaction.type,
        title: transaction.title,
        merchant: transaction.sourceOrMerchant,
        amount: transaction.emi ? transaction.emi.principal : transaction.amount,
        total_amount: transaction.amount,
        date: transaction.date,
        category: transaction.category,
        payment_mode: transaction.paymentMode,
        is_emi: Boolean(transaction.emi),
        emi_months: transaction.emi?.tenureMonths,
        emi_interest_rate: transaction.emi?.annualInterestRatePercent,
        notes: transaction.notes,
        updated_at: new Date().toISOString()
      }).eq('id', transaction.id);

      if (error) throw error;

      set(state => ({
        db: {
          ...state.db,
          transactions: state.db.transactions.map(t => t.id === transaction.id ? transaction : t)
        },
        syncStatus: "synced"
      }));
    } catch (error) {
      set({ syncStatus: "failed", error: error instanceof Error ? error.message : "Failed to update transaction" });
    }
  },

  deleteTransaction: async (id) => {
    set({ syncStatus: "syncing" });
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;

      set(state => ({
        db: {
          ...state.db,
          transactions: state.db.transactions.filter(t => t.id !== id)
        },
        syncStatus: "synced"
      }));
    } catch (error) {
      set({ syncStatus: "failed", error: error instanceof Error ? error.message : "Failed to delete transaction" });
    }
  },

  addPurchaseDecision: async (decision) => {
    set({ syncStatus: "syncing" });
    try {
      const { error } = await supabase.from('smart_buy_decisions').insert({
        id: decision.id,
        product_name: decision.productName,
        category: decision.category,
        price: decision.price,
        recommendation: decision.recommendation,
        recommendation_reason: decision.recommendationReason,
        affordability_score: decision.affordabilityScore,
        usefulness_score: decision.usefulnessScore,
        luxury_score: decision.luxuryScore,
        created_at: decision.createdAt,
        updated_at: decision.updatedAt
      });

      if (error) throw error;

      set(state => ({
        db: {
          ...state.db,
          purchaseDecisions: [decision, ...state.db.purchaseDecisions]
        },
        syncStatus: "synced"
      }));
    } catch (error) {
      set({ syncStatus: "failed", error: error instanceof Error ? error.message : "Failed to save decision" });
    }
  },

  updatePurchaseDecision: async (decision) => {
    set({ syncStatus: "syncing" });
    try {
      const { error } = await supabase.from('smart_buy_decisions').update({
        product_name: decision.productName,
        category: decision.category,
        price: decision.price,
        recommendation: decision.recommendation,
        recommendation_reason: decision.recommendationReason,
        affordability_score: decision.affordabilityScore,
        usefulness_score: decision.usefulnessScore,
        luxury_score: decision.luxuryScore,
        updated_at: new Date().toISOString()
      }).eq('id', decision.id);

      if (error) throw error;

      set(state => ({
        db: {
          ...state.db,
          purchaseDecisions: state.db.purchaseDecisions.map(d => d.id === decision.id ? decision : d)
        },
        syncStatus: "synced"
      }));
    } catch (error) {
      set({ syncStatus: "failed", error: error instanceof Error ? error.message : "Failed to update decision" });
    }
  },

  deletePurchaseDecision: async (id) => {
    set({ syncStatus: "syncing" });
    try {
      const { error } = await supabase.from('smart_buy_decisions').delete().eq('id', id);
      if (error) throw error;

      set(state => ({
        db: {
          ...state.db,
          purchaseDecisions: state.db.purchaseDecisions.filter(d => d.id !== id)
        },
        syncStatus: "synced"
      }));
    } catch (error) {
      set({ syncStatus: "failed", error: error instanceof Error ? error.message : "Failed to delete decision" });
    }
  },

  updateEmiTransaction: async (transaction) => {
    await get().updateTransaction(transaction);
  },

  deleteEmiTransaction: async (id, linkedBehavior = "keep") => {
    if (linkedBehavior === "delete") {
      await get().deleteTransaction(id);
    } else {
      const transaction = get().db.transactions.find(t => t.id === id);
      if (transaction) {
        await get().updateTransaction({
          ...transaction,
          emi: undefined,
          paymentMode: linkedBehavior === "unlink" ? "other" : transaction.paymentMode
        });
      }
    }
  },

  closeEmiTransaction: async (id) => {
    const transaction = get().db.transactions.find(t => t.id === id);
    if (transaction) {
      await get().updateTransaction({
        ...transaction,
        notes: `${transaction.notes ? `${transaction.notes}\n` : ""}EMI closed on ${todayIso()}`
      });
    }
  },

  convertDecisionToExpense: async (decision) => {
    const now = new Date().toISOString();
    await get().addTransaction({
      id: crypto.randomUUID(),
      type: "expense",
      title: decision.productName,
      amount: decision.price,
      currency: "INR",
      category: decision.category || "Other Expense",
      paymentMode: "card", // Placeholder
      date: now.slice(0, 10),
      notes: `Converted from Smart Buy: ${decision.recommendationReason}`,
      createdAt: now,
      updatedAt: now
    });
  },

  retrySync: async () => {
    await get().loadData();
  },

  createBackupNow: async () => {
    console.log("Backup to Drive not yet implemented with Supabase.");
  },

  exportJson: () => JSON.stringify(get().db, null, 2),

  importJson: async (raw) => {
    console.log("Import not yet implemented with Supabase.");
  },

  syncDebug: {
    googleConnected: false,
    tokenAvailable: false,
    clientIdConfigured: false,
    dbFileFound: false,
    transactionCount: 0
  }
}));
