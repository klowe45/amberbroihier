# amberbroihier

Personal brand + public speaking site for Amber Broihier.

- **Frontend:** Vite + React 19 + hand-written CSS. Deployed to GitHub Pages at [amberbroihier.com](https://amberbroihier.com) via `gh-pages`.
- **Backend:** Express + Postgres — [klowe45/amberbroihierBackEnd](https://github.com/klowe45/amberbroihierBackEnd). Deployed on Render, Postgres on Neon, Resend for booking-inquiry emails.

## Local development

Both the backend and frontend need to be running.

```sh
# 1. Start the backend (in a separate terminal)
cd ~/projects/amberbroihierBackEnd
npm install
cp .env.example .env    # fill in DATABASE_URL, JWT_SECRET, RESEND_API_KEY, EMAIL_FROM/TO
npm run migrate
node scripts/create-admin.js hello@amberbroihier.com <choose-a-password>
npm run dev             # runs on http://localhost:4000

# 2. Start the frontend
cd ~/projects/amberbroihier
cp .env.example .env.local   # VITE_API_BASE_URL=http://localhost:4000
npm install
npm run dev
```

Sign in at `/login` with the admin credentials above. The **Admin** link
appears in the nav.

## Deploy the frontend

```sh
npm run deploy
```

Builds to `dist/` and force-pushes to the `gh-pages` branch. GitHub Pages
serves that branch at `amberbroihier.com` (see `public/CNAME`).

First-time repo setup:

- **GitHub → Settings → Pages:** source = `gh-pages` branch, root
- **DNS at your registrar** for amberbroihier.com:
  - `A` records at the apex pointing to
    `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
    `185.199.111.153`
  - `CNAME` for `www` → `klowe45.github.io`
- Set `VITE_API_BASE_URL` to the Render service URL before building
  for production (`echo 'VITE_API_BASE_URL=https://amberbroihier-api.onrender.com' > .env.production`).

## Deploy the backend

See [`amberbroihierBackEnd/README.md`](https://github.com/klowe45/amberbroihierBackEnd#readme).
TL;DR: create a Neon project, sign up for Resend + verify the sending
domain, then in Render click **New → Blueprint** and point at the
backend repo — it reads `render.yaml` and provisions the service.

## Project layout

```
src/
  components/     Layout, ProtectedRoute, BookingForm
  lib/            api client, AuthContext, useSiteContent hook
  pages/          Home, About, Speaking, Blog, BlogPost, Login, NotFound
  pages/admin/    ContentEditor, BlogManager, VideoManager, BookingInbox
public/
  CNAME           amberbroihier.com
  404.html        SPA fallback for GitHub Pages deep-link refreshes
```
