import type { Session } from "@supabase/supabase-js";
import { requireOptionalNativeModule } from "expo";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import { kv } from "../kv";
import { dayKey, getState, liveStreak, setProfileName, subscribe as subscribeToApp } from "../store";
import { requireSupabase, socialEnabled, supabase } from "./client";
import { UNIQUE_VIOLATION, USERNAME_RULE, type PublicProfile } from "./types";

/**
 * The signed-in Cognify account: session, public profile, and syncing the
 * learner's name, photo and stats up to their profile so friends and people
 * opening their shared courses see them.
 */
type AccountState = {
  /** False until we know whether someone is signed in. */
  ready: boolean;
  session: Session | null;
  /** Null when signed out, or signed in but no username chosen yet. */
  profile: PublicProfile | null;
};

let account: AccountState = { ready: !socialEnabled, session: null, profile: null };
const listeners = new Set<() => void>();

function setAccount(patch: Partial<AccountState>) {
  account = { ...account, ...patch };
  listeners.forEach((l) => l());
}

export function useAccount<T>(selector: (a: AccountState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(account),
    () => selector(account),
  );
}

export function getAccount() {
  return account;
}

export function myUserId() {
  return account.session?.user.id ?? null;
}

// ── Start-up ─────────────────────────────────────────────

let started = false;

/** Call once at app start. Safe to call when social features are off. */
export function initAccount() {
  if (started || !supabase) return;
  started = true;

  supabase.auth.getSession().then(({ data }) => {
    setAccount({ session: data.session });
    if (data.session) loadMyProfile().finally(() => setAccount({ ready: true }));
    else setAccount({ ready: true });
  });

  supabase.auth.onAuthStateChange((event, session) => {
    setAccount({ session });
    if (!session) {
      setAccount({ profile: null });
      return;
    }
    // Don't await Supabase calls inside this callback (the library can deadlock); defer instead.
    if (event === "SIGNED_IN") setTimeout(() => void loadMyProfile(), 0);
  });

  // Push name / photo / stats changes to the profile, a moment after they happen.
  let timer: ReturnType<typeof setTimeout> | undefined;
  subscribeToApp(() => {
    clearTimeout(timer);
    timer = setTimeout(() => void syncMyProfile(), 1500);
  });
}

export async function loadMyProfile() {
  const sb = requireSupabase();
  const uid = myUserId();
  if (!uid) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", uid).maybeSingle();
  if (error) throw new Error(`Couldn't load your profile (${error.message}).`);
  setAccount({ profile: (data as PublicProfile | null) ?? null });
  if (data) void syncMyProfile();
  return data as PublicProfile | null;
}

// ── Sign in / out ────────────────────────────────────────

const friendly = (e: { message?: string } | null | undefined, fallback: string) =>
  e?.message ? `${fallback} (${e.message})` : fallback;

export async function sendSignInCode(email: string) {
  const { error } = await requireSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(friendly(error, "Couldn't send the code"));
}

export async function verifySignInCode(email: string, code: string) {
  const { data, error } = await requireSupabase().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: "email",
  });
  if (error || !data.session) throw new Error("That code didn't work. Check it, or send a new one.");
  setAccount({ session: data.session });
  return loadMyProfile();
}

export async function signOut() {
  await supabase?.auth.signOut();
  setAccount({ session: null, profile: null });
}

// ── Username ─────────────────────────────────────────────

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function usernameProblem(username: string): string | null {
  if (username.length < 3) return "Use at least 3 characters.";
  if (username.length > 20) return "Use 20 characters or fewer.";
  if (!USERNAME_RULE.test(username)) return "Use only lowercase letters, numbers and _.";
  return null;
}

/** A starting suggestion from the learner's name, e.g. "Rose Campbell" → "rosecampbell". */
export function suggestUsername(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  return base.length >= 3 ? base : "";
}

