-- Cognify social features: public profiles, shared courses, friendships and
-- profile photos. Run this once in your Supabase project (SQL Editor, or
-- `supabase db push` with the Supabase CLI).
--
-- Security model (Row Level Security is on for every table):
--   * profiles        — anyone can view (that's how "Created by" and profile
--                       pages work); you can only create/edit your own.
--   * shared_courses  — anyone with the link can view; only the owner can
--                       create, edit or delete. IDs are random, so courses
--                       can't be listed or guessed.
--   * friendships     — only the two people involved can see a request;
--                       only the recipient can accept; either can remove.
--   * avatars bucket  — photos are public; you can only upload to your own
--                       folder ({user id}/...).
-- Profiles hold no email address — only what's shown in the app.

-- ── Profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  username        text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name    text not null default '' check (char_length(display_name) <= 40),
  avatar_url      text check (avatar_url is null or char_length(avatar_url) <= 500),
  streak          integer not null default 0 check (streak >= 0),
  last_active_day date,
  total_xp        integer not null default 0 check (total_xp >= 0),
  lessons_done    integer not null default 0 check (lessons_done >= 0),
  courses_count   integer not null default 0 check (courses_count >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "People create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "People update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── Shared courses ──────────────────────────────────────────────────────────
create table public.shared_courses (
  -- 16 random hex characters (64 bits): unguessable, so links act as "anyone with the link".
  id           text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
                 check (id ~ '^[a-f0-9]{16}$'),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  emoji        text not null default '📘' check (char_length(emoji) <= 16),
  description  text not null default '' check (char_length(description) <= 1000),
  lesson_count integer not null default 0 check (lesson_count >= 0),
  -- { "lessons": [...] } in the app's Lesson format
  content      jsonb not null check (octet_length(content::text) <= 1000000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index shared_courses_owner_idx on public.shared_courses (owner_id);

alter table public.shared_courses enable row level security;

create policy "Shared courses are viewable by anyone with the link"
  on public.shared_courses for select
  using (true);

create policy "Owners share their own courses"
  on public.shared_courses for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners update their shared courses"
  on public.shared_courses for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners delete their shared courses"
  on public.shared_courses for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- ── Friendships (request → accept) ──────────────────────────────────────────
create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- One friendship per pair, whichever direction it was requested in.
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "People see their own friendships"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "People send friend requests as themselves"
  on public.friendships for insert
  to authenticated
  with check ((select auth.uid()) = requester_id and status = 'pending');

create policy "Recipients accept friend requests"
  on public.friendships for update
  to authenticated
  using ((select auth.uid()) = addressee_id)
  with check ((select auth.uid()) = addressee_id and status = 'accepted');

create policy "Either person can remove a friendship"
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Accepting may only change the status, never who the friendship is between.
revoke update on public.friendships from anon, authenticated;
grant update (status, accepted_at) on public.friendships to authenticated;

-- ── updated_at bookkeeping ──────────────────────────────────────────────────
create function public.touch_updated_at() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger shared_courses_touch before update on public.shared_courses
  for each row execute function public.touch_updated_at();

-- ── Profile photos ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Avatar photos are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "People upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "People replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "People delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
