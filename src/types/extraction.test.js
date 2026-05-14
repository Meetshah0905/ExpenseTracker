import { describe, expect, it } from "vitest";
import { extractionResponseSchema } from "./extraction";
describe("extraction response validation", () => {
    it("accepts extraction", () => {
        const parsed = extractionResponseSchema.parse({
            transaction_type: "expense",
            title: "Rayban Meta Glasses",
            merchant_or_source: "Ray-Ban",
            amount_before_tax: 42000,
            tax_amount: 0,
            discount_amount: 0,
            tip_amount: 0,
            total_amount: 42000,
            currency: "INR",
            date: "2026-05-12",
            time: null,
            category: "Gadgets",
            payment_mode: "emi",
            items: [],
            notes: "Detected from uploaded image",
            confidence: 0.86,
            needs_review: false,
            warnings: []
        });
        expect(parsed.confidence).toBe(0.86);
    });
    it("rejects invalid Gemini JSON shape", () => {
        expect(() => extractionResponseSchema.parse({ ok: true })).toThrow();
    });
});
