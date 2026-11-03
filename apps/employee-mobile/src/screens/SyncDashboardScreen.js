import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, EmptyState, LoadingView, Screen } from "../components/ui.js";
import { getOfflineSummary, getSyncHistory } from "../services/offlineStore";
import { synchronizeOfflineData } from "../services/syncEngine.js";
import { useNetwork } from "../context/NetworkContext.js";

export function SyncDashboardScreen() {
  const online = useNetwork();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
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
    setError("");
    try {
      await synchronizeOfflineData();
      refresh();
    } catch (reason) {
      setError(reason.message ?? "Synchronization did not complete.");
      refresh();
    } finally {
      setWorking(false);
    }
  }
  if (!summary)
    return <LoadingView label="Loading synchronization status..." />;
  const queued = (summary.queue.PENDING ?? 0) + (summary.queue.FAILED ?? 0);
  const pendingSurveys = summary.drafts.PENDING_SYNC ?? 0;
  const failedSurveys = summary.drafts.FAILED ?? 0;
  const synced = summary.queue.SYNCED ?? 0;
  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>DEVICE DATA</Text>
        <Text style={styles.title}>Offline sync</Text>
        <Text style={styles.subtitle}>Review changes saved on this device and sync when connected.</Text>

        <View style={[styles.statusBanner, online ? styles.bannerOnline : styles.bannerOffline]}>
          <View style={styles.statusTop}>
            <View style={[styles.dot, online ? styles.dotOnline : styles.dotOffline]} />
            <Text style={[styles.connection, online ? styles.textOnline : styles.textOffline]}>
              {online ? "Connection available" : "No connection"}
            </Text>
            <Text style={styles.deviceLabel}>LOCAL QUEUE</Text>
          </View>
          <Text style={styles.bannerCopy}>
            {online
              ? "Pending changes can be uploaded to the server."
              : "New field changes stay on this device until a connection returns."}
          </Text>
        </View>

        <View style={styles.primaryCard}>
          <Text style={styles.cardEyebrow}>WAITING TO SYNC</Text>
          <View style={styles.queueCountRow}>
            <Text style={styles.queueCount}>{queued + pendingSurveys + failedSurveys}</Text>
            <Text style={styles.queueUnit}>items</Text>
          </View>
          <Text style={styles.primaryCopy}>
            {pendingSurveys + failedSurveys} pending or failed survey{pendingSurveys + failedSurveys === 1 ? "" : "s"} and {queued} pending or failed queued operation{queued === 1 ? "" : "s"}.
          </Text>
          <View style={styles.statDivider} />
          <View style={styles.miniStats}>
            <MiniStat label="Failed surveys" value={failedSurveys} />
            <MiniStat label="Synced operations" value={synced} />
            <MiniStat label="Last sync" value={summary.lastSync ? new Date(summary.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Never"} />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button onPress={sync} loading={working} disabled={!online}>
          {online ? "Sync pending records  →" : "Waiting for connection"}
        </Button>
        <Text style={styles.syncNote}>Offline records remain marked as pending until the server confirms synchronization.</Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent sync activity</Text>
          <Text style={styles.historyCount}>{history.length} recent</Text>
        </View>
        {history.length ? (
          <View style={styles.historyCard}>
            {history.slice(0, 10).map((item, index) => (
              <View style={[styles.historyRow, index === Math.min(history.length, 10) - 1 && styles.historyRowLast]} key={item.id}>
                <View style={[styles.historyIcon, item.result === "SYNCED" ? styles.historyIconGood : styles.historyIconWarn]}>
                  <Text style={styles.historyGlyph}>{item.result === "SYNCED" ? "✓" : "!"}</Text>
                </View>
                <View style={styles.historyText}>
                  <Text style={styles.historyResult}>{item.result?.replaceAll("_", " ") ?? "UNKNOWN"}</Text>
                  <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
                <Text style={styles.historyChevron}>›</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <EmptyState title="No sync history yet" description="Synchronization events will appear here after the first upload." />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function MiniStat({ label, value }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: "#f4f6ff" },
  content: { padding: 16, paddingBottom: 28, gap: 13 },
  eyebrow: { color: "#087c72", fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginTop: 4 },
  title: { color: "#06432f", fontSize: 25, fontWeight: "800", marginTop: -5 },
  subtitle: { color: "#536579", fontSize: 12, lineHeight: 18, marginTop: -5 },
  statusBanner: { borderRadius: 13, padding: 14, borderWidth: 1, borderColor: "#e0e7f1" },
  bannerOnline: { backgroundColor: "#d7f8f1" },
  bannerOffline: { backgroundColor: "#fff0d9" },
  statusTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: "#087c72" },
  dotOffline: { backgroundColor: "#b45309" },
  connection: { fontSize: 12, fontWeight: "800", flex: 1 },
  textOnline: { color: "#075f55" },
  textOffline: { color: "#874515" },
  deviceLabel: { color: "#536579", fontFamily: "monospace", fontSize: 8, fontWeight: "700" },
  bannerCopy: { color: "#35465b", fontSize: 11, lineHeight: 16, marginTop: 7 },
  primaryCard: { backgroundColor: "#06432f", borderRadius: 16, padding: 17 },
  cardEyebrow: { color: "#baf2e5", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  queueCountRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 9 },
  queueCount: { color: "#fff", fontSize: 38, fontWeight: "800" },
  queueUnit: { color: "#d5e9df", fontSize: 14, fontWeight: "700" },
  primaryCopy: { color: "#d5e9df", fontSize: 12, lineHeight: 18, marginTop: 2 },
  statDivider: { height: 1, backgroundColor: "rgba(255,255,255,.22)", marginVertical: 15 },
  miniStats: { flexDirection: "row", justifyContent: "space-between", gap: 7 },
  miniStat: { flex: 1 },
  miniValue: { color: "#fff", fontSize: 15, fontWeight: "800" },
  miniLabel: { color: "#baf2e5", fontSize: 9, lineHeight: 13, marginTop: 4 },
  error: { color: "#b42318", fontSize: 12, lineHeight: 18 },
  syncNote: { color: "#536579", fontSize: 10, lineHeight: 15, textAlign: "center" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionTitle: { color: "#0b1c30", fontSize: 15, fontWeight: "800" },
  historyCount: { color: "#536579", fontFamily: "monospace", fontSize: 9 },
  historyCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1", borderRadius: 14, paddingHorizontal: 12 },
  historyRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: "#e8edf5" },
  historyRowLast: { borderBottomWidth: 0 },
  historyIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  historyIconGood: { backgroundColor: "#d7f8f1" },
  historyIconWarn: { backgroundColor: "#fff0d9" },
  historyGlyph: { color: "#06432f", fontSize: 14, fontWeight: "900" },
  historyText: { flex: 1, gap: 3 },
  historyResult: { color: "#0b1c30", fontSize: 11, fontWeight: "800" },
  historyDate: { color: "#536579", fontSize: 9 },
  historyChevron: { color: "#087c72", fontSize: 21 },
  emptyCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e0e7f1" },
});
