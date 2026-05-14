import { 
  Camera, 
  FileImage, 
  RefreshCw, 
  Upload, 
  Check, 
  X, 
  AlertCircle, 
  Sparkles, 
  ScanLine, 
  ReceiptText,
  CheckCircle,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { extractTransactionWithGemini, type ExtractionApiResponse } from "../services/geminiExtractionClient";
import { prepareImageForExtraction, type PreparedImage } from "../services/imageService";
import type { ExtractionResponse } from "../types/extraction";
import { useFinanceStore } from "../store/useFinanceStore";
import { formatInr } from "../lib/currency";

type Hint = 
  | "auto" 
  | "expense" 
  | "income" 
  | "receipt" 
  | "upi_payment" 
  | "upi_received" 
  | "salary_credit" 
  | "refund" 
  | "invoice" 
  | "bank_screenshot"
  | "shopping_order"
  | "restaurant_bill"
  | "utility_bill";

type ScannerState = "idle" | "image_selected" | "scanning" | "review" | "error";

export function ImageImport() {
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [preview, setPreview] = useState<string>();
  const [prepared, setPrepared] = useState<PreparedImage>();
  const [extraction, setExtraction] = useState<ExtractionResponse>();
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [hint, setHint] = useState<Hint>("auto");
  
  const addTransaction = useFinanceStore(state => state.addTransaction);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const isDev = import.meta.env.DEV;

  // Auto-scan when image is selected
  useEffect(() => {
    if (scannerState === "image_selected" && prepared) {
      performScan();
    }
  }, [scannerState, prepared]);

  async function handleFile(file?: File) {
    if (!file) return;
    setError("");
    setDebugInfo(null);
    setExtraction(undefined);
    setScannerState("idle");
    
    try {
      const nextPrepared = await prepareImageForExtraction(file);
      if (preview) URL.revokeObjectURL(preview);
      setPrepared(nextPrepared);
      setPreview(nextPrepared.previewUrl);
      setScannerState("image_selected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this image. Try a clearer photo.");
      setScannerState("error");
    }
  }

  async function performScan() {
    if (!prepared) return;
    setScannerState("scanning");
    setError("");
    setDebugInfo(null);
    
    try {
      const result = await extractTransactionWithGemini({
        image: prepared.file,
        transactionTypeHint: hint
      });

      if (isDev) setDebugInfo(result);

      if (result.ok) {
        setExtraction(result.data);
        setScannerState("review");
      } else {
        setError(result.error);
        setScannerState("error");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setScannerState("error");
    }
  }

  async function saveExtracted() {
    if (!extraction) return;
    
    if (extraction.transaction_type === "unknown") {
       setError("Please confirm if this is an Expense or Income.");
       return;
    }

    const now = new Date().toISOString();
    try {
      await addTransaction({
        id: crypto.randomUUID(),
        type: extraction.transaction_type as "income" | "expense",
        title: extraction.title,
        merchant: extraction.merchant_or_source,
        amount: extraction.total_amount || 0,
        total_amount: extraction.total_amount || 0,
        tax_amount: extraction.tax_amount || 0,
        discount_amount: extraction.discount_amount || 0,
        tip_amount: extraction.tip_amount || 0,
        currency: extraction.currency === "UNKNOWN" ? "INR" : extraction.currency as any,
        category: extraction.category || "General",
        paymentMode: extraction.payment_mode as any,
        date: extraction.date || now.slice(0, 10),
        notes: extraction.notes,
        source: "photo",
        gemini_confidence: extraction.confidence,
        items: extraction.items,
        createdAt: now,
        updatedAt: now
      });
      
      resetScanner();
    } catch (err) {
      setError("Could not save transaction.");
      setScannerState("error");
    }
  }

  function resetScanner() {
    setExtraction(undefined);
    setPreview(undefined);
    setPrepared(undefined);
    setError("");
    setDebugInfo(null);
    setScannerState("idle");
  }

  if (scannerState === "review" && extraction) {
    return (
      <section className="review-screen-v2">
        <div className="review-header">
          <div className="header-info">
            <h2>Review before saving</h2>
            <div className="confidence-pill">
              {extraction.confidence >= 0.85 ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {Math.round(extraction.confidence * 100)}% Match
            </div>
          </div>
          <button className="close-btn" onClick={resetScanner}><X size={20} /></button>
        </div>

        <div className="review-scroll-area">
          <div className="review-grid-v2">
             <div className="field-row">
               <label className="type-toggle">
                 <button 
                   type="button"
                   className={extraction.transaction_type === 'expense' ? 'active' : ''} 
                   onClick={() => setExtraction({...extraction, transaction_type: 'expense'})}
                 >Expense</button>
                 <button 
                   type="button"
                   className={extraction.transaction_type === 'income' ? 'active' : ''} 
                   onClick={() => setExtraction({...extraction, transaction_type: 'income'})}
                 >Income</button>
               </label>
             </div>

             <label className="field">
               <span>Title</span>
               <input value={extraction.title} onChange={e => setExtraction({...extraction, title: e.target.value})} />
             </label>

             <label className="field">
               <span>Merchant / Source</span>
               <input value={extraction.merchant_or_source} onChange={e => setExtraction({...extraction, merchant_or_source: e.target.value})} />
             </label>

             <div className="field-group">
               <label className="field">
                 <span>Total Amount</span>
                 <input type="number" className="amount-input" value={extraction.total_amount || 0} onChange={e => setExtraction({...extraction, total_amount: Number(e.target.value)})} />
               </label>
               <label className="field">
                 <span>Date</span>
                 <input type="date" value={extraction.date || ""} onChange={e => setExtraction({...extraction, date: e.target.value})} />
               </label>
             </div>

             <div className="field-group">
               <label className="field">
                 <span>Category</span>
                 <input value={extraction.category} onChange={e => setExtraction({...extraction, category: e.target.value})} />
               </label>
               <label className="field">
                 <span>Payment Mode</span>
                 <input value={extraction.payment_mode} onChange={e => setExtraction({...extraction, payment_mode: e.target.value})} />
               </label>
             </div>

             <div className="expandable-fields">
                <details>
                  <summary>View breakdown (Tax, Items)</summary>
                  <div className="details-grid">
                    <label className="field">
                      <span>Tax</span>
                      <input type="number" value={extraction.tax_amount || 0} onChange={e => setExtraction({...extraction, tax_amount: Number(e.target.value)})} />
                    </label>
                    <label className="field">
                      <span>Discount</span>
                      <input type="number" value={extraction.discount_amount || 0} onChange={e => setExtraction({...extraction, discount_amount: Number(e.target.value)})} />
                    </label>
                  </div>

                  {extraction.items.length > 0 && (
                    <div className="items-list-v2">
                      <h4>Itemized products/services</h4>
                      {extraction.items.map((item, i) => (
                        <div key={i} className="item-v2">
                          <span className="item-name">{item.name}</span>
                          <span className="item-total">{item.total ? formatInr(item.total) : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
             </div>

             <label className="field">
               <span>Notes</span>
               <textarea rows={2} value={extraction.notes} onChange={e => setExtraction({...extraction, notes: e.target.value})} />
             </label>
          </div>

          {extraction.warnings.length > 0 && (
            <div className="warning-box">
              {extraction.warnings.map((w, i) => (
                <div key={i} className="warning-msg"><AlertCircle size={14} /> {w}</div>
              ))}
            </div>
          )}
        </div>

        <div className="review-actions-v2">
          <button className="btn-primary-v2" onClick={saveExtracted}>
            <Check size={18} /> Save Transaction
          </button>
          <button className="btn-secondary-v2" onClick={resetScanner}>
            Scan Another
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="premium-scanner-card">
      <div className="scanner-header">
        <div className="icon-wrapper">
          <ScanLine size={24} className="glow" />
        </div>
        <div className="text-wrapper">
          <h3>AI receipt scanner</h3>
          <p>Take a photo or upload a receipt, bill, UPI screenshot, or invoice. Review the result before saving.</p>
        </div>
      </div>

      <div className="scanner-body">
        {scannerState === "idle" && (
          <>
            <label className="hint-selector">
              <span>What are you uploading?</span>
              <select value={hint} onChange={(e) => setHint(e.target.value as Hint)}>
                <option value="auto">Auto detect</option>
                <option value="expense">Expense receipt</option>
                <option value="upi_payment">UPI payment</option>
                <option value="upi_received">UPI received</option>
                <option value="salary_credit">Salary credit</option>
                <option value="refund">Refund</option>
                <option value="invoice">Invoice</option>
                <option value="bank_screenshot">Bank screenshot</option>
                <option value="shopping_order">Shopping order</option>
                <option value="restaurant_bill">Restaurant bill</option>
                <option value="utility_bill">Utility bill</option>
              </select>
            </label>

            <div className="action-grid">
              <button className="action-btn main" onClick={() => cameraInputRef.current?.click()}>
                <Camera size={28} />
                <span>Take Photo</span>
                <input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} />
              </button>
              <div className="sub-actions">
                <button className="action-btn" onClick={() => fileInputRef.current?.click()}>
                  <FileImage size={20} />
                  <span>Choose Photo</span>
                  <input ref={fileInputRef} hidden type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} />
                </button>
                <button className="action-btn" onClick={() => screenshotInputRef.current?.click()}>
                  <Upload size={20} />
                  <span>Screenshot</span>
                  <input ref={screenshotInputRef} hidden type="file" accept="image/*,.png,.jpg,.jpeg,.webp" onChange={(e) => handleFile(e.target.files?.[0])} />
                </button>
              </div>
            </div>
          </>
        )}

        {(scannerState === "image_selected" || scannerState === "scanning") && (
          <div className="preview-container">
            <div className="preview-card">
              <img src={preview} alt="Receipt preview" className="scanner-preview" />
              {scannerState === "scanning" && (
                <div className="scanning-overlay">
                  <div className="scan-line-anim"></div>
                  <RefreshCw className="spin" size={32} />
                  <span>Reading transaction details…</span>
                </div>
              )}
            </div>
            {scannerState === "image_selected" && (
              <div className="preview-actions">
                <div className="file-info">
                  <ReceiptText size={16} />
                  <span>{prepared?.file.name}</span>
                </div>
                <button className="text-btn" onClick={resetScanner}>Change image</button>
                <button className="scan-btn-v2" onClick={performScan}>
                  <Sparkles size={18} /> Scan Now
                </button>
              </div>
            )}
          </div>
        )}

        {scannerState === "error" && (
          <div className="error-card-v2">
             <div className="error-icon-wrapper">
               <AlertCircle size={40} />
             </div>
             <h4>Scanning failed</h4>
             <p>{error}</p>
             
             {isDev && debugInfo && (
               <div className="debug-log">
                 <p><b>Endpoint:</b> {debugInfo.url || "/api/extract-transaction"}</p>
                 <p><b>HTTP Status:</b> {debugInfo.status || "N/A"}</p>
                 <p><b>Error:</b> {debugInfo.error}</p>
                 <p><b>Details:</b> {debugInfo.details || "None"}</p>
                 {prepared && (
                   <>
                     <p><b>File:</b> {prepared.file.name}</p>
                     <p><b>Type:</b> {prepared.file.type}</p>
                     <p><b>Size:</b> {(prepared.file.size / 1024 / 1024).toFixed(2)} MB</p>
                   </>
                 )}
                 <p className="hint">💡 If testing locally, run <code>npm run dev</code> so the API proxy is active.</p>
               </div>
             )}

             <div className="error-actions">
               <button className="btn-primary-v2" onClick={performScan}>
                 <RotateCcw size={18} /> Retry
               </button>
               <button className="btn-secondary-v2" onClick={resetScanner}>
                 Change Image
               </button>
             </div>
          </div>
        )}
      </div>

      <div className="scanner-footer">
        <div className="ai-badge">
          <Sparkles size={14} />
          Powered by Gemini AI
        </div>
      </div>
    </section>
  );
}
