import { lazy, Suspense, useEffect, useState } from "react";
import { Layout } from "./components/Layout";

// Lazy-load all page-level components for code splitting
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const AddPage = lazy(() => import("./pages/AddPage"));
const SmartBuyPage = lazy(() => import("./pages/SmartBuyPage"));
const EmiPage = lazy(() => import("./pages/EmiPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

export type Page = "dashboard" | "transactions" | "add" | "smartBuy" | "emi" | "settings";

function PageFallback() {
  return (
    <div className="page-loading">
      <div className="page-loading-spinner" />
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

  useEffect(() => {
    const handleOnlineState = () => document.body.toggleAttribute("data-offline", !navigator.onLine);
    handleOnlineState();
    window.addEventListener("online", handleOnlineState);
    window.addEventListener("offline", handleOnlineState);
    return () => {
      window.removeEventListener("online", handleOnlineState);
      window.removeEventListener("offline", handleOnlineState);
    };
  }, []);

  return (
    <Layout page={page} onNavigate={setPage}>
      <Suspense fallback={<PageFallback />}>
        <div className="page-fade" key={page}>
          {page === "dashboard" && <DashboardPage onAdd={() => setPage("add")} />}
          {page === "transactions" && <TransactionsPage />}
          {page === "add" && <AddPage />}
          {page === "smartBuy" && <SmartBuyPage />}
          {page === "emi" && <EmiPage />}
          {page === "settings" && <SettingsPage />}
        </div>
      </Suspense>
    </Layout>
  );
}
