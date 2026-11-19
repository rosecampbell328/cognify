import * as Linking from "expo-linking";
import { Platform, Share } from "react-native";

import { addCourse, getState, makeId, updateCourse } from "../store";
import type { Course } from "../types";
import { getAccount } from "./account";
import { requireSupabase } from "./client";
import type { PublicProfile, SharedCourseRow } from "./types";

/** Shared-course ids are 16 random hex characters, made by the database. */
export const SHARE_ID = /^[a-f0-9]{16}$/;

/**
 * The link people share. Uses EXPO_PUBLIC_SHARE_URL (your website, e.g.
 * https://cognify.app) when set. Otherwise: the current site on web, or a
 * development link that opens the app in Expo Go.
 */
export function shareLinkFor(sharedId: string) {
  const base = process.env.EXPO_PUBLIC_SHARE_URL;
  if (base) return `${base.replace(/\/+$/, "")}/c/${sharedId}`;
  if (Platform.OS === "web" && typeof window !== "undefined") return `${window.location.origin}/c/${sharedId}`;
  return Linking.createURL(`/c/${sharedId}`);
}

/** Upload (or refresh) a course so it can be opened from a link. Returns the share id. */
export async function publishCourse(course: Course): Promise<string> {
  const sb = requireSupabase();
  const me = getAccount().profile;
  if (!me) throw new Error("Sign in and pick a username to share courses.");

  const row = {
    title: course.title.slice(0, 200),
    emoji: course.emoji.slice(0, 16),
    description: course.description.slice(0, 1000),
    lesson_count: course.lessons.length,
    content: { lessons: course.lessons, generatedBy: course.generatedBy },
  };

  if (course.sharedId) {
    const { data, error } = await sb.from("shared_courses").update(row).eq("id", course.sharedId).select("id");
    if (error) throw new Error(`Couldn't update the shared course (${error.message}).`);
    if (data && data.length > 0) return course.sharedId;
    // The old share was deleted; fall through and share it fresh.
  }

  const { data, error } = await sb
    .from("shared_courses")
    .insert({ ...row, owner_id: me.id })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Couldn't share the course (${error?.message ?? "no id returned"}).`);
  updateCourse(course.id, { sharedId: data.id as string });
  return data.id as string;
}

/** Publish a course and open the system share sheet with its link. Returns the link. */
export async function shareCourse(course: Course): Promise<string> {
  const id = await publishCourse(course);
  const url = shareLinkFor(id);
  const message = `Learn “${course.title}” with me on Cognify: ${url}`;

  if (Platform.OS === "web") {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      await nav.share({ title: course.title, text: message, url }).catch(() => {});
    } else {
      await nav?.clipboard?.writeText(url).catch(() => {});
    }
    return url;
  }

  // iOS shows `url` as a rich link; Android only reads `message`.
  await Share.share(Platform.OS === "ios" ? { message: `Learn “${course.title}” with me on Cognify`, url } : { message });
  return url;
}

export type SharedCourse = { course: SharedCourseRow; owner: PublicProfile | null };

export async function fetchSharedCourse(sharedId: string): Promise<SharedCourse | null> {
  if (!SHARE_ID.test(sharedId)) return null;
  const sb = requireSupabase();
  const { data: course, error } = await sb.from("shared_courses").select("*").eq("id", sharedId).maybeSingle();
  if (error) throw new Error(`Couldn't load this course (${error.message}).`);
  if (!course) return null;
  const { data: owner } = await sb.from("profiles").select("*").eq("id", course.owner_id).maybeSingle();
  return { course: course as SharedCourseRow, owner: (owner as PublicProfile | null) ?? null };
}

/** The local copy of a shared course, if it's already in this library (yours or added). */
export function findLocalCopy(sharedId: string): Course | undefined {
  return getState().courses.find((c) => c.sharedId === sharedId || c.sharedFrom?.sharedId === sharedId);
}

/** Copy a shared course into the library. Progress starts fresh. Returns the new local course id. */
export function addSharedCourseToLibrary({ course, owner }: SharedCourse): string {
  const existing = findLocalCopy(course.id);
  if (existing) return existing.id;
  const local: Course = {
    id: makeId(),
    title: course.title,
    emoji: course.emoji,
    description: course.description,
    goal: "",
    sourceIds: [],
    lessons: course.content.lessons,
    createdAt: Date.now(),
    generatedBy: course.content.generatedBy ?? "ai",
    sharedFrom: {
      sharedId: course.id,
      username: owner?.username ?? "unknown",
      displayName: owner?.display_name ?? "",
      avatarUrl: owner?.avatar_url ?? null,
    },
  };
  addCourse(local);
  return local.id;
}
