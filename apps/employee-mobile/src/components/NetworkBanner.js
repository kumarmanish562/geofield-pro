import { StyleSheet, Text, View } from "react-native";
import { useNetwork } from "../context/NetworkContext.js";

export function NetworkBanner() {
  const online = useNetwork();
  return online ? null : (
    <View style={styles.banner}>
      <Text style={styles.text}>
        You are offline. Changes cannot be synchronized.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 10, backgroundColor: "#9b3d34" },
  text: { color: "#fff", fontSize: 12, textAlign: "center", fontWeight: "700" },
});