export async function createProfile(rawUsername: string, displayName: string) {
  const sb = requireSupabase();
  const uid = myUserId();
  if (!uid) throw new Error("Sign in first.");
  const username = normalizeUsername(rawUsername);
  const problem = usernameProblem(username);
  if (problem) throw new Error(problem);
  const name = displayName.trim().slice(0, 40);
  if (!name) throw new Error("Add your name.");
  setProfileName(name); // keep the phone's profile in step with the public one

  const { data, error } = await sb
    .from("profiles")
    .insert({ id: uid, username, display_name: name, ...localStats() })
    .select("*")
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error(`@${username} is taken. Try another.`);
    throw new Error(friendly(error, "Couldn't create your profile"));
  }
  setAccount({ profile: data as PublicProfile });
  await syncMyProfile();
  return data as PublicProfile;
}

// ── Keeping the public profile up to date ────────────────

function localStats() {
  const { progress, courses } = getState();
  return {
    streak: liveStreak(progress),
    last_active_day: progress.lastActiveDay,
    total_xp: progress.xp,
    lessons_done: Object.keys(progress.completed).length,
    courses_count: courses.length,
  };
}

const AVATAR_SYNCED_KEY = "cognify.avatarSynced";
let syncing = false;

/** Push the local name, photo and stats to the public profile if they changed. */
export async function syncMyProfile() {
  const sb = supabase;
  const { profile, session } = account;
  if (!sb || !profile || !session || syncing) return;
  syncing = true;
  try {
    const local = getState().profile;
    const patch: Partial<PublicProfile> = {};
    if (local.name !== profile.display_name) patch.display_name = local.name;
    const stats = localStats();
    for (const [k, v] of Object.entries(stats) as [keyof typeof stats, never][]) {
      if (profile[k] !== v) (patch as Record<string, unknown>)[k] = v;
    }

    // Photo: upload when it changed since the last sync, clear when removed.
    const syncedFor = kv.get(AVATAR_SYNCED_KEY);
    if ((local.avatarUri ?? "") !== (syncedFor ?? "")) {
      patch.avatar_url = local.avatarUri ? await uploadAvatar(session.user.id, local.avatarUri) : null;
      kv.set(AVATAR_SYNCED_KEY, local.avatarUri ?? "");
    }

    if (Object.keys(patch).length === 0) return;
    const { data, error } = await sb.from("profiles").update(patch).eq("id", profile.id).select("*").single();
    if (!error && data) setAccount({ profile: data as PublicProfile });
  } catch {
    // Offline or a temporary error: the next change will try again.
  } finally {
    syncing = false;
  }
}

async function uploadAvatar(uid: string, localUri: string): Promise<string> {
  const sb = requireSupabase();
  let bytes: ArrayBuffer | Uint8Array;
  let contentType = "image/jpeg";
  if (Platform.OS === "web" || localUri.startsWith("data:")) {
    const res = await fetch(localUri);
    contentType = res.headers.get("content-type") || localUri.match(/^data:([^;]+)/)?.[1] || contentType;
    bytes = await res.arrayBuffer();
  } else if (requireOptionalNativeModule("FileSystem")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File } = require("expo-file-system") as typeof import("expo-file-system");
    bytes = await new File(localUri).bytes();
  } else {
    bytes = await (await fetch(localUri)).arrayBuffer();
  }
  const path = `${uid}/avatar`;
  const { error } = await sb.storage.from("avatars").upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  const { data } = sb.storage.from("avatars").getPublicUrl(path);
  // Same file path each time, so add a version to make phones fetch the new photo.
  return `${data.publicUrl}?v=${Date.now()}`;
}

// ── Showing other people's streaks ───────────────────────

/** A profile's streak as of today (0 if they skipped a whole day), same rule as your own. */
export function profileStreak(p: Pick<PublicProfile, "streak" | "last_active_day">) {
  if (!p.last_active_day) return 0;
  const days = Math.round(
    (new Date(`${dayKey()}T00:00:00`).getTime() - new Date(`${p.last_active_day}T00:00:00`).getTime()) / 86_400_000,
  );
  return days > 1 ? 0 : p.streak;
}
