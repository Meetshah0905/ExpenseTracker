import { extractionResponseSchema, type ExtractionResponse } from "../types/extraction";

export async function checkGeminiHealth() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("Backend health check failed.");
    return response.json() as Promise<{ ok: boolean; geminiConfigured: boolean }>;
  } catch (err) {
    console.error("Health check error:", err);
    return { ok: false, geminiConfigured: false };
  }
}

export type ExtractionApiResponse = {
  ok: true;
  data: ExtractionResponse;
  rawText: string;
} | {
  ok: false;
  error: string;
  details?: string;
  status?: number;
  url?: string;
};

export async function extractTransactionWithGemini(input: {
  image: File;
  transactionTypeHint: string;
}): Promise<ExtractionApiResponse> {
  const apiUrl = "/api/extract-transaction";
  const formData = new FormData();
  formData.append("file", input.image);
  formData.append("hint", input.transactionTypeHint);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });

    const json = await response.json().catch(() => ({
      ok: false,
      error: "The server returned invalid JSON."
    }));

    if (!response.ok) {
      return {
        ...json,
        ok: false,
        status: response.status,
        url: apiUrl,
        error: json.error || "Could not reach the scanner API."
      };
    }

    return json as ExtractionApiResponse;
  } catch (err: any) {
    console.error("Fetch error:", err);
    if (err.name === 'AbortError') {
      return { ok: false, error: "Scanner request timed out. Try again." };
    }
    return { 
      ok: false, 
      error: "Failed to fetch. If testing locally, run 'npm run dev' so the API proxy is active.",
      details: err.message,
      url: apiUrl
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
