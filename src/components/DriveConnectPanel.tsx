import { Cloud, LogIn } from "lucide-react";
import { useFinanceStore } from "../store/useFinanceStore";

export function DriveConnectPanel() {
  const isAuthed = useFinanceStore((state) => state.isAuthed);
  const connectAndLoad = useFinanceStore((state) => state.connectAndLoad);

  if (isAuthed) return null;

  return (
    <section className="drive-banner">
      <Cloud size={20} />
      <div>
        <strong>Sign in to save data</strong>
        <p>Your finance data is saved securely to your account. Sign in to save transactions permanently.</p>
      </div>
      <button onClick={connectAndLoad} aria-label="Sign in to save data">
        <LogIn size={18} />
      </button>
    </section>
  );
}
