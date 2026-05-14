import { useState } from "react";
import { ImageImport } from "../components/ImageImport";
import { TransactionForm } from "../components/TransactionForm";

export default function AddPage() {
  const [mode, setMode] = useState<"manual" | "photo">("manual");

  return (
    <div className="page-stack">
      <div className="segmented add-mode">
        <button type="button" className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}>Manual</button>
        <button type="button" className={mode === "photo" ? "active" : ""} onClick={() => setMode("photo")}>Photo</button>
      </div>
      {mode === "manual" ? <TransactionForm /> : <ImageImport />}
    </div>
  );
}
