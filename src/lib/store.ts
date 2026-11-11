import { useSyncExternalStore } from "react";

import { kv } from "./kv";
import type { AppState, Course, Progress, Source } from "./types";

const STORAGE_KEY = "cognify.state.v1";

const defaultProgress: Progress = {
  xp: 0,
  streak: 0,
  lastActiveDay: null,
  dailyGoal: 30,
  todayXp: 0,
  todayDay: null,
  completed: {},
};

const emptyState: AppState = { sources: [], courses: [], progress: defaultProgress };

function load(): AppState {
  try {
    const raw = kv.get(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      sources: parsed.sources ?? [],
      courses: parsed.courses ?? [],
      progress: { ...defaultProgress, ...parsed.progress },
    };
  } catch {
    return emptyState;
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();

function setState(next: AppState) {
  state = next;
  kv.set(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export function getState() {
  return state;
}

export function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(a: string, b: string) {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/** Streak shown to the user: drops to 0 if they skipped a whole day. */
export function liveStreak(p: Progress) {
  if (!p.lastActiveDay) return 0;
  return daysBetween(p.lastActiveDay, dayKey()) > 1 ? 0 : p.streak;
}

export function liveTodayXp(p: Progress) {
  return p.todayDay === dayKey() ? p.todayXp : 0;
}

// ── Actions ─────────────────────────────────────────────

export function addSource(source: Omit<Source, "id" | "createdAt">): Source {
  const created: Source = { ...source, id: makeId(), createdAt: Date.now() };
  setState({ ...state, sources: [created, ...state.sources] });
  return created;
}

export function removeSource(id: string) {
  setState({ ...state, sources: state.sources.filter((s) => s.id !== id) });
}

export function addCourse(course: Course) {
  setState({ ...state, courses: [course, ...state.courses] });
}

export function removeCourse(id: string) {
  const completed = Object.fromEntries(
    Object.entries(state.progress.completed).filter(([k]) => !k.startsWith(`${id}:`)),
  );
  setState({
    ...state,
    courses: state.courses.filter((c) => c.id !== id),
    progress: { ...state.progress, completed },
  });
}

export function completeLesson(courseId: string, lessonId: string, accuracy: number, xpEarned: number) {
  const p = state.progress;
  const today = dayKey();
  const key = `${courseId}:${lessonId}`;

  let streak = p.streak;
  if (p.lastActiveDay !== today) {
    const gap = p.lastActiveDay ? daysBetween(p.lastActiveDay, today) : Infinity;
    streak = gap === 1 ? p.streak + 1 : 1;
  }

  setState({
    ...state,
    progress: {
      ...p,
      xp: p.xp + xpEarned,
      streak,
      lastActiveDay: today,
      todayXp: liveTodayXp(p) + xpEarned,
      todayDay: today,
      completed: { ...p.completed, [key]: Math.max(p.completed[key] ?? 0, accuracy) },
    },
  });
}

export function setDailyGoal(goal: number) {
  setState({ ...state, progress: { ...state.progress, dailyGoal: goal } });
}

export function resetEverything() {
  setState(emptyState);
}
