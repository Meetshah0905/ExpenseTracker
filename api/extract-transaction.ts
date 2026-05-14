import { extractTransactionFromFormData } from "../src/server/geminiExtraction";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Gemini key configured:", Boolean(apiKey));
    
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: "Gemini API key is missing on the server." });
    }

    // Convert the Node.js request to a Web Request so we can use formData()
    // This is a common pattern for Vercel functions with bodyParser disabled
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    
    const request = new Request("http://localhost/api/extract-transaction", {
      method: "POST",
      headers: req.headers as HeadersInit,
      body: buffer
    });

    const formData = await request.formData();
    const result = await extractTransactionFromFormData(formData);
    
    return res.status(200).json({
      ok: true,
      data: result.data,
      rawText: result.rawText
    });
  } catch (error: any) {
    console.error("API Error:", error);
    
    let message = error.message || "Extraction failed";
    let status = 500;

    if (message.includes("large")) status = 413;
    if (message.includes("type")) status = 400;
    if (message.includes("choose")) status = 400;

    return res.status(status).json({
      ok: false,
      error: message,
      details: error.stack || undefined
    });
  }
}
