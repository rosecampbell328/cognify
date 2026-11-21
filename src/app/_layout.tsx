import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initAccount } from "@/lib/social/account";
import { ThemeProvider, useColors, useScheme } from "@/theme/theme";
import { fontAssets } from "@/theme/type";

// Connect to the Cognify account service, if configured (see README).
initAccount();

// Keep the splash screen up until the heading font has loaded.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || !!fontError; // on error, carry on with system fonts

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

/** Everything inside the theme, so it restyles when light/dark changes. */
function AppShell() {
  const colors = useColors();
  const scheme = useScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        {/* Dark status-bar text on light screens, light text on dark screens. */}
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-source" options={{ presentation: "modal" }} />
          <Stack.Screen name="create-chat" options={{ presentation: "modal" }} />
          <Stack.Screen name="course/[id]" />
          <Stack.Screen name="sign-in" options={{ presentation: "modal" }} />
          <Stack.Screen name="c/[id]" />
          <Stack.Screen name="u/[username]" />
          <Stack.Screen name="friends" />
          <Stack.Screen
            name="lesson/[courseId]/[lessonId]"
            options={{ presentation: "fullScreenModal", gestureEnabled: false, animation: "slide_from_bottom" }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
