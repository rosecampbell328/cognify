import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { kv } from "../kv";

/**
 * Supabase connection for accounts, sharing and friends.
 *
 * Set these in .env.local (see README → "Turn on sharing and friends"):
 *   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable / anon key>
 * The anon (publishable) key is safe to ship in the app: the database's
 * Row Level Security rules decide what each person can read or change.
 * Without them, social features stay off and the rest of the app works as before.
 */
// Read each variable directly: Expo only inlines `process.env.EXPO_PUBLIC_*` written out in full.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const socialEnabled = Boolean(url && anonKey);

// Keep the sign-in session in the same on-device storage the rest of the app uses.
const sessionStorage = {
  getItem: async (key: string) => kv.get(key),
  setItem: async (key: string, value: string) => kv.set(key, value),
  removeItem: async (key: string) => kv.remove(key),
};

export const supabase: SupabaseClient | null = socialEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        storage: sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// On phones, only refresh the session while the app is in the foreground.
if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Throws a friendly error when social features aren't configured. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Sharing and friends aren't set up yet. Add your Supabase keys to .env.local (see the README).");
  }
  return supabase;
}
