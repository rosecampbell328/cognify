# Cognify

Upload anything, then learn it the Duolingo way. Cognify turns your notes, articles and documents into short, game-like courses: lessons on a winding path, quick exercises, XP, streaks and a daily goal.

## What's in this starter

| Area | What it does |
| --- | --- |
| **Learn tab** (`src/app/(tabs)/index.tsx`) | Streak and XP, a daily-goal bar, your courses, and a one-tap **sample course** |
| **Library tab** (`src/app/(tabs)/library.tsx`) | Every resource you've added, with **Make a course** on each |
| **Profile tab** (`src/app/(tabs)/profile.tsx`) | Stats, daily-goal picker, reset |
| **Add resource** (`src/app/add-source.tsx`) | Paste text or upload a `.txt` / `.md` / `.csv` / `.json` file, then say what you want to learn |
| **Course path** (`src/app/course/[id].tsx`) | A zig-zag lesson path with completed, current and locked lessons |
| **Lesson player** (`src/app/lesson/[courseId]/[lessonId].tsx`) | Multiple choice, true/false, fill-in-the-blank and flashcards; instant feedback; missed questions come back at the end; XP and accuracy results |
| **AI course builder** (`src/app/api/generate+api.ts`) | A server API route that sends your sources to Claude and gets back a structured course |
| **Offline fallback** (`src/lib/localGenerator.ts`) | Builds a simpler course on the device when the AI isn't configured or reachable, so the app always works |

Progress is saved on the device (SQLite key-value store on iOS/Android, `localStorage` on web). All colours live in `src/theme/colors.ts`.

## Run it

```bash
npm install
npx expo start
```

Press `w` for web, or open it in Expo Go / a development build.

### Turn on the AI

Without a key, Cognify builds offline drafts (labelled "offline draft"). To have Claude build real courses, create `.env.local` in the project root:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Then restart `npx expo start`. The key is read only by the server route and is never bundled into the app. Don't prefix it with `EXPO_PUBLIC_`, which would ship it to every phone.

In development, native apps reach the API route through the Expo dev server automatically. For production you need to deploy the server (for example with EAS Hosting) and set the `origin` option of the `expo-router` plugin in `app.json` to that URL.

## Checks

```bash
npx tsc --noEmit
npx expo lint
```

## Ideas for the next round

- PDF, web links and YouTube transcripts as sources (NotebookLM-style)
- Spaced-repetition review sessions built from past mistakes
- Hearts/lives, leagues and streak freezes
- An "Ask your sources" chat tutor
- Accounts and cloud sync
