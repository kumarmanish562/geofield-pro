import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Text, View } from "react-native";
import {
  Button,
  EmptyState,
  Field,
  LoadingView,
  Screen,
  styles,
} from "../components/ui.js";
import { useNetwork } from "../context/NetworkContext.js";
import {
  getAttendanceCurrent,
  getPendingAttendanceEvents,
  getAttendanceHistory,
  queueAttendanceEvent,
  requestAttendanceCorrection,
  submitAttendanceEvent,
  synchronizeAttendanceEvents,
} from "../services/apiClient.js";

export function AttendanceScreen() {
  const online = useNetwork();
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [correction, setCorrection] = useState(null);
  const [reason, setReason] = useState("");
  const load = useCallback(async () => {
    try {
      const [currentResponse, historyResponse, queued] = await Promise.all([
        getAttendanceCurrent(),
        getAttendanceHistory(),
        getPendingAttendanceEvents(),
      ]);
      setCurrent(currentResponse.data);
      setHistory(historyResponse.data.items);
      setPending(queued.length);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);
  useEffect(() => {
    if (!online) return;
    synchronizeAttendanceEvents()
      .then(load)
      .catch(() => {});
  }, [online, load]);
  async function action(type) {
    setWorking(true);
    try {
      if (!online) {
        const count = await queueAttendanceEvent(type);
        setPending(count);
        Alert.alert(
          "Saved offline",
          "This event is pending synchronization and is not server-confirmed.",
        );
      } else {
        await submitAttendanceEvent(type);
        await load();
      }
      async function submitCorrection() {
        if (!correction || reason.trim().length < 10) {
          Alert.alert(
            "Reason required",
            "Please provide at least 10 characters.",
          );
          return;
        }
        try {
          await requestAttendanceCorrection(correction.id, {
            requestedCheckInAt: correction.checkedInAt ?? undefined,
            requestedCheckOutAt: correction.checkedOutAt ?? undefined,
            reason: reason.trim(),
          });
          setCorrection(null);
          setReason("");
          Alert.alert(
            "Submitted",
            "Your correction request is pending review.",
          );
        } catch (error) {
          Alert.alert("Correction failed", error.message);
        }
      }
    } catch (error) {
      if (error.code === "NETWORK_ERROR") {
        const count = await queueAttendanceEvent(type);
        setPending(count);
        Alert.alert(
          "Saved offline",
          "The event will synchronize when connectivity returns.",
        );
      } else Alert.alert("Attendance failed", error.message);
    } finally {
      setWorking(false);
    }
  }
  if (loading) return <LoadingView label="Loading attendance..." />;
  const nextAction = !current
    ? ["CHECK_IN", "Check in"]
    : current.status === "WORKING"
      ? ["BREAK_START", "Start break"]
      : current.status === "ON_BREAK"
        ? ["BREAK_END", "End break"]
        : null;
  return (
    <Screen>
      <Text style={{ color: "#17352f", fontSize: 26, fontWeight: "800" }}>
        Today&apos;s attendance
      </Text>
      <Text style={{ color: "#71837a", marginTop: 8 }}>
        {online ? "Online" : "Offline"} · {pending} pending event
        {pending === 1 ? "" : "s"}
      </Text>
      {current ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 18,
            marginVertical: 22,
          }}
        >
          <Text style={{ color: "#d26935", fontWeight: "800" }}>
            {current.status}
          </Text>
          <Text style={{ color: "#71837a", marginTop: 8 }}>
            Checked in {new Date(current.checkedInAt).toLocaleTimeString()}
          </Text>
          <Text style={{ color: "#71837a", marginTop: 5 }}>
            Break: {Math.floor(current.totalBreakSeconds / 60)} minutes
          </Text>
        </View>
      ) : (
        <EmptyState
          title="Not checked in"
          description="Start your attendance session when you begin work."
        />
      )}
      {nextAction && (
        <Button loading={working} onPress={() => action(nextAction[0])}>
          {nextAction[1]}
        </Button>
      )}
      {current?.status === "WORKING" && (
        <View style={{ marginTop: 12 }}>
          <Button
            variant="secondary"
            loading={working}
            onPress={() => action("CHECK_OUT")}
          >
            Check out
          </Button>
        </View>
      )}
      <Text
        style={{
          color: "#17352f",
          fontSize: 18,
          fontWeight: "800",
          marginTop: 28,
          marginBottom: 10,
        }}
      >
        Recent history
      </Text>
      {history.slice(0, 5).map((item) => (
        <View
          key={item.id}
          style={{
            backgroundColor: "#fff",
            padding: 14,
            borderRadius: 9,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: "#28564b", fontWeight: "700" }}>
            {new Date(item.attendanceDate).toLocaleDateString()} · {item.status}
          </Text>
          <Text style={styles.muted}>
            {item.checkedInAt
              ? new Date(item.checkedInAt).toLocaleTimeString()
              : "No check-in"}
            {item.checkedOutAt
              ? ` – ${new Date(item.checkedOutAt).toLocaleTimeString()}`
              : ""}
          </Text>
          {item.status === "COMPLETED" && (
            <Text
              onPress={() => setCorrection(item)}
              style={{ color: "#d26935", marginTop: 8, fontWeight: "700" }}
            >
              Request correction
            </Text>
          )}
        </View>
      ))}
      <Modal
        visible={Boolean(correction)}
        transparent
        animationType="slide"
        onRequestClose={() => setCorrection(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,.3)",
          }}
        >
          <View
            style={{
              backgroundColor: "#f5f7f3",
              padding: 22,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
          >
            <Text
              style={{
                color: "#17352f",
                fontSize: 20,
                fontWeight: "800",
                marginBottom: 16,
              }}
            >
              Request correction
            </Text>
            <Field
              label="Reason"
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="Explain what should be corrected"
            />
            <Button onPress={submitCorrection}>Submit request</Button>
            <View style={{ marginTop: 10 }}>
              <Button variant="secondary" onPress={() => setCorrection(null)}>
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
