import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Screen } from "../components/ui.js";

const features = [
  ["01", "Assigned fieldwork", "See the assignments and villages connected to your account."],
  ["02", "Record on site", "Capture survey details and location only when permitted."],
  ["03", "Keep working offline", "Save field changes locally and sync them when a connection returns."],
];

export function WelcomeScreen({ navigation, onContinue }) {
  function continueToSignIn(mode) {
    onContinue?.();
    navigation.replace("SignIn", mode ? { mode } : undefined);
  }
  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoText}>GF</Text></View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>GeoField Pro</Text>
            <Text style={styles.brandMeta}>EMPLOYEE FIELD APP</Text>
          </View>
          <Text style={styles.version}>FIELD</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.liveDot} />
            <Text style={styles.heroTag}>FIELD WORKSPACE</Text>
          </View>
          <View style={[styles.contour, styles.contourOne]} />
          <View style={[styles.contour, styles.contourTwo]} />
          <View style={styles.targetOuter}><View style={styles.targetInner}><Text style={styles.targetGlyph}>⌖</Text></View></View>
          <Text style={styles.heroTitle}>Precise work,{ "\n" }where the field takes you.</Text>
          <Text style={styles.heroDescription}>Your assignments, surveys, and field updates in one place.</Text>
          <Text style={styles.heroFoot}>ASSIGNED WORK  ·  FIELD NOTES  ·  OFFLINE SYNC</Text>
        </View>

        <View style={styles.featureList}>
          {features.map(([number, title, description]) => (
            <View style={styles.featureRow} key={number}>
              <Text style={styles.featureNumber}>{number}</Text>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDescription}>{description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyIcon}>⌖</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>Location with clear boundaries</Text>
            <Text style={styles.privacyCopy}>Location updates are limited to an authorized active work session.</Text>
          </View>
        </View>

        <Button onPress={() => continueToSignIn()}>Continue to sign in  →</Button>
        <Pressable
          accessibilityRole="button"
          onPress={() => continueToSignIn("invite")}
          style={styles.inviteLink}
        >
          <Text style={styles.inviteText}>Have an invitation?  Accept invitation</Text>
        </Pressable>
        <Text style={styles.footer}>GeoField Pro · Employee workspace</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: "#f4f6ff" },
  content: { padding: 20, paddingTop: 14, paddingBottom: 28, gap: 17 },
  brandRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#06432f", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  brandCopy: { flex: 1 },
  brandName: { color: "#0b1c30", fontSize: 17, fontWeight: "800" },
  brandMeta: { color: "#087c72", fontFamily: "monospace", fontSize: 9, fontWeight: "700", letterSpacing: 1.1, marginTop: 3 },
  version: { color: "#075f55", backgroundColor: "#d7f8f1", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, fontFamily: "monospace", fontSize: 9, fontWeight: "700" },
  hero: { minHeight: 330, overflow: "hidden", justifyContent: "flex-end", borderRadius: 18, backgroundColor: "#06432f", padding: 20 },
  heroTop: { position: "absolute", top: 16, left: 17, flexDirection: "row", alignItems: "center", gap: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#30c5a7" },
  heroTag: { color: "#baf2e5", fontSize: 9, letterSpacing: 1.3, fontWeight: "900" },
  contour: { position: "absolute", borderWidth: 1, borderColor: "rgba(135,240,221,.24)", borderRadius: 999 },
  contourOne: { width: 330, height: 220, right: -105, top: 36, transform: [{ rotate: "-23deg" }] },
  contourTwo: { width: 250, height: 180, right: -48, top: 62, transform: [{ rotate: "-23deg" }] },
  targetOuter: { position: "absolute", right: 24, top: 66, width: 118, height: 118, borderWidth: 1, borderColor: "rgba(135,240,221,.38)", borderRadius: 59, alignItems: "center", justifyContent: "center" },
  targetInner: { width: 72, height: 72, borderWidth: 2, borderColor: "#30c5a7", borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(3,41,29,.55)" },
  targetGlyph: { color: "#87f0dd", fontSize: 38, fontWeight: "400" },
  heroTitle: { color: "#fff", fontSize: 27, lineHeight: 34, fontWeight: "800", marginTop: 170 },
  heroDescription: { color: "#d5e9df", fontSize: 13, lineHeight: 20, marginTop: 7 },
  heroFoot: { color: "#baf2e5", fontFamily: "monospace", fontSize: 8, letterSpacing: 0.5, marginTop: 15 },
  featureList: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e0e7f1", paddingHorizontal: 15 },
  featureRow: { flexDirection: "row", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#e8edf5" },
  featureNumber: { color: "#087c72", fontFamily: "monospace", fontSize: 11, fontWeight: "800", marginTop: 2 },
  featureCopy: { flex: 1, gap: 3 },
  featureTitle: { color: "#0b1c30", fontSize: 13, fontWeight: "800" },
  featureDescription: { color: "#536579", fontSize: 11, lineHeight: 16 },
  privacyCard: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 14, backgroundColor: "#edf3ff", padding: 14 },
  privacyIcon: { color: "#087c72", fontSize: 22, fontWeight: "800" },
  privacyTitle: { color: "#06432f", fontSize: 12, fontWeight: "800" },
  privacyCopy: { color: "#536579", fontSize: 11, lineHeight: 16, marginTop: 3 },
  inviteLink: { minHeight: 42, justifyContent: "center", alignItems: "center" },
  inviteText: { color: "#087c72", fontWeight: "800", fontSize: 12 },
  footer: { color: "#718096", fontFamily: "monospace", fontSize: 9, textAlign: "center", marginTop: 2 },
});
