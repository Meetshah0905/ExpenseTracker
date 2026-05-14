import { type ExtractionResponse } from "../types/extraction";
export declare function getGeminiHealth(): {
    ok: boolean;
    geminiConfigured: boolean;
};
export declare function extractTransactionFromFormData(formData: FormData): Promise<{
    data: ExtractionResponse;
    rawText: string;
}>;
