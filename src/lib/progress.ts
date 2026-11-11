import type { Course, Progress } from "./types";

export function lessonKey(courseId: string, lessonId: string) {
  return `${courseId}:${lessonId}`;
}

export function courseProgress(course: Course, completed: Progress["completed"]) {
  const total = course.lessons.length;
  const done = course.lessons.filter((l) => completed[lessonKey(course.id, l.id)] !== undefined).length;
  const nextIndex = course.lessons.findIndex((l) => completed[lessonKey(course.id, l.id)] === undefined);
  return {
    done,
    total,
    fraction: total ? done / total : 0,
    nextLesson: nextIndex >= 0 ? course.lessons[nextIndex] : null,
    nextIndex,
  };
}

/** XP for a finished lesson: base reward plus a bonus for accuracy. */
export function xpForLesson(accuracy: number) {
  return 10 + Math.round(accuracy * 10);
}
