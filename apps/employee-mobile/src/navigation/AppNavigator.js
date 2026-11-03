import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import { LoadingView } from "../components/ui.js";
import { AuthScreen } from "../screens/AuthScreen.js";
import { HomeScreen } from "../screens/HomeScreen.js";
import { AssignmentsScreen } from "../screens/AssignmentsScreen.js";
import { AssignmentFormScreen } from "../screens/AssignmentFormScreen.js";
import { MapScreen } from "../screens/MapScreen.js";
import { ReportsScreen } from "../screens/ReportsScreen.js";
import { CreateReportScreen } from "../screens/CreateReportScreen.js";
import { SurveyScreen } from "../screens/SurveyScreen.js";
import { AttendanceScreen } from "../screens/AttendanceScreen.js";
import { ProfileScreen } from "../screens/ProfileScreen.js";
import { SettingsScreen } from "../screens/SettingsScreen.js";
import { AssignmentDetailsScreen } from "../screens/AssignmentDetailsScreen.js";
import { ReportDetailsScreen } from "../screens/ReportDetailsScreen.js";
import { SyncDashboardScreen } from "../screens/SyncDashboardScreen.js";
import { SurveyReviewScreen } from "../screens/SurveyReviewScreen.js";
import { NotificationsScreen } from "../screens/NotificationsScreen.js";
import { getNotificationUnreadCount } from "../services/apiClient.js";
import { openNotificationTarget } from "./notificationNavigation.js";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function NotificationTabIcon({ focused }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await getNotificationUnreadCount();
        if (active) setCount(result.data.unreadCount);
      } catch (error) {
        console.warn("Unread notification count unavailable:", error.message);
      }
    };
    void refresh();
    const timer = setInterval(refresh, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{
          color: focused ? "#d26935" : "#71837a",
          fontSize: 11,
          fontWeight: "700",
        }}
      >
        ALERTS{count ? ` ${count > 99 ? "99+" : count}` : ""}
      </Text>
    </View>
  );
}

function TabIcon({ label, focused }) {
  return (
    <Text
      style={{
        color: focused ? "#d26935" : "#71837a",
        fontSize: 11,
        fontWeight: "700",
      }}
    >
      {label}
    </Text>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen
        name="OfflineSync"
        component={SyncDashboardScreen}
        options={{ title: "Offline sync" }}
      />
    </Stack.Navigator>
  );
}

function AssignmentsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Assignments" component={AssignmentsScreen} />
      <Stack.Screen
        name="AssignmentDetails"
        component={AssignmentDetailsScreen}
        options={{ title: "Assignment details" }}
      />
      <Stack.Screen
        name="AssignmentForm"
        component={AssignmentFormScreen}
        options={{ title: "Assignment form" }}
      />
    </Stack.Navigator>
  );
}

function MapStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Map" component={MapScreen} />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen
        name="ReportDetails"
        component={ReportDetailsScreen}
        options={{ title: "Report details" }}
      />
      <Stack.Screen
        name="CreateReport"
        component={CreateReportScreen}
        options={{ title: "Create report" }}
      />
      <Stack.Screen
        name="Survey"
        component={SurveyScreen}
        options={{ title: "Survey" }}
      />
      <Stack.Screen
        name="SurveyReview"
        component={SurveyReviewScreen}
        options={{ title: "Survey review" }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function NotificationsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notifications" }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#d26935",
        tabBarInactiveTintColor: "#71837a",
        tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 8 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="HOME" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="AssignmentsTab"
        component={AssignmentsStack}
        options={{
          title: "Assignments",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="WORK" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapStack}
        options={{
          title: "Map",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="MAP" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsStack}
        options={{
          title: "Reports",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="REPORTS" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStack}
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused }) => (
            <NotificationTabIcon focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="PROFILE" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const responseSubscription = useRef(null);
  const handlePushResponse = useCallback(
    (response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.eventType && navigationRef.isReady() && isAuthenticated)
        openNotificationTarget(navigationRef, data);
    },
    [isAuthenticated],
  );
  useEffect(() => {
    let mounted = true;
    import("expo-notifications")
      .then((Notifications) => {
        if (!mounted) return;
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });
        responseSubscription.current =
          Notifications.addNotificationResponseReceivedListener(
            handlePushResponse,
          );
      })
      .catch((error) =>
        console.warn(
          "Push notification support is unavailable:",
          error.message,
        ),
      );
    return () => {
      mounted = false;
      responseSubscription.current?.remove();
    };
  }, [handlePushResponse]);
  if (isLoading) return <LoadingView label="Restoring secure session..." />;
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        import("expo-notifications")
          .then((Notifications) =>
            Notifications.getLastNotificationResponseAsync().then(
              handlePushResponse,
            ),
          )
          .catch((error) =>
            console.warn(
              "Cold-start push response unavailable:",
              error.message,
            ),
          );
      }}
    >
      {isAuthenticated ? (
        <MainTabs />
      ) : (
        <Stack.Navigator>
          <Stack.Screen
            name="SignIn"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
