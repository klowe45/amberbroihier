-- amberbroihier — Supabase schema
--
-- Run this in the Supabase SQL editor (Project → SQL → New query) after
-- creating the project. Idempotent: safe to re-run to add/adjust policies.
--
-- Data model:
--   admins       — which auth.users can write content (must have a row here)
--   site_content — key/value editable copy shown on marketing pages
--   blog_posts   — long-form writing (draft/published)
--   videos       — YouTube/Vimeo embeds shown on /speaking
--
-- Everything else respects Row Level Security: the anon key (used by the
-- browser) can only read published data. Writes require Amber to be signed
-- in AND have a matching row in `admins`.

-- ------------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ------------------------------------------------------------------
-- admins
-- ------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Signed-in users can see their own admin row (used by the client to
-- decide whether to show the Admin link). Never expose the whole table.
drop policy if exists "admins can read self" on public.admins;
create policy "admins can read self"
  on public.admins for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- Helper: is_admin()
-- ------------------------------------------------------------------
-- Reused by the write policies below so the check is centralised.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

-- ------------------------------------------------------------------
-- site_content — editable copy (home/about/speaking)
-- ------------------------------------------------------------------
create table if not exists public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "site_content public read" on public.site_content;
create policy "site_content public read"
  on public.site_content for select
  using (true);

drop policy if exists "site_content admin write" on public.site_content;
create policy "site_content admin write"
  on public.site_content for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------------
-- blog_posts
-- ------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body text not null default '',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

-- Public visitors only see posts flagged published; drafts stay private.
drop policy if exists "blog_posts public read published" on public.blog_posts;
create policy "blog_posts public read published"
  on public.blog_posts for select
  using (published = true);

-- Admin sees everything (drafts + published) so the admin list works.
drop policy if exists "blog_posts admin read all" on public.blog_posts;
create policy "blog_posts admin read all"
  on public.blog_posts for select
  using (public.is_admin());

drop policy if exists "blog_posts admin write" on public.blog_posts;
create policy "blog_posts admin write"
  on public.blog_posts for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------------
-- videos
-- ------------------------------------------------------------------
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  embed_url text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;

drop policy if exists "videos public read" on public.videos;
create policy "videos public read"
  on public.videos for select
  using (true);

drop policy if exists "videos admin write" on public.videos;
create policy "videos admin write"
  on public.videos for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------------
-- Making Amber an admin
-- ------------------------------------------------------------------
-- 1. In Supabase → Authentication → Users, create Amber's user (email +
--    password).
-- 2. Copy the resulting UUID from that row.
-- 3. Run:
--      insert into public.admins (user_id) values ('<uuid>');
-- 4. Sign in at /login on the site; the Admin link should now appear.
