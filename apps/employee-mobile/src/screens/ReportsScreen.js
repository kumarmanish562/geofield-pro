import { EmptyState, Screen, Button } from "../components/ui.js";

export function ReportsScreen({ navigation }) {
  return (
    <Screen>
      <Button onPress={() => navigation.navigate("Survey")}>Open field surveys</Button>
      <EmptyState
        title="Reports"
        description="Survey collection is available from the action above."
      />
    </Screen>
  );
}
