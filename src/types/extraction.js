import { z } from "zod";
export const extractedItemSchema = z.object({
    name: z.string(),
    quantity: z.number().nullable(),
    unit_price: z.number().nullable(),
    total: z.number().nullable()
});
export const extractionResponseSchema = z.object({
    transaction_type: z.enum(["income", "expense", "unknown"]),
    title: z.string(),
    merchant_or_source: z.string(),
    amount_before_tax: z.number().nullable(),
    tax_amount: z.number().nullable(),
    discount_amount: z.number().nullable(),
    tip_amount: z.number().nullable(),
    total_amount: z.number().nullable(),
    currency: z.enum(["INR", "USD", "UNKNOWN"]),
    date: z.string().nullable(),
    time: z.string().nullable(),
    category: z.string(),
    payment_mode: z.string(),
    items: z.array(extractedItemSchema),
    notes: z.string(),
    confidence: z.number(),
    needs_review: z.boolean(),
    warnings: z.array(z.string())
});
