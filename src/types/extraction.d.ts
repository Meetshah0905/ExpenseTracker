import { z } from "zod";
export declare const extractedItemSchema: z.ZodObject<{
    name: z.ZodString;
    quantity: z.ZodNullable<z.ZodNumber>;
    unit_price: z.ZodNullable<z.ZodNumber>;
    total: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export declare const extractionResponseSchema: z.ZodObject<{
    transaction_type: z.ZodEnum<{
        unknown: "unknown";
        income: "income";
        expense: "expense";
    }>;
    title: z.ZodString;
    merchant_or_source: z.ZodString;
    amount_before_tax: z.ZodNullable<z.ZodNumber>;
    tax_amount: z.ZodNullable<z.ZodNumber>;
    discount_amount: z.ZodNullable<z.ZodNumber>;
    tip_amount: z.ZodNullable<z.ZodNumber>;
    total_amount: z.ZodNullable<z.ZodNumber>;
    currency: z.ZodEnum<{
        INR: "INR";
        USD: "USD";
        UNKNOWN: "UNKNOWN";
    }>;
    date: z.ZodNullable<z.ZodString>;
    time: z.ZodNullable<z.ZodString>;
    category: z.ZodString;
    payment_mode: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        quantity: z.ZodNullable<z.ZodNumber>;
        unit_price: z.ZodNullable<z.ZodNumber>;
        total: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>>;
    notes: z.ZodString;
    confidence: z.ZodNumber;
    needs_review: z.ZodBoolean;
    warnings: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;
export type ExtractedItem = z.infer<typeof extractedItemSchema>;
