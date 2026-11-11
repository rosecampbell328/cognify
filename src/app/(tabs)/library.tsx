import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, ChunkyButton, Heading, Icon, Muted } from "@/components/ui";
import { removeSource, useAppState } from "@/lib/store";
import type { Source } from "@/lib/types";
import { useCreateCourse } from "@/lib/useCreateCourse";
import { colors, palette } from "@/theme/colors";

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const sources = useAppState((s) => s.sources);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingHorizontal: 18, gap: 16 }}
    >
      <Heading>Library</Heading>
      <Muted>Everything you’ve uploaded. Turn any resource into a new course.</Muted>

      <ChunkyButton label="Add resource" icon="add" onPress={() => router.push("/add-source")} />

      {sources.length === 0 ? (
        <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
          <Icon name="doc" size={40} color={palette.softPeriwinkle} />
          <Muted style={{ textAlign: "center" }}>No resources yet. Paste some notes or upload a text file to get started.</Muted>
        </Card>
      ) : (
        sources.map((s) => <SourceRow key={s.id} source={s} />)
      )}
    </ScrollView>
  );
}

function SourceRow({ source }: { source: Source }) {
  const { create, busy } = useCreateCourse();
  const words = source.content.trim().split(/\s+/).length;

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={styles.iconBox}>
          <Icon name={source.kind === "file" ? "doc" : "paste"} size={22} color={palette.frozenLake} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {source.title}
          </Text>
          <Text style={styles.meta}>
            {words.toLocaleString()} words · {new Date(source.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Delete ${source.title}`}
          hitSlop={10}
          onPress={() => removeSource(source.id)}
        >
          <Icon name="trash" size={18} color={colors.textFaint} />
        </Pressable>
      </View>
      <Text style={styles.preview} numberOfLines={3}>
        {source.content.trim()}
      </Text>
      <ChunkyButton
        label="Make a course"
        icon="sparkles"
        color={colors.secondary}
        shadowColor={colors.secondaryShadow}
        loading={busy}
        onPress={() => create("", [source])}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "800" },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  preview: { color: colors.textFaint, fontSize: 14, lineHeight: 20 },
});
