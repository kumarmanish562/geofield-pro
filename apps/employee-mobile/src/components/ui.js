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
      <ActivityIndicator color="#d26935" />
      <Text style={styles.muted}>{label}</Text>
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
  screen: { flex: 1, padding: 22, backgroundColor: "#f5f7f3" },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#17352f",
    paddingHorizontal: 18,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  secondary: { backgroundColor: "#e5eee6" },
  secondaryText: { color: "#17352f" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
  field: { gap: 7, marginBottom: 14 },
  label: { color: "#50665d", fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#d2ded4",
    borderRadius: 9,
    backgroundColor: "#fff",
    color: "#17352f",
    padding: 13,
    fontSize: 16,
  },
  error: { color: "#b43e35", fontSize: 13 },
  muted: { color: "#71837a", lineHeight: 21, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    gap: 8,
    padding: 20,
  },
  emptyTitle: { color: "#536960", fontSize: 16, fontWeight: "700" },
});
