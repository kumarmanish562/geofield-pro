import { StyleSheet, Text, View } from "react-native";
import { Button, Screen } from "../components/ui.js";
import { useAuth } from "../context/AuthContext.js";
export function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  return (
    <Screen>
      <Text style={styles.eyebrow}>MY ACCOUNT</Text>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.detail}>{user?.email}</Text>
        <Text style={styles.detail}>Role: {user?.role?.toLowerCase()}</Text>
      </View>
      <Button
        variant="secondary"
        onPress={() => navigation.navigate("Settings")}
      >
        Settings
      </Button>
      <View style={styles.spacer} />
      <Button variant="secondary" onPress={logout}>
        Sign out
      </Button>
    </Screen>
  );
}
const styles = StyleSheet.create({
  eyebrow: {
    color: "#087c72",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 20,
  },
  title: {
    color: "#06432f",
    fontSize: 30,
    fontWeight: "800",
    marginVertical: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderColor: "#e0e7f1",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    padding: 20,
  },
  name: { color: "#06432f", fontSize: 20, fontWeight: "800", marginBottom: 8 },
  detail: { color: "#536579", marginTop: 5 },
  spacer: { height: 12 },
});
