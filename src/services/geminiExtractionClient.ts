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
  contentType?: string;
  responsePreview?: string;
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

    // Read response as text first — never call response.json() directly
    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";

    // Try to parse JSON safely
    let payload: any;
    try {
      payload = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Server returned non-JSON:", responseText.slice(0, 500));
      return {
        ok: false,
        error: "The server returned invalid JSON.",
        details: `Content-Type: ${contentType}`,
        status: response.status,
        url: apiUrl,
        contentType,
        responsePreview: responseText.slice(0, 500)
      };
    }

    // Server returned parseable JSON but with an error status
    if (!response.ok || !payload.ok) {
      return {
        ok: false,
        error: payload.error || "Could not scan image.",
        details: payload.details,
        status: response.status,
        url: apiUrl,
        contentType
      };
    }

    return payload as ExtractionApiResponse;
  } catch (err: any) {
    console.error("Fetch error:", err);
    if (err.name === "AbortError") {
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
