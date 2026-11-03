import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button, EmptyState, LoadingView, Screen } from "../components/ui.js";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerPushDevice,
} from "../services/apiClient.js";
import { openNotificationTarget } from "../navigation/notificationNavigation.js";
import { NotificationCategory } from "@geofield/shared-constants";

const categoryFor = (type = "") =>
  type.startsWith("ASSIGNMENT_")
    ? NotificationCategory.ASSIGNMENT
    : type.startsWith("SURVEY_")
      ? NotificationCategory.SURVEY
      : type.startsWith("ATTENDANCE_")
        ? NotificationCategory.ATTENDANCE
        : type.startsWith("SYNC_")
          ? NotificationCategory.SYNC
          : NotificationCategory.SYSTEM;

export function NotificationsScreen({ navigation }) {
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pushBusy, setPushBusy] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      } else setLoading(true);
      setError("");
      try {
        const response = await getNotifications({
          page: refresh ? 1 : page,
          pageSize: 20,
          unreadOnly: tab === "unread",
          readOnly: tab === "read",
        });
        const data = response.data;
        setItems((current) =>
          refresh || page === 1
            ? data.notifications
            : [...current, ...data.notifications],
        );
        setUnreadCount(data.unreadCount);
        setTotalPages(data.pagination.totalPages);
      } catch (reason) {
        setError(reason.message ?? "Notifications could not be loaded.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, tab],
  );

  useFocusEffect(
    useCallback(() => {
      void load(true);
    }, [tab]),
  );
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => void load(true), 60000);
      return () => clearInterval(timer);
    }, [load]),
  );
  useEffect(() => {
    let active = true;
    let listener;
    async function syncExistingPermission() {
      try {
        const Notifications = await import("expo-notifications");
        const Device = await import("expo-device");
        if (
          !Device.isDevice ||
          (await Notifications.getPermissionsAsync()).status !== "granted"
        )
          return;
        if (Device.osName?.toLowerCase() === "android")
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        const refreshToken = async () => {
          const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
          const result = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined,
          );
          if (active)
            await registerPushDevice(
              result.data,
              Device.osName?.toLowerCase() === "ios" ? "ios" : "android",
              Device.deviceName ?? undefined,
            );
        };
        await refreshToken();
        listener = Notifications.addPushTokenListener(() => {
          void refreshToken().catch((reason) =>
            console.warn("Expo token refresh failed:", reason.message),
          );
        });
      } catch (reason) {
        console.warn(
          "Existing push permission could not be synchronized:",
          reason.message,
        );
      }
    }
    void syncExistingPermission();
    return () => {
      active = false;
      listener?.remove();
    };
  }, []);

  async function open(item) {
    try {
      if (!item.readAt) {
        await markNotificationRead(item.id);
        setUnreadCount((count) => Math.max(0, count - 1));
        setItems((rows) =>
          rows.map((row) =>
            row.id === item.id
              ? { ...row, readAt: new Date().toISOString() }
              : row,
          ),
        );
      }
    } catch {
      Alert.alert(
        "Could not update",
        "This notification could not be marked as read.",
      );
      return;
    }
    openNotificationTarget(navigation, item);
  }

  async function markAll() {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((rows) =>
        rows.map((row) => ({
          ...row,
          readAt: row.readAt ?? new Date().toISOString(),
        })),
      );
    } catch {
      Alert.alert(
        "Could not update",
        "Notifications could not be marked as read.",
      );
    }
  }

  async function enablePush() {
    setPushBusy(true);
    try {
      const Notifications = await import("expo-notifications");
      const Device = await import("expo-device");
      if (!Device.isDevice) {
        Alert.alert(
          "Physical device required",
          "Push notifications are available on a physical device.",
        );
        return;
      }
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== "granted")
        permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission not enabled",
          "Enable notifications in your device settings to receive push updates.",
        );
        return;
      }
      if (Device.osName?.toLowerCase() === "android")
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      await registerPushDevice(
        tokenResult.data,
        Device.osName?.toLowerCase() === "ios" ? "ios" : "android",
        Device.deviceName ?? undefined,
      );
      Alert.alert(
        "Push enabled",
        "This device is registered for push notifications.",
      );
    } catch (reason) {
      Alert.alert(
        "Push unavailable",
        reason.message ?? "Push registration could not be completed.",
      );
    } finally {
      setPushBusy(false);
    }
  }

  const visible = items;
  if (loading && !items.length)
    return <LoadingView label="Loading notifications…" />;
  return (
    <Screen style={{ padding: 0 }}>
      <View style={{ padding: 20, gap: 12, flex: 1 }}>
        <Text style={{ color: "#17352f", fontSize: 24, fontWeight: "800" }}>
          Notifications
        </Text>
        <Text style={{ color: "#71837a" }}>{unreadCount} unread</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            variant={tab === "all" ? "primary" : "secondary"}
            onPress={() => {
              setTab("all");
              setPage(1);
            }}
          >
            All
          </Button>
          <Button
            variant={tab === "unread" ? "primary" : "secondary"}
            onPress={() => {
              setTab("unread");
              setPage(1);
            }}
          >
            Unread
          </Button>
          <Button
            variant={tab === "read" ? "primary" : "secondary"}
            onPress={() => {
              setTab("read");
              setPage(1);
            }}
          >
            Read
          </Button>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button variant="secondary" onPress={markAll}>
            Mark all read
          </Button>
          <Button variant="secondary" loading={pushBusy} onPress={enablePush}>
            Enable push
          </Button>
        </View>
        {error ? (
          <View>
            <EmptyState
              title="Could not load notifications"
              description={error}
            />
            <Button variant="secondary" onPress={() => load(true)}>
              Try again
            </Button>
          </View>
        ) : null}
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />
          }
          onEndReached={() => {
            if (!loading && page < totalPages) setPage((value) => value + 1);
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            !loading && !error ? (
              <EmptyState
                title="You're all caught up"
                description="New field and review updates will appear here."
              />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              style={{
                padding: 14,
                borderRadius: 10,
                backgroundColor: item.readAt ? "#fff" : "#eaf1e8",
                marginBottom: 9,
                gap: 5,
              }}
            >
              <Text
                style={{ color: "#d26935", fontSize: 11, fontWeight: "800" }}
              >
                {categoryFor(item.eventType)} {item.readAt ? "" : "· UNREAD"}
              </Text>
              <Text
                style={{ color: "#17352f", fontSize: 15, fontWeight: "800" }}
              >
                {item.title}
              </Text>
              <Text style={{ color: "#536960", lineHeight: 20 }}>
                {item.body}
              </Text>
              <Text style={{ color: "#8a9b92", fontSize: 11 }}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </Pressable>
          )}
        />
        {loading && items.length > 0 ? (
          <Text style={{ textAlign: "center", color: "#71837a" }}>
            Loading more…
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
