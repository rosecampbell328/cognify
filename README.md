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
| **Accounts** (`src/app/sign-in.tsx`, `src/lib/social/account.ts`) | Sign in with a 6-digit email code, pick a name and username; your photo, name and stats sync to a public profile |
| **Share links** (`src/app/c/[id].tsx`, `src/lib/social/courses.ts`) | **Share** on any course makes a link. Opening it shows the course with "Created by @username" and **Add to my library**; on the web it offers the app instead |
| **Friends** (`src/app/friends.tsx`, `src/app/u/[username].tsx`) | Find people by username, send and accept friend requests; profiles show only streak, courses, lessons done and total XP |

Progress is saved on the device (SQLite key-value store on iOS/Android, `localStorage` on web). Accounts, shared courses and friends live in Supabase (see below); the rest of the app works without it. Cognify has a light and a dark mode in a teal colour scheme. It follows the phone's setting, and people can pick System, Light or Dark in Profile. Colours live in `src/theme/colors.ts`; screens read them with `useColors()` and `makeStyles()` from `src/theme/theme.tsx`, so never hard-code a colour in a screen.

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

### Turn on sharing and friends (Supabase)

Accounts, share links and friends need a free [Supabase](https://supabase.com) project. Without one, those features stay hidden or say they aren't set up, and everything else works.

1. **Create a project** at supabase.com (the free plan is fine).
2. **Create the tables:** open **SQL Editor**, paste the whole of `supabase/migrations/20261119000000_social.sql`, and run it. It creates the profiles, shared courses, friendships and a profile-photo bucket, with security rules so people can only change their own data.
3. **Send codes instead of links:** in **Authentication**, open the email templates and edit the **Magic Link** template so it includes `{{ .Token }}` instead of `{{ .ConfirmationURL }}`, e.g. `Your Cognify code is {{ .Token }}`. Without this, people get a sign-in link instead of a 6-digit code.
4. **Add the keys:** in your project's settings, find the **Project URL** and the **anon / publishable key**, and add them to `.env.local` (copy `.env.example`):

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

   This key is meant to be public; the database's security rules protect the data. **Never** put the `service_role` / secret key in the app.
5. Restart `npx expo start`.

Good to know:

- Supabase's built-in email sender only allows a few emails an hour. Before real users sign up, add your own email provider in the Authentication settings (custom SMTP).
- Profiles are public: anyone can see a person's name, username, photo, streak, courses count, lessons done and total XP. Email addresses are never shown.
- Shared courses can be opened by anyone with the link. Links use random ids, so they can't be guessed or listed.

### Share links and app stores

In development, **Share** makes a link that opens the app in Expo Go. For real links:

- `EXPO_PUBLIC_SHARE_URL`: your website (for example a free `*.expo.app` site from EAS Hosting). Links become `https://…/c/<id>`, and the same page works in a browser.
- `EXPO_PUBLIC_APP_STORE_URL` and `EXPO_PUBLIC_PLAY_STORE_URL`: once Cognify is listed, people opening a link on a phone without the app are sent straight to the right store. Until then the page says "coming soon".
- To make those `https` links open the installed app directly (iOS Universal Links and Android App Links), the website and a real build need to be linked. That's set up together with the first build, once the website address and app IDs exist.

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
- Sync full progress and courses across devices
- Leaderboards among friends
