import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children, scroll = false, style }) {
  return <SafeAreaView style={[styles.screen, style]}>{children}</SafeAreaView>;
}

export function Button({
  children,
  onPress,
  loading = false,
  variant = "primary",
  disabled,
}) {
  return (
    <Pressable
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondary,
        pressed && styles.pressed,
        (loading || disabled) && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "secondary" && styles.secondaryText,
        ]}
      >
        {loading ? "Working..." : children}
      </Text>
    </Pressable>
  );
}

export function Field({ label, error, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#8ca098"
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function LoadingView({ label = "Loading..." }) {
  return (
    <View style={styles.center}>
      <View style={styles.loadingMark}>
        <Text style={styles.loadingLetters}>GF</Text>
      </View>
      <Text style={styles.loadingBrand}>GeoField Pro</Text>
      <ActivityIndicator color="#087c72" />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, description }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.muted}>{description}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: "#f4f6ff" },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#06432f",
    paddingHorizontal: 18,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondary: { backgroundColor: "#dce8ff" },
  secondaryText: { color: "#06432f" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
  field: { gap: 7, marginBottom: 14 },
  label: { color: "#35465b", fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 9,
    backgroundColor: "#fff",
    color: "#0b1c30",
    padding: 13,
    fontSize: 16,
  },
  error: { color: "#b42318", fontSize: 13 },
  muted: { color: "#536579", lineHeight: 21, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingMark: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#06432f",
  },
  loadingLetters: { color: "#fff", fontSize: 17, fontWeight: "900" },
  loadingBrand: { color: "#06432f", fontSize: 17, fontWeight: "800" },
  loadingLabel: { color: "#536579", fontSize: 12 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    gap: 8,
    padding: 20,
  },
  emptyTitle: { color: "#0b1c30", fontSize: 16, fontWeight: "700" },
});
