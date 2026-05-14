import { afterEach, describe, expect, it, vi } from "vitest";
import { extractTransactionFromFormData, getGeminiHealth } from "./geminiExtraction";
function imageFormData() {
    const formData = new FormData();
    formData.append("image", new Blob(["image"], { type: "image/jpeg" }), "receipt.jpg");
    formData.append("transactionTypeHint", "expense");
    formData.append("userCurrency", "INR");
    formData.append("timezone", "Asia/Kolkata");
    return formData;
}
describe("gemini extraction server", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });
    it("reports missing GEMINI_API_KEY", () => {
        vi.stubEnv("GEMINI_API_KEY", "");
        expect(getGeminiHealth().geminiConfigured).toBe(false);
    });
    it("fails gracefully when key is missing", async () => {
        vi.stubEnv("GEMINI_API_KEY", "");
        await expect(extractTransactionFromFormData(imageFormData())).rejects.toThrow("AI extraction is not configured");
    });
    it("parses valid Gemini expense extraction", async () => {
        vi.stubEnv("GEMINI_API_KEY", "test-key");
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify({
                                    success: true,
                                    confidence: 0.9,
                                    rawText: "Coffee 220 UPI",
                                    transaction: {
                                        type: "expense",
                                        title: "Coffee",
                                        amount: 220,
                                        currency: "INR",
                                        date: "2026-05-12",
                                        category: "Food",
                                        sourceOrMerchant: "Cafe",
                                        paymentMode: "upi",
                                        notes: "Detected"
                                    },
                                    warnings: []
                                }) }] } }]
        }), { status: 200 })));
        await expect(extractTransactionFromFormData(imageFormData())).resolves.toMatchObject({
            transaction: { type: "expense", amount: 220 }
        });
    });
    it("rejects invalid JSON from Gemini", async () => {
        vi.stubEnv("GEMINI_API_KEY", "test-key");
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ text: "not json" }] } }]
        }), { status: 200 })));
        await expect(extractTransactionFromFormData(imageFormData())).rejects.toThrow();
    });
});
