import { EmptyState, Screen } from "../components/ui.js";

export function ReportsScreen() {
  return (
    <Screen>
      <EmptyState
        title="Reports unavailable"
        description="The current API does not expose report or survey list endpoints yet."
      />
    </Screen>
  );
}
