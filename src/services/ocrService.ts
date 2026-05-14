import type { PaymentMode, TransactionType } from "../types/finance";

export type OcrSuggestion = {
  type: TransactionType;
  title: string;
  amount: number;
  date: string;
  sourceOrMerchant?: string;
  category: string;
  paymentMode: PaymentMode;
  notes: string;
  possibleEmi?: {
    principal?: number;
    tenureMonths?: number;
    annualInterestRatePercent?: number;
    lender?: string;
  };
};

export async function resizeImage(file: File, maxWidth = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not compress image"))), "image/jpeg", 0.78);
  });
}

export async function runOcr(file: File, onProgress?: (progress: number) => void) {
  const compressed = await resizeImage(file);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message.status === "recognizing text") onProgress?.(message.progress);
    }
  });
  const result = await worker.recognize(compressed);
  await worker.terminate();
  return result.data.text;
}

export function extractTransactionSuggestion(text: string): OcrSuggestion {
  const normalized = text.replace(/\s+/g, " ").trim();
  const amountMatch = normalized.match(/(?:rs\.?|inr|₹)?\s*([0-9]+(?:,[0-9]{2,3})*(?:\.\d{1,2})?)/i);
  const dateMatch = normalized.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  const amount = amountMatch ? Number(amountMatch[1].replaceAll(",", "")) : 0;
  const hasIncomeWords = /credited|received|salary|payment from|deposit/i.test(normalized);
  const hasEmi = /emi|tenure|loan|interest/i.test(normalized);
  const title = normalized.split(/[.,\n]/)[0]?.slice(0, 70) || "Imported transaction";

  return {
    type: hasIncomeWords ? "income" : "expense",
    title,
    amount,
    date: dateMatch ? normalizeDate(dateMatch[1]) : new Date().toISOString().slice(0, 10),
    sourceOrMerchant: title,
    category: hasIncomeWords ? "Other Income" : hasEmi ? "EMI" : "Other Expense",
    paymentMode: hasEmi ? "emi" : /upi/i.test(normalized) ? "upi" : /card/i.test(normalized) ? "card" : "other",
    notes: text,
    possibleEmi: hasEmi ? { principal: amount } : undefined
  };
}

function normalizeDate(value: string) {
  const [a, b, c] = value.split(/[/-]/).map(Number);
  const year = c < 100 ? 2000 + c : c;
  return `${year}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
}
