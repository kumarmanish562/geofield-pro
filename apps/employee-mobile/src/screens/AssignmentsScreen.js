import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { EmptyState, LoadingView, Screen } from "../components/ui.js";
import { getMyAssignments } from "../services/apiClient.js";

const filters = ["All", "In progress", "Pending"];

export function AssignmentsScreen({ navigation }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyAssignments()
        .then((response) => active && setItems(response.data.items ?? []))
        .catch((reason) => active && setError(reason.message));
      return () => {
        active = false;
      };
    }, []),
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      const matchesQuery =
        !normalized ||
        `${item.name} ${item.workArea ?? ""} ${item.code ?? ""}`
          .toLowerCase()
          .includes(normalized);
      const status = item.status?.toUpperCase() ?? "";
      const matchesFilter =
        filter === "All" ||
        (filter === "In progress" &&
          ["IN_PROGRESS", "ACTIVE", "PUBLISHED"].includes(status)) ||
        (filter === "Pending" && ["PENDING", "ASSIGNED"].includes(status));
      return matchesQuery && matchesFilter;
    });
  }, [filter, items, query]);

  if (!items && !error) return <LoadingView label="Loading assignments..." />;
  if (error)
    return (
      <Screen>
        <EmptyState title="Assignments unavailable" description={error} />
      </Screen>
    );

  return (
    <Screen style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.headingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>YOUR FIELD WORK</Text>
                <Text style={styles.title}>My assignments</Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{items.length} total</Text>
              </View>
            </View>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search assignment or village"
                placeholderTextColor="#718096"
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>
            <View style={styles.filters}>
              {filters.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[styles.filter, filter === item && styles.filterActive]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === item && styles.filterTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={items.length ? "No matching assignments" : "No assignments yet"}
            description={
              items.length
                ? "Try another search or status filter."
                : "Published assignments will appear here."
            }
          />
        }
        renderItem={({ item, index }) => {
          const target = Number(item.targetCount) || 0;
          const completed = Number(item.completedCount) || 0;
          const percent = target ? Math.min(100, Math.round((completed / target) * 100)) : null;
          const status = item.status?.replaceAll("_", " ") ?? "Status unavailable";
          return (
            <Pressable
              onPress={() => navigation.navigate("AssignmentDetails", { id: item.id })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              {index === 0 ? (
                <View style={styles.highlight}>
                  <View style={styles.highlightTop}>
                    <Text style={styles.highlightEyebrow}>CURRENT ASSIGNMENT</Text>
                    <Text style={styles.highlightDue}>
                      {item.dueDate
                        ? `Due ${new Date(item.dueDate).toLocaleDateString()}`
                        : "No due date"}
                    </Text>
                  </View>
                  <Text style={styles.highlightTitle}>{item.name}</Text>
                  <Text style={styles.highlightArea}>{item.workArea || "Work area not specified"}</Text>
                  <View style={styles.highlightMeta}>
                    <Text style={styles.highlightMetaText}>
                      {percent === null ? "Progress unavailable" : `${completed} / ${target} completed (${percent}%)`}
                    </Text>
                    <Text style={styles.highlightMetaText}>{status}</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${percent ?? 0}%` }]} />
                  </View>
                  <Text style={styles.cardCta}>View assignment details  →</Text>
                </View>
              ) : (
                <View style={styles.regularCard}>
                  <View style={styles.headingRow}>
                    <Text style={styles.cardCode} numberOfLines={1}>
                      {item.code || "FIELD ASSIGNMENT"}
                    </Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>{status}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardArea}>{item.workArea || "Work area not specified"}</Text>
                  <View style={styles.progressBox}>
                    <View style={styles.headingRow}>
                      <Text style={styles.cardArea}>Completion</Text>
                      <Text style={styles.cardArea}>
                        {percent === null ? "Not reported" : `${completed} / ${target} (${percent}%)`}
                      </Text>
                    </View>
                    <View style={[styles.track, styles.regularTrack]}>
                      <View style={[styles.fill, { width: `${percent ?? 0}%` }]} />
                    </View>
                  </View>
                  <View style={styles.bottomRow}>
                    <Text style={styles.dueText}>
                      {item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString()}` : "No due date"}
                    </Text>
                    <Text style={styles.detailsLink}>Details  ›</Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: "#f4f6ff" },
  content: { padding: 16, paddingBottom: 28 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  eyebrow: { color: "#087c72", fontSize: 10, letterSpacing: 1.4, fontWeight: "900" },
  title: { color: "#0b1c30", fontSize: 25, fontWeight: "800", marginTop: 4, textTransform: "capitalize" },
  countPill: { backgroundColor: "#d7f8f1", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  countText: { color: "#075f55", fontSize: 11, fontWeight: "800" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, paddingHorizontal: 13, minHeight: 48, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1", borderRadius: 13 },
  searchIcon: { fontSize: 20, color: "#536579" },
  searchInput: { flex: 1, paddingVertical: 8, color: "#0b1c30", fontSize: 13 },
  filters: { flexDirection: "row", gap: 8, marginVertical: 14 },
  filter: { minHeight: 36, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#e5ebf6" },
  filterActive: { backgroundColor: "#06432f" },
  filterText: { color: "#536579", fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: "#fff" },
  card: { marginBottom: 12, borderRadius: 16, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1" },
  highlight: { backgroundColor: "#06432f", padding: 17 },
  highlightTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  highlightEyebrow: { color: "#baf2e5", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  highlightDue: { color: "#fff", fontSize: 10, fontWeight: "700" },
  highlightTitle: { color: "#fff", fontSize: 19, lineHeight: 24, fontWeight: "800", marginTop: 12 },
  highlightArea: { color: "#d5e9df", fontSize: 12, lineHeight: 18, marginTop: 5 },
  highlightMeta: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 17, marginBottom: 8 },
  highlightMetaText: { color: "#e8f7ef", fontSize: 10, fontWeight: "700" },
  track: { height: 8, borderRadius: 99, backgroundColor: "rgba(255,255,255,.2)", overflow: "hidden" },
  regularTrack: { backgroundColor: "#dce8ff", marginTop: 8 },
  fill: { height: "100%", borderRadius: 99, backgroundColor: "#30c5a7" },
  cardCta: { color: "#fff", fontWeight: "800", fontSize: 12, marginTop: 15 },
  regularCard: { padding: 15 },
  cardCode: { color: "#087c72", fontFamily: "monospace", fontSize: 10, flex: 1 },
  statusPill: { backgroundColor: "#d7f8f1", paddingVertical: 5, paddingHorizontal: 8, borderRadius: 20, maxWidth: "50%" },
  statusText: { color: "#075f55", fontSize: 9, fontWeight: "900" },
  cardTitle: { color: "#0b1c30", fontSize: 17, lineHeight: 23, fontWeight: "800", marginTop: 10 },
  cardArea: { color: "#536579", fontSize: 11, marginTop: 5 },
  progressBox: { backgroundColor: "#edf3ff", borderRadius: 10, padding: 11, marginTop: 13 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 13 },
  dueText: { color: "#536579", fontSize: 10 },
  detailsLink: { color: "#06432f", fontWeight: "800", fontSize: 12 },
  pressed: { opacity: 0.85 },
});
