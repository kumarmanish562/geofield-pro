import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EmptyState, Screen, styles as ui } from "../components/ui.js";
import { NetworkBanner } from "../components/NetworkBanner.js";
import { useAuth } from "../context/AuthContext.js";

export function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const today = new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
  }).format(new Date());
  return (
    <Screen style={styles.screen}>
      <NetworkBanner />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => {}} />
        }
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>FIELD WORKSPACE</Text>
        <Text style={styles.title}>
          Good morning, {user?.name?.split(" ")[0] ?? "there"}.
        </Text>
        <Text style={ui.muted}>{today}</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today&apos;s attendance</Text>
          <Text style={styles.cardTitle}>Open attendance</Text>
          <Text style={ui.muted}>
            Check in, manage breaks, and check out from the attendance tab.
          </Text>
        </View>
        <Text style={styles.section}>Quick actions</Text>
        <View style={styles.actions}>
          <Action
            title="My assignments"
            onPress={() => navigation.getParent()?.navigate("AssignmentsTab")}
          />
          <Action
            title="Open map"
            onPress={() => navigation.getParent()?.navigate("MapTab")}
          />
        </View>
        <Text style={styles.section}>Recent assignments</Text>
        <EmptyState
          title="No assignment data yet"
          description="Assignment endpoints will be connected when the backend module is available."
        />
      </ScrollView>
    </Screen>
  );
}

function Action({ title, onPress }) {
  return (
    <Text style={styles.action} onPress={onPress}>
      {title}
    </Text>
  );
}
const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0, paddingTop: 0 },
  content: { padding: 22 },
  eyebrow: {
    color: "#d26935",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 20,
  },
  title: {
    color: "#17352f",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#17352f",
    borderRadius: 14,
    marginTop: 28,
    padding: 20,
  },
  cardLabel: { color: "#aec8b5", fontSize: 13 },
  cardTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginVertical: 8,
  },
  section: {
    color: "#17352f",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 28,
    marginBottom: 12,
  },
  actions: { flexDirection: "row", gap: 10 },
  action: {
    backgroundColor: "#e5eee6",
    borderRadius: 10,
    color: "#28564b",
    flex: 1,
    fontWeight: "700",
    padding: 16,
    textAlign: "center",
  },
});
