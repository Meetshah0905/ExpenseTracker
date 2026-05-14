import { extractionResponseSchema, type ExtractionResponse } from "../types/extraction";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB as requested

export function getGeminiHealth() {
  return {
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  };
}

const systemPrompt = `You are reading a receipt, bill, invoice, UPI screenshot, payment screenshot, salary credit screenshot, refund screenshot, bank screenshot, or shopping order screenshot for a personal finance app.

Extract structured transaction data.

Decide whether the transaction is:
- expense
- income
- unknown

Expense examples:
- receipt
- shopping order
- restaurant bill
- UPI paid
- card payment
- utility bill
- EMI payment

Income examples:
- salary credited
- UPI received
- refund received
- cashback received
- bank interest
- freelance payment
- client payment

Rules:
- Return only valid JSON.
- Do not include markdown.
- Do not include explanation.
- Do not guess aggressively.
- If unclear, return null.
- Use final payable amount as total_amount.
- Put GST/tax into tax_amount.
- If rupee symbol, UPI, GST, India, INR, or Indian merchant context appears, use INR.
- If multiple dates appear, choose the transaction date.
- If transaction type is uncertain, use unknown.
- Set needs_review true if confidence is below 0.85 or important fields are missing.

Use this exact JSON shape:
{
  "transaction_type": "expense",
  "title": "",
  "merchant_or_source": "",
  "amount_before_tax": null,
  "tax_amount": null,
  "discount_amount": null,
  "tip_amount": null,
  "total_amount": null,
  "currency": "INR",
  "date": null,
  "time": null,
  "category": "",
  "payment_mode": "",
  "items": [],
  "notes": "",
  "confidence": 0,
  "needs_review": true,
  "warnings": []
}`;

export async function extractTransactionFromFormData(formData: FormData): Promise<{ data: ExtractionResponse; rawText: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing on the server.");
  }

  const image = formData.get("file"); // Changed from "image" to "file" as requested
  if (!(image instanceof Blob)) {
    throw new Error("Please choose an image first.");
  }

  if (image.size > MAX_IMAGE_BYTES) {
    throw new Error("The image file is too large.");
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedTypes.includes(image.type)) {
    throw new Error("Unsupported file type. Please upload a PNG, JPEG, or WebP image.");
  }

  const hint = String(formData.get("hint") || "unknown");
  const userCurrency = "INR";
  const timezone = "Asia/Kolkata";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const arrayBuffer = await image.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  try {
    const result = await model.generateContent([
      {
        text: `${systemPrompt}\n\nUser hint: ${hint}. User currency: ${userCurrency}. Timezone: ${timezone}.`
      },
      {
        inlineData: {
          mimeType: image.type,
          data: base64
        }
      }
    ]);

    const response = await result.response;
    let text = response.text();
    
    // Strip markdown code fences if Gemini ignores the prompt instruction
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsed = JSON.parse(text);
    return {
      data: extractionResponseSchema.parse(parsed),
      rawText: text
    };
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    if (error instanceof SyntaxError) {
      throw new Error("The server returned invalid JSON.");
    }
    throw new Error("Could not read this image. Try a clearer photo.");
  }
}
