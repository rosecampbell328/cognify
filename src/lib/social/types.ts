import type { Lesson } from "../types";

/** A row of public.profiles — everything here is visible to everyone. */
export type PublicProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  streak: number;
  last_active_day: string | null;
  total_xp: number;
  lessons_done: number;
  courses_count: number;
};

/** A row of public.shared_courses. */
export type SharedCourseRow = {
  id: string;
  owner_id: string;
  title: string;
  emoji: string;
  description: string;
  lesson_count: number;
  content: { lessons: Lesson[]; generatedBy?: "ai" | "offline" };
  created_at: string;
};

export type FriendshipRow = {
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
};

export const USERNAME_RULE = /^[a-z0-9_]{3,20}$/;

/** Postgres "unique violation" — used to spot taken usernames. */
export const UNIQUE_VIOLATION = "23505";
