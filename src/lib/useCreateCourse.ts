import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform } from "react-native";

import { generateCourse } from "./generateCourse";
import { addCourse } from "./store";
import type { Source } from "./types";

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    // Alert.alert is a no-op on web
    globalThis.alert?.(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

/** Shared "turn these sources into a course" flow used by several screens. */
export function useCreateCourse() {
  const [busy, setBusy] = useState(false);

  async function create(goal: string, sources: Source[], opts: { replace?: boolean } = {}) {
    if (busy) return;
    setBusy(true);
    try {
      const { course, notice } = await generateCourse(goal, sources);
      addCourse(course);
      const go = opts.replace ? router.replace : router.push;
      go({ pathname: "/course/[id]", params: { id: course.id } });
      if (notice) notify("Offline draft", notice);
    } catch (e) {
      notify("Couldn't build a course", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return { create, busy };
}
