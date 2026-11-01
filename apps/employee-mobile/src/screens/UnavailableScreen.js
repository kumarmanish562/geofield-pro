import { EmptyState, Screen } from "../components/ui.js";
export function UnavailableScreen({ title, description }) {
  return (
    <Screen>
      <EmptyState title={title} description={description} />
    </Screen>
  );
}
