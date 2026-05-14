import { z } from "zod";
export const defaultCategories = {
    income: [
        "Brand Collaboration",
        "Video Editing",
        "YouTube Payment",
        "Facebook Payment",
        "Freelance",
        "Salary",
        "Other Income"
    ],
    expense: [
        "EMI",
        "Gadgets",
        "Shopping",
        "Food",
        "Travel",
        "Rent",
        "Subscriptions",
        "Utilities",
        "Business Expense",
        "Other Expense"
    ]
};
export const createDefaultDb = () => ({
    schemaVersion: 1,
    appName: "DriveBackedFinance",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 1,
    currency: "INR",
    userSettings: {
        currency: "INR",
        monthlyExpenseLimit: 60000,
        monthlyEmiLimitPercent: 20,
        savingsTarget: 25000,
        categoryLimits: {},
        timezone: "Asia/Kolkata"
    },
    transactions: [],
    purchaseDecisions: [],
    accounts: [],
    budgets: [],
    emis: [],
    snapshots: [],
    recurringTransactions: [],
    sync: {
        driveFileId: null,
        lastSyncedAt: null,
        lastRemoteModifiedAt: null
    },
    categories: defaultCategories,
    dailySnapshots: {}
});
export const emiDetailsSchema = z.object({
    principal: z.number().nonnegative(),
    tenureMonths: z.number().int().positive(),
    annualInterestRatePercent: z.number().nonnegative(),
    monthlyInterestRatePercent: z.number().nonnegative(),
    monthlyEmi: z.number().nonnegative(),
    totalPayable: z.number().nonnegative(),
    totalInterest: z.number().min(0),
    startDate: z.string(),
    endDate: z.string(),
    lender: z.string().optional()
});
export const transactionSchema = z.object({
    id: z.string(),
    type: z.enum(["income", "expense"]),
    title: z.string().min(1),
    amount: z.number().nonnegative(),
    currency: z.literal("INR"),
    category: z.string().min(1),
    sourceOrMerchant: z.string().optional(),
    paymentMode: z.enum(["cash", "upi", "card", "bank_transfer", "emi", "other"]),
    date: z.string(),
    notes: z.string().optional(),
    imageAttachment: z
        .object({
        id: z.string(),
        filename: z.string(),
        mimeType: z.string(),
        localPreviewUrl: z.string().optional()
    })
        .optional(),
    emi: emiDetailsSchema.optional(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const purchaseDecisionSchema = z.object({
    id: z.string(),
    productName: z.string().min(1),
    category: z.string().min(1),
    price: z.number().nonnegative(),
    currency: z.literal("INR"),
    paymentType: z.enum(["full", "emi", "credit_card", "loan"]),
    emi: emiDetailsSchema.optional(),
    expectedMonthlyIncome: z.number().nonnegative(),
    expectedResaleValue: z.number().nonnegative(),
    expectedMonthlyTimeSavedHours: z.number().nonnegative().optional(),
    usageFrequency: z.enum(["daily", "weekly", "monthly", "rarely"]),
    purpose: z.enum(["business", "content_creation", "productivity", "personal", "luxury"]),
    alreadyOwnSimilar: z.boolean(),
    canDelay30Days: z.boolean(),
    emotionalPurchase: z.enum(["yes", "maybe", "no"]),
    affordabilityScore: z.number().min(0).max(100),
    usefulnessScore: z.number().min(0).max(100),
    luxuryScore: z.number().min(0).max(100),
    breakEvenMonths: z.number().nonnegative().optional(),
    recommendation: z.enum(["strong_buy", "buy_carefully", "wait_30_days", "avoid", "business_investment"]),
    recommendationReason: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export const financeDbSchema = z.object({
    schemaVersion: z.number().int().positive().optional().default(1),
    appName: z.literal("DriveBackedFinance").optional().default("DriveBackedFinance"),
    version: z.number().int().positive(),
    createdAt: z.string().optional().default(() => new Date().toISOString()),
    updatedAt: z.string().default(() => new Date().toISOString()),
    revision: z.number().int().positive().default(1),
    currency: z.literal("INR").optional().default("INR"),
    userSettings: z.object({
        currency: z.literal("INR"),
        monthlyIncomeTarget: z.number().optional(),
        monthlyExpenseLimit: z.number().optional(),
        monthlyEmiLimitPercent: z.number().optional(),
        savingsTarget: z.number().optional(),
        categoryLimits: z.record(z.string(), z.number()).optional(),
        timezone: z.literal("Asia/Kolkata")
    }),
    transactions: z.array(transactionSchema),
    purchaseDecisions: z.array(purchaseDecisionSchema).default([]),
    accounts: z.array(z.unknown()).optional().default([]),
    budgets: z.array(z.unknown()).optional().default([]),
    emis: z.array(emiDetailsSchema).optional().default([]),
    snapshots: z.array(z.unknown()).optional().default([]),
    recurringTransactions: z.array(z.unknown()).optional().default([]),
    sync: z
        .object({
        driveFileId: z.string().nullable().optional(),
        lastSyncedAt: z.string().nullable().optional(),
        lastRemoteModifiedAt: z.string().nullable().optional()
    })
        .optional()
        .default({ driveFileId: null, lastSyncedAt: null, lastRemoteModifiedAt: null }),
    categories: z.object({
        income: z.array(z.string()),
        expense: z.array(z.string())
    }),
    dailySnapshots: z.record(z.string(), z.object({
        createdAt: z.string(),
        transactionCount: z.number().int().nonnegative(),
        incomeTotal: z.number(),
        expenseTotal: z.number(),
        netTotal: z.number()
    })),
    lastSyncedAt: z.string().optional()
});
