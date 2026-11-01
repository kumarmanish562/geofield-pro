import { Text, View } from "react-native";
import { Button, styles } from "./ui.js";

export function ErrorView({ message, onRetry }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry && <Button onPress={onRetry}>Try again</Button>}
    </View>
  );
}
