import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Screen } from "../components/ui.js";
import { useAuth } from "../context/AuthContext.js";

export function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const initials =
    user?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() ?? "GF";
  const openNotifications = () =>
    navigation.getParent()?.navigate("HomeTab", { screen: "Notifications" });
  const openSync = () =>
    navigation.getParent()?.navigate("HomeTab", { screen: "OfflineSync" });

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={styles.title}>Field profile</Text>
        <Text style={styles.subtitle}>Account details and field app preferences.</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <View style={styles.profileIdentity}>
              <Text style={styles.name}>{user?.name ?? "Employee"}</Text>
              <Text style={styles.email}>{user?.email ?? "Email unavailable"}</Text>
            </View>
            <View style={styles.statusPill}><View style={styles.statusDot} /><Text style={styles.statusText}>SIGNED IN</Text></View>
          </View>
          <View style={styles.divider} />
          <InfoRow label="Role" value={user?.role?.replaceAll("_", " ").toLowerCase() ?? "Not available"} />
          <InfoRow label="Employee code" value={user?.employeeCode ?? "Not provided"} />
        </View>

        <Text style={styles.sectionTitle}>Workspace</Text>
        <View style={styles.linkCard}>
          <MenuRow icon="⚙" title="Notification preferences" detail="Choose field update channels" onPress={() => navigation.navigate("Settings")} />
          <MenuRow icon="♧" title="Notifications" detail="View operational updates" onPress={openNotifications} />
          <MenuRow icon="↻" title="Offline synchronization" detail="Review pending field changes" onPress={openSync} last />
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyIcon}>⌖</Text>
          <Text style={styles.privacyText}>Location collection is limited to supervisor-authorized active work sessions.</Text>
        </View>
        <Button variant="secondary" onPress={logout}>Sign out</Button>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MenuRow({ icon, title, detail, onPress, last }) {
  return (
    <Pressable onPress={onPress} style={[styles.menuRow, last && styles.menuRowLast]}>
      <View style={styles.menuIcon}><Text style={styles.menuGlyph}>{icon}</Text></View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDetail}>{detail}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: "#f4f6ff" },
  content: { padding: 16, gap: 13, paddingBottom: 28 },
  eyebrow: { color: "#087c72", fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginTop: 5 },
  title: { color: "#06432f", fontSize: 26, fontWeight: "800", marginTop: -6 },
  subtitle: { color: "#536579", fontSize: 12, marginTop: -6 },
  profileCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1", borderRadius: 16, padding: 15, marginTop: 4 },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#d7f8f1", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#06432f", fontSize: 17, fontWeight: "900" },
  profileIdentity: { flex: 1 },
  name: { color: "#0b1c30", fontSize: 15, fontWeight: "800" },
  email: { color: "#536579", fontSize: 11, marginTop: 4 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, backgroundColor: "#d7f8f1", paddingHorizontal: 7, paddingVertical: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#087c72" },
  statusText: { color: "#075f55", fontFamily: "monospace", fontSize: 8, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#e8edf5", marginVertical: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6 },
  infoLabel: { color: "#536579", fontSize: 11 },
  infoValue: { color: "#0b1c30", fontSize: 11, fontWeight: "700", textTransform: "capitalize", textAlign: "right", flex: 1 },
  sectionTitle: { color: "#0b1c30", fontSize: 15, fontWeight: "800", marginTop: 4 },
  linkCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1", borderRadius: 15, paddingHorizontal: 13 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 67, borderBottomWidth: 1, borderBottomColor: "#e8edf5" },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#edf3ff", alignItems: "center", justifyContent: "center" },
  menuGlyph: { color: "#087c72", fontSize: 17, fontWeight: "800" },
  menuText: { flex: 1, gap: 3 },
  menuTitle: { color: "#0b1c30", fontSize: 12, fontWeight: "800" },
  menuDetail: { color: "#536579", fontSize: 10 },
  chevron: { color: "#087c72", fontSize: 22 },
  privacyCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#edf3ff", borderRadius: 13, padding: 13 },
  privacyIcon: { color: "#087c72", fontSize: 20 },
  privacyText: { color: "#35465b", fontSize: 11, lineHeight: 16, flex: 1 },
});
