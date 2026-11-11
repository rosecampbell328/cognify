import { Tabs } from "expo-router/js-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui";
import { colors } from "@/theme/colors";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.xp,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontWeight: "800", fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surfaceRaised,
          // Room for the bold label, plus the home-indicator area on notched phones.
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Learn", tabBarIcon: ({ color }) => <Icon name="learn" color={color} /> }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: "Library", tabBarIcon: ({ color }) => <Icon name="library" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <Icon name="profile" color={color} /> }}
      />
    </Tabs>
  );
}
