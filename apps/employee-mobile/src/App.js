import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import {
  acceptInvitation,
  login,
  logout,
  recoverPassword,
  resetPassword,
  restoreSession,
} from "./api.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState("login");

  useEffect(() => {
    restoreSession()
      .then(setUser)
      .catch(() => {});
  }, []);

  async function submit() {
    try {
      setNotice("");
      if (mode === "forgot") {
        const response = await recoverPassword(email);
        setNotice(response.data.message);
      } else if (mode === "reset") {
        const response = await resetPassword(token, password);
        setNotice(response.data.message);
        setMode("login");
      } else if (mode === "invite") {
        setUser(await acceptInvitation(token, email, password));
      } else {
        setUser(await login(email, password));
      }
    } catch (error) {
      setNotice(error.message);
    }
  }

  if (user) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Text style={styles.eyebrow}>GeoField Pro</Text>
        <Text style={styles.title}>Welcome, {user.name}.</Text>
        <Text style={styles.body}>Your field session is ready.</Text>
        <Text
          style={styles.button}
          onPress={async () => {
            await logout();
            setUser(null);
          }}
        >
          Sign out
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.eyebrow}>GeoField Pro</Text>
      <Text style={styles.title}>
        {mode === "login"
          ? "Sign in to your field day."
          : mode === "forgot"
            ? "Recover your password."
            : mode === "reset"
              ? "Choose a new password."
              : "Accept your invitation."}
      </Text>
      <TextInput
        style={styles.input}
        placeholder={mode === "invite" ? "Your name" : "Email"}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      {mode !== "forgot" ? (
        <TextInput
          style={styles.input}
          placeholder={
            mode === "invite" || mode === "reset" ? "New password" : "Password"
          }
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      ) : null}
      {mode === "reset" || mode === "invite" ? (
        <TextInput
          style={styles.input}
          placeholder="Invitation or reset token"
          value={token}
          onChangeText={setToken}
        />
      ) : null}
      {notice ? <Text style={styles.error}>{notice}</Text> : null}
      <Text style={styles.button} onPress={submit}>
        {mode === "login" ? "Sign in" : "Continue"}
      </Text>
      <Text style={styles.link} onPress={() => setMode("forgot")}>
        Forgot password
      </Text>
      <Text style={styles.link} onPress={() => setMode("reset")}>
        Reset password
      </Text>
      <Text style={styles.link} onPress={() => setMode("invite")}>
        Accept invitation
      </Text>
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
  input: {
    marginTop: 14,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  button: {
    marginTop: 20,
    padding: 14,
    borderRadius: 8,
    color: "#ffffff",
    backgroundColor: "#17352f",
    textAlign: "center",
    fontWeight: "700",
  },
  error: {
    marginTop: 12,
    color: "#b43e35",
  },
  link: {
    marginTop: 14,
    color: "#d26935",
    textAlign: "center",
  },
});
