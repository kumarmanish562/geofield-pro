import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button, EmptyState, LoadingView, Screen } from "../components/ui.js";
import { getOfflineSummary, getSyncHistory } from "../services/offlineStore";
import { synchronizeOfflineData } from "../services/syncEngine.js";
import { useNetwork } from "../context/NetworkContext.js";

export function SyncDashboardScreen() {
  const online = useNetwork();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [working, setWorking] = useState(false);
  const refresh = useCallback(() => {
    setSummary(getOfflineSummary());
    setHistory(getSyncHistory());
  }, []);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  async function sync() {
    setWorking(true);
    await synchronizeOfflineData();
    refresh();
    setWorking(false);
  }
  if (!summary)
    return <LoadingView label="Loading synchronization status..." />;
  const pending = (summary.queue.PENDING ?? 0) + (summary.queue.FAILED ?? 0);
  return (
    <Screen>
      <Text style={{ color: "#06432f", fontSize: 24, fontWeight: "800" }}>
        Offline sync
      </Text>
      <Text
        style={{
          color: online ? "#2d7a4b" : "#b42318",
          marginTop: 8,
          fontWeight: "700",
        }}
      >
        {online ? "Online" : "Offline"}
      </Text>
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 16,
          marginTop: 18,
          gap: 8,
        }}
      >
        <Text>Pending surveys: {summary.drafts.PENDING_SYNC ?? 0}</Text>
        <Text>Failed sync items: {summary.drafts.FAILED ?? 0}</Text>
        <Text>Queued operations: {pending}</Text>
        <Text>Synced operations: {summary.queue.SYNCED ?? 0}</Text>
        <Text>
          Last sync:{" "}
          {summary.lastSync
            ? new Date(summary.lastSync).toLocaleString()
            : "Never"}
        </Text>
      </View>
      <View style={{ marginTop: 14 }}>
        <Button onPress={sync} loading={working} disabled={!online}>
          Sync now
        </Button>
      </View>
      {history.length ? (
        <View style={{ marginTop: 22 }}>
          <Text
            style={{
              color: "#06432f",
              fontSize: 18,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            Recent history
          </Text>
          {history.slice(0, 8).map((item) => (
            <Text
              key={item.id}
              style={{
                color: item.result === "SYNCED" ? "#2d7a4b" : "#b42318",
                marginBottom: 6,
              }}
            >
              {item.result} · {new Date(item.created_at).toLocaleString()}
            </Text>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No synchronization history"
          description="Offline operations will appear here."
        />
      )}
    </Screen>
  );
}
