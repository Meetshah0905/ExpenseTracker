import { create } from "zustand";
import { isSupabaseConfigured } from "../lib/supabase";
import {
  getSession,
  onAuthStateChange,
  signInWithEmail as authSignIn,
  signOut as authSignOut
} from "../lib/auth";
import {
  fetchTransactions,
  insertTransaction,
  updateTransactionInDb,
  deleteTransactionInDb
} from "../lib/transactions";
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
  userId: string | null;
  userEmail: string | null;
  authLoading: boolean;

  // Auth
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Data
  loadData: () => Promise<void>;
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
  exportJson: () => string;
  importJson: (raw: unknown) => Promise<void>;
  setSelectedMonth: (month: string) => void;
  syncDebug: any;
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  db: createDefaultDb(),
  selectedMonth: todayIso().slice(0, 7),
  syncStatus: "not_connected",
  isAuthed: false,
  userId: null,
  userEmail: null,
  authLoading: true,

  initialize: () => {
    // Check initial session
    getSession().then(session => {
      if (session?.user) {
        set({
          isAuthed: true,
          userId: session.user.id,
          userEmail: session.user.email || null,
          authLoading: false
        });
        get().loadData();
      } else {
        set({ isAuthed: false, userId: null, userEmail: null, authLoading: false });
      }
    });

    // Listen for auth changes (sign in / sign out)
    onAuthStateChange(session => {
      if (session?.user) {
        set({
          isAuthed: true,
          userId: session.user.id,
          userEmail: session.user.email || null,
          authLoading: false
        });
        get().loadData();
      } else {
        set({
          isAuthed: false,
          userId: null,
          userEmail: null,
          authLoading: false,
          db: createDefaultDb(),
          syncStatus: "not_connected"
        });
      }
    });
  },

  signIn: async (email, password) => {
    set({ authLoading: true, error: undefined });
    try {
      await authSignIn(email, password);
      // onAuthStateChange will handle the rest
    } catch (err: any) {
      set({ authLoading: false, error: err.message || "Sign in failed" });
      throw err;
    }
  },

  signOut: async () => {
    try {
      await authSignOut();
      set({
        isAuthed: false,
        userId: null,
        userEmail: null,
        db: createDefaultDb(),
        syncStatus: "not_connected"
      });
    } catch (err: any) {
      console.error("Sign out error:", err);
    }
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),

  loadData: async () => {
    if (!isSupabaseConfigured || !get().isAuthed) {
      set({ syncStatus: "synced" });
      return;
    }

    set({ syncStatus: "loading" });
    try {
      const transactions = await fetchTransactions();
      set({
        db: {
          ...get().db,
          transactions,
          updatedAt: new Date().toISOString()
        },
        syncStatus: "synced"
      });
    } catch (error) {
      console.error("Load error:", error);
      set({
        syncStatus: "failed",
        error: error instanceof Error ? error.message : "Failed to load data"
      });
    }
  },

  addTransaction: async (transaction) => {
    const { isAuthed, userId } = get();

    if (!isAuthed || !userId) {
      // Not signed in — just add locally but don't persist
      set(state => ({
        db: {
          ...state.db,
          transactions: [transaction, ...state.db.transactions],
          updatedAt: new Date().toISOString()
        }
      }));
      return;
    }

    // Optimistic update
    set(state => ({
      db: {
        ...state.db,
        transactions: [transaction, ...state.db.transactions],
        updatedAt: new Date().toISOString()
      },
      syncStatus: "syncing"
    }));

    try {
      await insertTransaction(userId, transaction);
      set({ syncStatus: "synced" });
    } catch (error) {
      console.error("Insert error:", error);
      set({
        syncStatus: "failed",
        error: error instanceof Error ? error.message : "Failed to save transaction"
      });
    }
  },

  updateTransaction: async (transaction) => {
    // Optimistic update
    set(state => ({
      db: {
        ...state.db,
        transactions: state.db.transactions.map(t =>
          t.id === transaction.id ? transaction : t
        ),
        updatedAt: new Date().toISOString()
      },
      syncStatus: "syncing"
    }));

    if (!get().isAuthed) {
      set({ syncStatus: "synced" });
      return;
    }

    try {
      await updateTransactionInDb(transaction);
      set({ syncStatus: "synced" });
    } catch (error) {
      console.error("Update error:", error);
      set({
        syncStatus: "failed",
        error: error instanceof Error ? error.message : "Failed to update transaction"
      });
    }
  },

  deleteTransaction: async (id) => {
    // Optimistic delete
    set(state => ({
      db: {
        ...state.db,
        transactions: state.db.transactions.filter(t => t.id !== id),
        updatedAt: new Date().toISOString()
      },
      syncStatus: "syncing"
    }));

    if (!get().isAuthed) {
      set({ syncStatus: "synced" });
      return;
    }

    try {
      await deleteTransactionInDb(id);
      set({ syncStatus: "synced" });
    } catch (error) {
      console.error("Delete error:", error);
      set({
        syncStatus: "failed",
        error: error instanceof Error ? error.message : "Failed to delete transaction"
      });
    }
  },

  // Purchase decisions — local only (no Supabase table yet)
  addPurchaseDecision: async (decision) => {
    set(state => ({
      db: {
        ...state.db,
        purchaseDecisions: [decision, ...state.db.purchaseDecisions],
        updatedAt: new Date().toISOString()
      }
    }));
  },

  updatePurchaseDecision: async (decision) => {
    set(state => ({
      db: {
        ...state.db,
        purchaseDecisions: state.db.purchaseDecisions.map(d =>
          d.id === decision.id ? decision : d
        ),
        updatedAt: new Date().toISOString()
      }
    }));
  },

  deletePurchaseDecision: async (id) => {
    set(state => ({
      db: {
        ...state.db,
        purchaseDecisions: state.db.purchaseDecisions.filter(d => d.id !== id),
        updatedAt: new Date().toISOString()
      }
    }));
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
      paymentMode: "card",
      date: now.slice(0, 10),
      notes: `Converted from Smart Buy: ${decision.recommendationReason}`,
      createdAt: now,
      updatedAt: now
    });
  },

  retrySync: async () => {
    await get().loadData();
  },

  exportJson: () => JSON.stringify(get().db, null, 2),

  importJson: async (raw) => {
    const data = raw as any;
    if (data && data.transactions) {
      set(state => ({
        db: {
          ...state.db,
          transactions: data.transactions,
          purchaseDecisions: data.purchaseDecisions || state.db.purchaseDecisions,
          updatedAt: new Date().toISOString()
        }
      }));
    }
  },

  syncDebug: {
    supabaseConfigured: isSupabaseConfigured
  }
}));
