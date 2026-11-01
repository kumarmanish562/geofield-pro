import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.eyebrow}>GeoField Pro</Text>
      <Text style={styles.title}>Your field day, in sync.</Text>
      <Text style={styles.body}>
        The employee mobile shell is ready for assignments, attendance, surveys,
        and offline synchronization.
      </Text>
      <View style={styles.status}>
        <View style={styles.dot} />
        <Text style={styles.statusText}>Mobile app shell online</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#f2f4ed",
  },
  eyebrow: {
    marginBottom: 16,
    color: "#d26935",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    color: "#17352f",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 46,
  },
  body: {
    marginTop: 22,
    color: "#55706a",
    fontSize: 17,
    lineHeight: 27,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  dot: {
    width: 10,
    height: 10,
    marginRight: 12,
    borderRadius: 5,
    backgroundColor: "#35a66f",
  },
  statusText: {
    color: "#17352f",
    fontWeight: "700",
  },
});
