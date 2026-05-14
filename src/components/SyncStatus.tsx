import { CheckCircle2, CloudOff, KeyRound, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useFinanceStore } from "../store/useFinanceStore";

export function SyncStatus() {
  const status = useFinanceStore((state) => state.syncStatus);
  const map = {
    not_connected: { label: "Not connected", Icon: KeyRound },
    connecting: { label: "Connecting", Icon: Loader2 },
    loading: { label: "Loading Drive", Icon: Loader2 },
    creating_database: { label: "Creating DB", Icon: Loader2 },
    synced: { label: "Synced", Icon: CheckCircle2 },
    unsynced: { label: "Unsynced changes", Icon: RefreshCw },
    syncing: { label: "Syncing", Icon: Loader2 },
    conflict: { label: "Conflict", Icon: TriangleAlert },
    error: { label: "Error", Icon: TriangleAlert },
    offline: { label: "Offline", Icon: CloudOff },
    token_expired: { label: "Reconnect", Icon: KeyRound },
    failed: { label: "Sync failed", Icon: TriangleAlert },
    retry_needed: { label: "Retry needed", Icon: RefreshCw },
    recovery: { label: "Recovery", Icon: TriangleAlert }
  };
  const { label, Icon } = map[status];

  return (
    <div className={`sync sync-${status}`}>
      <Icon size={15} className={["syncing", "loading", "connecting", "creating_database"].includes(status) ? "spin" : ""} />
      <span>{label}</span>
    </div>
  );
}
