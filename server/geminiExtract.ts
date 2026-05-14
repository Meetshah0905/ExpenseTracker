import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function extractWithGemini(file: { buffer: Buffer, mimetype: string }, hint: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing on the server.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const base64Image = file.buffer.toString("base64");

  try {
    const result = await model.generateContent([
      {
        text: `${systemPrompt}\n\nUser hint: ${hint}. User currency: INR. Timezone: Asia/Kolkata.`
      },
      {
        inlineData: {
          mimeType: file.mimetype,
          data: base64Image
        }
      }
    ]);

    const response = await result.response;
    let text = response.text();
    
    // Cleanup any markdown fences
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return {
      data: JSON.parse(text),
      rawText: text
    };
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
}
