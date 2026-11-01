import { useCallback, useState } from "react";
import { FlatList, Pressable, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { EmptyState, LoadingView, Screen } from "../components/ui.js";
import { getMyAssignments } from "../services/apiClient.js";

export function AssignmentsScreen({ navigation }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyAssignments()
        .then((response) => active && setItems(response.data.items))
        .catch((reason) => active && setError(reason.message));
      return () => {
        active = false;
      };
    }, []),
  );
  if (!items && !error) return <LoadingView label="Loading assignments..." />;
  if (error)
    return (
      <Screen>
        <EmptyState title="Assignments unavailable" description={error} />
      </Screen>
    );
  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            title="No assignments yet"
            description="Published assignments will appear here."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("AssignmentDetails", { id: item.id })
            }
            style={{
              padding: 18,
              marginBottom: 12,
              borderRadius: 12,
              backgroundColor: "#fff",
            }}
          >
            <Text style={{ color: "#17352f", fontSize: 17, fontWeight: "700" }}>
              {item.name}
            </Text>
            <Text style={{ color: "#71837a", marginTop: 6 }}>
              {item.workArea || "Work area not specified"}
            </Text>
            <Text style={{ color: "#d26935", marginTop: 8, fontWeight: "700" }}>
              {item.status} · Due {new Date(item.dueDate).toLocaleDateString()}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
