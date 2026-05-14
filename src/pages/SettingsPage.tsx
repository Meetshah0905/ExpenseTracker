import { useEffect, useState } from "react";
import { Download, FileUp, RotateCw } from "lucide-react";
import { checkGeminiHealth } from "../services/geminiExtractionClient";
import { useFinanceStore } from "../store/useFinanceStore";

export default function SettingsPage() {
  const db = useFinanceStore((state) => state.db);
  const exportJson = useFinanceStore((state) => state.exportJson);
  const importJson = useFinanceStore((state) => state.importJson);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [saveRawText, setSaveRawText] = useState(true);
  const [compressionQuality, setCompressionQuality] = useState(82);
  const [health, setHealth] = useState<{ ok: boolean; geminiConfigured: boolean } | null>(null);
  const [healthError, setHealthError] = useState("");

  useEffect(() => {
    checkGeminiHealth().then(setHealth).catch((err) => setHealthError(err instanceof Error ? err.message : "Health check failed"));
  }, []);

  function downloadJson() {
    const url = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-dashboard-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file?: File) {
    if (!file) return;
    const text = await file.text();
    await importJson(JSON.parse(text));
  }

  return (
    <div className="page-stack">
      <section className="panel settings-card">
        <h2>Data Management</h2>
        <p className="muted">Export or import your finance data as a JSON file for backup.</p>
        <div className="action-grid-v2">
          <button className="secondary-button" onClick={downloadJson}>
            <Download size={18} />
            Export JSON
          </button>
          <label className="secondary-button">
            <FileUp size={18} />
            Import JSON
            <input hidden type="file" accept="application/json" onChange={(event) => handleImport(event.target.files?.[0])} />
          </label>
        </div>
      </section>

      <section className="panel settings-card">
        <h2>AI Extraction</h2>
        <p className="muted">Configure how Gemini AI reads your receipts and screenshots.</p>
        <label className="toggle-line"><input type="checkbox" checked={aiEnabled} onChange={(event) => setAiEnabled(event.target.checked)} />Gemini extraction enabled</label>
        <label className="toggle-line"><input type="checkbox" checked={showConfidence} onChange={(event) => setShowConfidence(event.target.checked)} />Show extraction confidence</label>
        <label className="toggle-line"><input type="checkbox" checked={saveRawText} onChange={(event) => setSaveRawText(event.target.checked)} />Save raw extracted text</label>
        <label className="field-v2">
          <span>Image compression quality ({compressionQuality}%)</span>
          <input type="range" min="75" max="85" value={compressionQuality} onChange={(event) => setCompressionQuality(Number(event.target.value))} />
        </label>
        <button className="secondary-button" onClick={() => checkGeminiHealth().then(setHealth).catch((err) => setHealthError(err instanceof Error ? err.message : "Health check failed"))}>
          <RotateCw size={18} />
          Check AI Health
        </button>
        <div className="debug-area">
          <DebugRow label="Backend Connection" value={health?.ok ? "Success" : healthError ? "Error" : "Checking..."} />
          <DebugRow label="API Key Configured" value={health?.geminiConfigured ? "Yes" : "No"} />
        </div>
        {healthError && <p className="error">{healthError}</p>}
      </section>

      <section className="panel">
        <h2>Storage</h2>
        <p className="muted">Your data is stored locally in this browser. Export regularly to avoid data loss if you clear browser cache.</p>
        <p className="muted">Last updated: {db.updatedAt ? new Date(db.updatedAt).toLocaleString("en-IN") : "Not yet"}</p>
      </section>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="debug-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
