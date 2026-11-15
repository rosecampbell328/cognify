# Cognify

Upload anything, or just describe what you want to learn, and learn it the Duolingo way. Cognify turns your notes, articles, PDFs and ideas into short, game-like courses: lessons on a winding path, quick exercises, XP, streaks and a daily goal.

## What's in this starter

| Area | What it does |
| --- | --- |
| **Learn tab** (`src/app/(tabs)/index.tsx`) | Streak and XP, a daily-goal bar, your courses, and a one-tap **sample course** |
| **Library tab** (`src/app/(tabs)/library.tsx`) | Every resource you've added, with **Make a course** on each |
| **Profile tab** (`src/app/(tabs)/profile.tsx`) | Profile photo and name (tap to change), stats, daily-goal picker, reset |
| **New course** (`src/app/add-source.tsx`) | Paste text and add any number of PDFs or text files in one place, then say what you want to learn |
| **Build with AI chat** (`src/app/create-chat.tsx`) | Describe what you want to learn (e.g. vacation phrases in Spanish); the AI asks a question or two, then builds the course |
| **Course path** (`src/app/course/[id].tsx`) | A zig-zag lesson path with completed, current and locked lessons |
| **Lesson player** (`src/app/lesson/[courseId]/[lessonId].tsx`) | Multiple choice, true/false, fill-in-the-blank and flashcards; instant feedback; missed questions come back at the end; XP and accuracy results |
| **AI course builder** (`src/app/api/generate+api.ts`) | Server route that asks Claude for a structured course, from your sources or from a chat plan |
| **Course-planning chat** (`src/app/api/chat+api.ts`) | Server route behind the chat; returns the next reply and, once ready, a course brief |
| **PDF reader** (`src/app/api/extract+api.ts`) | Server route that pulls the text out of uploaded PDFs (no AI or API key needed) |
| **Offline fallback** (`src/lib/localGenerator.ts`) | Builds a simpler course on the device when the AI isn't configured or reachable, so the app always works |

Progress is saved on the device (SQLite key-value store on iOS/Android, `localStorage` on web). All colours live in `src/theme/colors.ts`.

## Run it

```bash
npm install
npx expo start
```

Press `w` for web, or open it in Expo Go / a development build.

### Turn on the AI

Without a key, Cognify builds offline drafts from uploaded material (labelled "offline draft"), and the AI chat explains that it isn't set up. Courses from a chat description always need the AI. To have Claude build real courses, create `.env.local` in the project root:

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

- Web links and YouTube transcripts as sources (NotebookLM-style), and scanned PDFs
- Spaced-repetition review sessions built from past mistakes
- Hearts/lives, leagues and streak freezes
- An "Ask your sources" chat tutor
- Accounts and cloud sync
