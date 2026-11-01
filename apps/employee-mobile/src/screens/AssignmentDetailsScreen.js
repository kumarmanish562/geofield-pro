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
      <Text style={{ color: "#17352f", fontSize: 24, fontWeight: "800" }}>
        {assignment.name}
      </Text>
      <Text style={{ color: "#71837a", marginTop: 10 }}>
        {assignment.description || "No description provided."}
      </Text>
      <Text style={{ color: "#28564b", marginTop: 22, fontWeight: "700" }}>
        Work area
      </Text>
      <Text style={{ color: "#71837a", marginTop: 5 }}>
        {assignment.workArea || "Not specified"}
      </Text>
      <Text style={{ color: "#28564b", marginTop: 22, fontWeight: "700" }}>
        Schedule
      </Text>
      <Text style={{ color: "#71837a", marginTop: 5 }}>
        {new Date(assignment.startDate).toLocaleDateString()} –{" "}
        {new Date(assignment.dueDate).toLocaleDateString()}
      </Text>
      <Text style={{ color: "#d26935", marginTop: 22, fontWeight: "800" }}>
        {assignment.status}
      </Text>
    </Screen>
  );
}
