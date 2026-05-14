import { BarChart3, Calculator, Home, Plus, ReceiptText, Settings, Sparkles } from "lucide-react";
import type { Page } from "../App";

const items: { page: Page; label: string; Icon: typeof Home }[] = [
  { page: "dashboard", label: "Dashboard", Icon: BarChart3 },
  { page: "transactions", label: "Transactions", Icon: ReceiptText },
  { page: "add", label: "Add", Icon: Plus },
  { page: "smartBuy", label: "Smart Buy", Icon: Sparkles },
  { page: "emi", label: "EMI", Icon: Calculator },
  { page: "settings", label: "Settings", Icon: Settings }
];

export function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ page: itemPage, label, Icon }) => (
        <button key={itemPage} className={page === itemPage ? "active" : ""} onClick={() => onNavigate(itemPage)} aria-label={label}>
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
