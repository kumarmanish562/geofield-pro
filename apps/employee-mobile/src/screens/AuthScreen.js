import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, Field, Screen } from "../components/ui.js";
import { useAuth } from "../context/AuthContext.js";
import {
  ApiError,
  requestPasswordReset,
  resetPassword,
} from "../services/apiClient.js";

export function AuthScreen() {
  const { login, acceptInvite } = useAuth();
  const [mode, setMode] = useState("login");
  const [emailOrName, setEmailOrName] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit() {
    setNotice("");
    if (mode === "forgot" && !emailOrName.trim()) {
      setNotice("Enter your work email.");
      return;
    }
    if (
      (mode !== "forgot" && mode !== "reset" && !emailOrName.trim()) ||
      (mode !== "forgot" && password.length < 12) ||
      ((mode === "invite" || mode === "reset") && token.length < 32)
    ) {
      setNotice(
        mode === "login"
          ? "Enter your email and password."
          : "Check the supplied details and try again.",
      );
      return;
    }
    setLoading(true);
    try {
      if (mode === "forgot") {
        await requestPasswordReset(emailOrName.trim());
        setNotice("If an account exists, reset instructions are on the way.");
      } else if (mode === "reset") {
        await resetPassword(token.trim(), password);
        setNotice("Password reset completed. You can sign in now.");
        setMode("login");
      } else if (mode === "invite")
        await acceptInvite(token.trim(), emailOrName.trim(), password);
      else await login(emailOrName.trim(), password);
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Text style={styles.mark}>GF</Text>
            <Text style={styles.eyebrow}>GEOfIELD PRO</Text>
          </View>
          <Text style={styles.title}>
            {mode === "invite"
              ? "Join your field team."
              : mode === "forgot"
                ? "Recover your password."
                : mode === "reset"
                  ? "Choose a new password."
                  : "Sign in to your field day."}
          </Text>
          <Text style={styles.subtitle}>
            Access assigned work and keep your team updated from the field.
          </Text>
          <View style={styles.form}>
            {mode !== "reset" && (
              <Field
                label={mode === "invite" ? "Your name" : "Work email"}
                placeholder={
                  mode === "invite" ? "Your name" : "you@example.com"
                }
                autoCapitalize={mode === "invite" ? "words" : "none"}
                keyboardType={mode === "invite" ? "default" : "email-address"}
                value={emailOrName}
                onChangeText={setEmailOrName}
              />
            )}
            {(mode === "invite" || mode === "reset") && (
              <Field
                label={mode === "invite" ? "Invitation token" : "Reset token"}
                placeholder={
                  mode === "invite"
                    ? "Paste your invitation token"
                    : "Paste your reset token"
                }
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
              />
            )}
            {mode !== "forgot" && (
              <>
                <Field
                  label="Password"
                  placeholder="At least 12 characters"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <Text
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide password" : "Show password"}
                </Text>
              </>
            )}
            {notice ? <Text style={styles.error}>{notice}</Text> : null}
            <Button onPress={submit} loading={loading}>
              {mode === "invite"
                ? "Accept invitation"
                : mode === "forgot"
                  ? "Send reset instructions"
                  : mode === "reset"
                    ? "Reset password"
                    : "Sign in"}
            </Button>
          </View>
          <Text
            style={styles.link}
            onPress={() => {
              setMode(mode === "login" ? "invite" : "login");
              setNotice("");
            }}
          >
            {mode === "invite"
              ? "Back to sign in"
              : mode === "login"
                ? "Accept an invitation"
                : "Back to sign in"}
          </Text>
          {mode === "login" && (
            <Text
              style={styles.link}
              onPress={() => {
                setMode("forgot");
                setNotice("");
              }}
            >
              Forgot password
            </Text>
          )}
          {mode === "login" && (
            <Text
              style={styles.link}
              onPress={() => {
                setMode("reset");
                setNotice("");
              }}
            >
              Reset with a token
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", paddingVertical: 28 },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 34,
  },
  mark: {
    alignItems: "center",
    backgroundColor: "#06432f",
    borderRadius: 10,
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    padding: 11,
  },
  eyebrow: {
    color: "#087c72",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: { color: "#06432f", fontSize: 36, fontWeight: "800", lineHeight: 40 },
  subtitle: { color: "#536579", fontSize: 16, lineHeight: 24, marginTop: 14 },
  form: { marginTop: 30 },
  error: { color: "#b42318", marginBottom: 14 },
  link: {
    color: "#087c72",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 20,
    textAlign: "center",
  },
  passwordToggle: {
    alignSelf: "flex-end",
    color: "#087c72",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 14,
  },
});
