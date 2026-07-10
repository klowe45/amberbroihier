# amberbroihier

Personal brand + public speaking site for Amber Broihier.

- **Frontend:** Vite + React 19 + hand-written CSS
- **Backend:** Supabase (Postgres + Auth) — Amber signs in and edits copy, writing, and talks from `/admin`
- **Deploy:** GitHub Pages at [amberbroihier.com](https://amberbroihier.com) via `gh-pages`

## Local development

```sh
cp .env.example .env.local   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Values live in the Supabase dashboard under **Project Settings → API**.

## Supabase setup (one-time)

1. Create a Supabase project.
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). This
   creates the `admins`, `site_content`, `blog_posts`, and `videos` tables
   plus RLS policies (public read, admin-only write).
3. In **Authentication → Users**, create Amber's user (email + password).
4. In the SQL editor:
   ```sql
   insert into public.admins (user_id) values ('<paste UUID here>');
   ```
5. Sign in at `/login`. The Admin link appears in the nav.

## Deploy

```sh
npm run deploy
```

This builds to `dist/` and force-pushes to the `gh-pages` branch. GitHub
Pages serves that branch at `amberbroihier.com` (CNAME is in `public/CNAME`).

First-time repo setup:

- **GitHub → Settings → Pages:** source = `gh-pages` branch, root
- **DNS at your registrar** for amberbroihier.com:
  - `A` records at the apex pointing to
    `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
    `185.199.111.153`
  - `CNAME` for `www` → `klowe45.github.io`
- Wait for HTTPS to provision (GitHub does this automatically once DNS
  resolves).

## Project layout

```
src/
  components/     Layout, ProtectedRoute
  lib/            supabase client, AuthContext, useSiteContent hook
  pages/          Home, About, Speaking, Blog, BlogPost, Login, NotFound
  pages/admin/    ContentEditor, BlogManager, VideoManager
supabase/
  schema.sql      Tables + RLS policies
public/
  CNAME           amberbroihier.com
  404.html        SPA fallback for GitHub Pages deep-link refreshes
```
