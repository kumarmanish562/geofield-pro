import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, Field, Screen } from "../components/ui.js";
import { useAuth } from "../context/AuthContext.js";
import { useNetwork } from "../context/NetworkContext.js";
import {
  ApiError,
  requestPasswordReset,
  resetPassword,
} from "../services/apiClient.js";

const modeCopy = {
  login: ["Welcome back", "Sign in to view your assigned fieldwork."],
  invite: ["Activate your account", "Use the invitation details provided by your organization."],
  forgot: ["Recover your account", "Request a password reset using your work email."],
  reset: ["Set a new password", "Enter your reset token and choose a new password."],
};

export function AuthScreen({ route }) {
  const { login, acceptInvite } = useAuth();
  const online = useNetwork();
  const [mode, setMode] = useState(route?.params?.mode ?? "login");
  const [emailOrName, setEmailOrName] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setNotice("");
    setPassword("");
    setToken("");
  }

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
        changeMode("success");
      } else if (mode === "invite") {
        await acceptInvite(token.trim(), emailOrName.trim(), password);
      } else {
        await login(emailOrName.trim(), password);
      }
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "Unable to continue. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const copy = modeCopy[mode] ?? modeCopy.login;
  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topbar}>
            <View style={styles.mark}><Text style={styles.markText}>GF</Text></View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>GeoField Pro</Text>
              <Text style={styles.brandMeta}>EMPLOYEE FIELD APP</Text>
            </View>
            <View style={[styles.connection, !online && styles.connectionOffline]}>
              <View style={[styles.dot, !online && styles.dotOffline]} />
              <Text style={[styles.connectionText, !online && styles.connectionTextOffline]}>
                {online ? "Online" : "Offline"}
              </Text>
            </View>
          </View>

          {mode === "success" ? (
            <View style={styles.successWrap}>
              <View style={styles.successIcon}><Text style={styles.successGlyph}>✓</Text></View>
              <Text style={styles.eyebrow}>CREDENTIAL UPDATE COMPLETE</Text>
              <Text style={styles.successTitle}>Password updated</Text>
              <Text style={styles.subtitle}>Your password reset was completed. Sign in with your new password to return to fieldwork.</Text>
              <View style={styles.successCard}>
                <Text style={styles.successCardTitle}>Next step</Text>
                <Text style={styles.successCardText}>Use your work email and new password on the sign-in screen.</Text>
              </View>
              <Button onPress={() => changeMode("login")}>Return to sign in  →</Button>
            </View>
          ) : (
            <>
              <View style={styles.heading}>
                <Text style={styles.eyebrow}>
                  {mode === "invite" ? "INVITATION SETUP" : mode === "forgot" || mode === "reset" ? "ACCOUNT RECOVERY" : "FIELD TERMINAL"}
                </Text>
                <Text style={styles.title}>{copy[0]}</Text>
                <Text style={styles.subtitle}>{copy[1]}</Text>
              </View>

              {mode === "login" ? (
                <View style={styles.noticeCard}>
                  <View style={styles.noticeIcon}><Text style={styles.noticeGlyph}>✓</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noticeTitle}>Work offline when needed</Text>
                    <Text style={styles.noticeText}>Saved field changes wait on this device until a connection is available.</Text>
                  </View>
                </View>
              ) : null}

              {mode === "forgot" || mode === "reset" ? (
                <View style={styles.recoveryBanner}>
                  <Text style={styles.recoverySymbol}>↻</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recoveryTitle}>{mode === "forgot" ? "Request a reset" : "Verify your reset token"}</Text>
                    <Text style={styles.recoveryText}>
                      {mode === "forgot"
                        ? "Reset instructions are sent only when the account can be verified."
                        : "Reset tokens are private and should only be used by their intended recipient."}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.formCard}>
                {mode !== "reset" && (
                  <Field
                    label={mode === "invite" ? "Your name" : "Work email"}
                    placeholder={mode === "invite" ? "Enter your name" : "you@example.org"}
                    autoCapitalize={mode === "invite" ? "words" : "none"}
                    keyboardType={mode === "invite" ? "default" : "email-address"}
                    value={emailOrName}
                    onChangeText={setEmailOrName}
                    autoComplete={mode === "invite" ? "name" : "email"}
                  />
                )}
                {(mode === "invite" || mode === "reset") && (
                  <Field
                    label={mode === "invite" ? "Invitation token" : "Reset token"}
                    placeholder="Paste your token"
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
                {mode !== "forgot" && (
                  <>
                    <Field
                      label={mode === "reset" || mode === "invite" ? "Create password" : "Password"}
                      placeholder="At least 12 characters"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setShowPassword((value) => !value)}
                      style={styles.passwordToggle}
                    >
                      <Text style={styles.passwordToggleText}>{showPassword ? "Hide password" : "Show password"}</Text>
                    </Pressable>
                  </>
                )}
                {notice ? <Text style={styles.error} accessibilityRole="alert">{notice}</Text> : null}
                <Button onPress={submit} loading={loading} disabled={!online}>
                  {mode === "invite"
                    ? "Accept invitation"
                    : mode === "forgot"
                      ? "Send reset instructions"
                      : mode === "reset"
                        ? "Update password"
                        : "Sign in to fieldwork  →"}
                </Button>
                {!online ? <Text style={styles.offlineHint}>Connect to sign in or request an account update. Existing offline data remains available after authentication.</Text> : null}
              </View>

              <View style={styles.linkRow}>
                {mode === "login" ? (
                  <>
                    <Pressable onPress={() => changeMode("forgot")} style={styles.linkButton}><Text style={styles.linkText}>Forgot password?</Text></Pressable>
                    <Pressable onPress={() => changeMode("invite")} style={styles.linkButton}><Text style={styles.linkText}>Accept invitation</Text></Pressable>
                  </>
                ) : (
                  <Pressable onPress={() => changeMode("login")} style={styles.backButton}>
                    <Text style={styles.backText}>←  Back to sign in</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.footer}>Location is collected only during an authorized active work session.</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: "#f4f6ff" },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 20, paddingTop: 14, paddingBottom: 28, gap: 18 },
  topbar: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 },
  mark: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#06432f" },
  markText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  brandCopy: { flex: 1 },
  brandName: { color: "#0b1c30", fontSize: 16, fontWeight: "800" },
  brandMeta: { color: "#087c72", fontSize: 9, fontFamily: "monospace", fontWeight: "700", letterSpacing: 1, marginTop: 3 },
  connection: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 30, backgroundColor: "#d7f8f1" },
  connectionOffline: { backgroundColor: "#fff0d9" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#087c72" },
  dotOffline: { backgroundColor: "#b45309" },
  connectionText: { color: "#075f55", fontSize: 10, fontWeight: "800" },
  connectionTextOffline: { color: "#874515" },
  heading: { gap: 5, marginTop: 8 },
  eyebrow: { color: "#087c72", fontSize: 10, letterSpacing: 1.3, fontWeight: "900" },
  title: { color: "#06432f", fontSize: 29, lineHeight: 36, fontWeight: "800", marginTop: 3 },
  subtitle: { color: "#536579", fontSize: 14, lineHeight: 21, marginTop: 3 },
  noticeCard: { flexDirection: "row", gap: 11, alignItems: "center", padding: 14, borderRadius: 14, backgroundColor: "#edf3ff" },
  noticeIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#baf2e5", alignItems: "center", justifyContent: "center" },
  noticeGlyph: { color: "#06432f", fontSize: 18, fontWeight: "900" },
  noticeTitle: { color: "#087c72", fontSize: 11, fontWeight: "900", letterSpacing: 0.4 },
  noticeText: { color: "#536579", fontSize: 12, lineHeight: 18, marginTop: 4 },
  recoveryBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, backgroundColor: "#06432f", borderRadius: 14 },
  recoverySymbol: { color: "#87f0dd", fontSize: 27, fontWeight: "800" },
  recoveryTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  recoveryText: { color: "#d5e9df", fontSize: 11, lineHeight: 17, marginTop: 3 },
  formCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e0e7f1", backgroundColor: "#fff" },
  passwordToggle: { alignSelf: "flex-end", minHeight: 38, justifyContent: "center", paddingHorizontal: 4, marginTop: -13, marginBottom: 6 },
  passwordToggleText: { color: "#087c72", fontSize: 12, fontWeight: "800" },
  error: { color: "#b42318", fontSize: 12, lineHeight: 18, marginBottom: 12 },
  offlineHint: { color: "#536579", fontSize: 11, lineHeight: 16, marginTop: 11, textAlign: "center" },
  linkRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  linkButton: { minHeight: 42, justifyContent: "center", paddingHorizontal: 4 },
  linkText: { color: "#087c72", fontSize: 12, fontWeight: "800" },
  backButton: { minHeight: 42, justifyContent: "center", paddingHorizontal: 4 },
  backText: { color: "#087c72", fontSize: 13, fontWeight: "800" },
  footer: { color: "#718096", fontSize: 10, lineHeight: 15, fontFamily: "monospace", textAlign: "center", marginTop: "auto" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingVertical: 32 },
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#d7f8f1", alignItems: "center", justifyContent: "center", borderWidth: 8, borderColor: "#baf2e5" },
  successGlyph: { color: "#06432f", fontSize: 40, fontWeight: "900" },
  successTitle: { color: "#0b1c30", fontSize: 27, fontWeight: "800", textAlign: "center" },
  successCard: { width: "100%", padding: 16, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1", gap: 5, marginVertical: 10 },
  successCardTitle: { color: "#06432f", fontWeight: "800", fontSize: 14 },
  successCardText: { color: "#536579", fontSize: 12, lineHeight: 18 },
});
