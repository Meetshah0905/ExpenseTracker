import type { ReactNode } from "react";
import type { Page } from "../App";
import { BottomNav } from "./BottomNav";


export function Layout({ children, page, onNavigate }: { children: ReactNode; page: Page; onNavigate: (page: Page) => void }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="header-content">
          <div className="title-group">
            <h1>Finance</h1>
            <p className="subtitle">Track spending, income, EMI, and smart purchases.</p>
          </div>
          <div className="status-badge">
            <span className="dot"></span>
            AI receipt scanner enabled
          </div>
        </div>
      </header>
      <main className="content">
        {children}
      </main>
      <BottomNav page={page} onNavigate={onNavigate} />
    </div>
  );
}
