import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CreatedBy } from "@/components/CreatedBy";
import { LogoMark } from "@/components/LogoMark";
import { Button, Card, Eyebrow, Icon, Muted } from "@/components/ui";
import { socialEnabled } from "@/lib/social/client";
import {
  addSharedCourseToLibrary,
  fetchSharedCourse,
  findLocalCopy,
  type SharedCourse,
} from "@/lib/social/courses";
import { useAppState } from "@/lib/store";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/type";

/** Store links for the "Get the app" section on the web page (set once the app is listed). */
const APP_STORE_URL = process.env.EXPO_PUBLIC_APP_STORE_URL;
const PLAY_STORE_URL = process.env.EXPO_PUBLIC_PLAY_STORE_URL;

type Load = { state: "loading" } | { state: "missing" } | { state: "error"; message: string } | { state: "ok"; data: SharedCourse };

/** Phone browser without the app: which store to send them to, if it's listed yet. */
function storeForThisDevice(): string | undefined {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return undefined;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return APP_STORE_URL;
  if (/Android/i.test(ua)) return PLAY_STORE_URL;
  return undefined;
}

export default function SharedCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  // Re-render when the library changes, so "Add" turns into "Open" right away.
  const localCopyId = useAppState(() => (id ? findLocalCopy(id)?.id : undefined));

  useEffect(() => {
    // Opened in a phone's browser = the app isn't installed (otherwise the link opens the app).
    const store = storeForThisDevice();
    if (store) window.location.replace(store);
  }, []);

  useEffect(() => {
    if (!socialEnabled || !id) return;
    let cancelled = false;
    fetchSharedCourse(id)
      .then((data) => !cancelled && setLoad(data ? { state: "ok", data } : { state: "missing" }))
      .catch((e) => !cancelled && setLoad({ state: "error", message: e instanceof Error ? e.message : String(e) }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  function addToLibrary() {
    if (load.state !== "ok") return;
    const localId = addSharedCourseToLibrary(load.data);
    router.replace({ pathname: "/course/[id]", params: { id: localId } });
  }

  const openLocal = () => localCopyId && router.replace({ pathname: "/course/[id]", params: { id: localCopyId } });

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Close" hitSlop={12} onPress={close}>
          <Icon name="close" size={22} color={colors.textMuted} />
        </Pressable>
        <View style={styles.brand}>
          <LogoMark size={22} />
          <Text style={styles.brandText}>cognify</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 16 }}>
        {!socialEnabled ? (
          <Card style={{ gap: 8 }}>
            <Text style={styles.title}>Sharing isn’t set up yet</Text>
            <Muted>This copy of Cognify isn’t connected to Supabase, so shared courses can’t be opened.</Muted>
          </Card>
        ) : load.state === "loading" ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : load.state === "missing" ? (
          <Card style={{ gap: 8 }}>
            <Text style={styles.title}>Course not found</Text>
            <Muted>This link doesn’t point to a course anymore. The person who shared it may have removed it.</Muted>
          </Card>
        ) : load.state === "error" ? (
          <Card style={{ gap: 8 }}>
            <Text style={styles.title}>Couldn’t open this course</Text>
            <Muted>{load.message}</Muted>
          </Card>
        ) : (
          <>
            <View style={{ gap: 8 }}>
              <Text style={styles.emoji}>{load.data.course.emoji}</Text>
              <Eyebrow>Shared course · {load.data.course.lesson_count} lessons</Eyebrow>
              <Text style={styles.title}>{load.data.course.title}</Text>
              {load.data.course.description ? <Muted>{load.data.course.description}</Muted> : null}
              {load.data.owner ? (
                <CreatedBy
                  username={load.data.owner.username}
                  displayName={load.data.owner.display_name}
                  avatarUrl={load.data.owner.avatar_url}
                />
              ) : null}
            </View>

            {localCopyId ? (
              <Button label="Open in my library" icon="chevron" iconAfter onPress={openLocal} />
            ) : (
              <Button label="Add to my library" icon="add" onPress={addToLibrary} />
            )}

            <Card style={{ gap: 2, paddingVertical: 10 }}>
              <Eyebrow style={{ paddingVertical: 8 }}>What’s inside</Eyebrow>
              {load.data.course.content.lessons.map((lesson, i) => (
                <View key={i} style={[styles.lessonRow, i > 0 && styles.lessonDivider]}>
                  <Text style={styles.lessonNum}>{i + 1}</Text>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.lessonMeta}>{lesson.exercises.length} ex.</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {Platform.OS === "web" ? <GetTheApp sharedId={id} /> : null}
      </ScrollView>
    </View>
  );
}

/** Web only: for people opening the link without the app. */
function GetTheApp({ sharedId }: { sharedId?: string }) {
  const listed = APP_STORE_URL || PLAY_STORE_URL;
  return (
    <Card style={{ gap: 10, backgroundColor: colors.surfaceWarmLight, borderColor: colors.surfaceWarm }}>
      <Text style={styles.getTitle}>Learn this on your phone</Text>
      <Muted>
        {listed
          ? "Get Cognify to add this course and practise it anywhere."
          : "Cognify is coming soon to the App Store and Google Play."}
      </Muted>
      {APP_STORE_URL ? <Button label="Download on the App Store" onPress={() => Linking.openURL(APP_STORE_URL)} /> : null}
      {PLAY_STORE_URL ? (
        <Button label="Get it on Google Play" variant="outline" onPress={() => Linking.openURL(PLAY_STORE_URL)} />
      ) : null}
      {sharedId ? (
        <Pressable onPress={() => Linking.openURL(`cognify://c/${sharedId}`)} hitSlop={8}>
          <Text style={styles.openApp}>Already have the app? Open it there</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandText: { color: colors.primary, fontFamily: fonts.display, fontSize: 18 },
  center: { paddingVertical: 60, alignItems: "center" },
  emoji: { fontSize: 40 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  lessonDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  lessonNum: { width: 22, color: colors.textFaint, fontWeight: "700", fontVariant: ["tabular-nums"] },
  lessonTitle: { flex: 1, color: colors.text, fontFamily: fonts.displayMedium, fontSize: 16 },
  lessonMeta: { color: colors.textFaint, fontSize: 13 },
  getTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 19 },
  openApp: { color: colors.primary, fontWeight: "700", textAlign: "center", marginTop: 4 },
});
