import { UnavailableScreen } from "./UnavailableScreen.js";

export function MapScreen() {
  return (
    <UnavailableScreen
      title="Map unavailable"
      description="A configured map provider and backend location data are required before location permission is requested."
    />
  );
}
