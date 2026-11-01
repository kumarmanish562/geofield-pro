import { EmptyState, Screen } from "../components/ui.js";

export function AssignmentsScreen() {
  return (
    <Screen>
      <EmptyState
        title="Assignments unavailable"
        description="The current API does not expose assignment list or status endpoints yet."
      />
    </Screen>
  );
}
