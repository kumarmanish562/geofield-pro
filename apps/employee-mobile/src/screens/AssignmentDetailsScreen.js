import { useEffect, useState } from "react";
import { Text } from "react-native";
import { EmptyState, LoadingView, Screen } from "../components/ui.js";
import { getMyAssignment } from "../services/apiClient.js";

export function AssignmentDetailsScreen({ route }) {
  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getMyAssignment(route.params.id)
      .then((response) => setAssignment(response.data))
      .catch((reason) => setError(reason.message));
  }, [route.params.id]);
  if (!assignment && !error)
    return <LoadingView label="Loading assignment..." />;
  if (error)
    return (
      <Screen>
        <EmptyState title="Assignment unavailable" description={error} />
      </Screen>
    );
  return (
    <Screen>
      <Text style={{ color: "#06432f", fontSize: 24, fontWeight: "800" }}>
        {assignment.name}
      </Text>
      <Text style={{ color: "#536579", marginTop: 10 }}>
        {assignment.description || "No description provided."}
      </Text>
      <Text style={{ color: "#087c72", marginTop: 22, fontWeight: "700" }}>
        Work area
      </Text>
      <Text style={{ color: "#536579", marginTop: 5 }}>
        {assignment.workArea || "Not specified"}
      </Text>
      <Text style={{ color: "#087c72", marginTop: 22, fontWeight: "700" }}>
        Schedule
      </Text>
      <Text style={{ color: "#536579", marginTop: 5 }}>
        {new Date(assignment.startDate).toLocaleDateString()} –{" "}
        {new Date(assignment.dueDate).toLocaleDateString()}
      </Text>
      <Text style={{ color: "#087c72", marginTop: 22, fontWeight: "800" }}>
        {assignment.status}
      </Text>
    </Screen>
  );
}
