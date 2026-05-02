# Hermetic — System Instructions

> A canonical reference for the project. Written for both humans and other LLMs
> who land here cold and need to understand what this is, how it's wired, and
> how to deploy it.

---

## What is this?

**Hermetic** is a generative art museum that turns one open-source project's
git history into one daily P5.js artwork. Each day in the source repo's
timeline (50 days at the moment) becomes a self-contained HTML artifact,
plus a "reflection" written by the project's own AI agent.

Inspired language: museum / archive / archaeology — but the actual subject is
software change over time.

The site has three views:
- `/`            — landing page with a typewriter-style intro
- `/timeline`    — grid of 50 daily artifacts; each links to a detail page
- `/artifact/:date` — full-screen artwork + reflection + memory state + commit metadata
- `/codex`       — pixel-icon view of skill categories that emerged from the codebase
- `/about`       — short "about" page

---

## Architecture

```
┌──────────────────────────────┐         ┌──────────────────────────┐
│ backend/                     │         │ frontend/                │
│   (Python, runs on VPS or    │         │   (Next.js, deploys to   │
│    GitHub Action)            │         │    Vercel / Netlify)     │
│                              │         │                          │
│ 1. fetch GitHub commits      │         │ Server components query  │
│ 2. generate P5.js HTML       │  HTML   │ Supabase via @supabase/  │
│    artifacts                 │ ──────▶ │ supabase-js (anon key)   │
│ 3. push rows to Supabase     │  files  │                          │
└──────────────────────────────┘         └──────────────────────────┘
                │                                    ▲
                │ writes (service_role key)          │ reads (anon key, RLS)
                ▼                                    │
              ┌──────────────────────────────────────┴────┐
              │  Supabase (Postgres + RLS)                │
              │  - artifacts                              │
              │  - memory_snapshots                       │
              │  - creation_dossiers                      │
              │  - invented_skills                        │
              └───────────────────────────────────────────┘
```

### Data flow, top to bottom

1. **`backend/generators/fetch_data.py` / `fetch_daily.py`** — pull releases &
   commits from `NousResearch/hermes-agent` via the GitHub API. Output goes
   to `backend/data/{releases,daily}.json`.
2. **`backend/generators/orchestrator.py`** — for each day in `daily.json`,
   pick a P5 style (10–14, deterministic by date hash) and generate one HTML
   file in `frontend/public/artifacts/`. Also writes
   `frontend/public/artifacts/artifacts.json` (registry).
3. **`backend/pipeline/extract_skills.py`** — derive skill categories from
   commit file paths, write `frontend/src/data/skills.json`.
4. **`backend/pipeline/seed_db.py`** — read the registry + each HTML file +
   daily JSON, and `INSERT` into Supabase using the **service-role** key.
5. **Frontend (Next.js, server components)** — read from Supabase via the
   **anon** key (RLS allows SELECT only). Pages are static (`force-static`)
   with hourly ISR (`revalidate = 3600`).
6. **HTML artifacts** are served as static assets from `frontend/public/`,
   embedded into the page with an `<iframe>` so the P5.js canvas can render
   in isolation.

---

## Repository layout

```
hermesy/
├── README.md
├── instructions.md           ← you are here
├── database.sql              ← run this in Supabase SQL editor
│
├── backend/                  ← Python: data + generation pipeline
│   ├── .env.example          ← Supabase + GitHub creds
│   ├── requirements.txt
│   ├── data/
│   │   ├── daily.json        ← per-day commits, files, stats
│   │   ├── releases.json     ← GitHub release dump
│   │   └── hermes_output.json← per-day reflections (optional)
│   ├── generators/
│   │   ├── fetch_data.py
│   │   ├── fetch_daily.py
│   │   ├── orchestrator.py   ← entry point: regenerates all 50 HTMLs
│   │   ├── p5_generator.py
│   │   ├── p5_new_styles.py  ← the 5 active P5 styles (modes 10–14)
│   │   └── artifact_base.py
│   ├── pipeline/
│   │   ├── extract_skills.py ← writes frontend/src/data/skills.json
│   │   └── seed_db.py        ← writes to Supabase
│   └── hermes-skill/         ← Hermes Agent integration (optional)
│
└── frontend/                 ← Next.js 16 (deploy to Vercel / Netlify)
    ├── .env.example
    ├── package.json
    ├── public/
    │   └── artifacts/        ← 50 generated HTML files + registry
    └── src/
        ├── app/              ← routes (Next.js app dir)
        │   ├── page.tsx              (/)
        │   ├── timeline/page.tsx     (/timeline)
        │   ├── artifact/[date]/page.tsx
        │   ├── codex/page.tsx        (/codex)
        │   ├── about/page.tsx
        │   └── api/skills/[name]/route.ts
        ├── components/        ← React components
        ├── data/skills.json   ← static, regenerated by extract_skills.py
        └── lib/
            ├── db.ts          ← Supabase client + typed queries
            ├── voice.ts       ← phrase banks for generated text
            └── p5-styles.ts + p5-layers/  ← P5 art used in `<P5Artwork>`
```

---

## Database

Schema and Row-Level-Security policies live in **`database.sql`** at the repo
root.

Tables (all in the `public` schema):

| Table              | Notes                                               |
|--------------------|-----------------------------------------------------|
| `artifacts`        | one row per day. `commits`/`stats` are JSONB.       |
| `memory_snapshots` | one per artifact; Hermes's memory at creation time. |
| `creation_dossiers`| one per artifact; commits read, skills used, etc.   |
| `invented_skills`  | downloadable .md skills the agent authored.         |

**RLS policies:** anonymous & authenticated users can `SELECT` everything;
nobody can `INSERT/UPDATE/DELETE`. Writes happen exclusively via the
**service-role key** (used by `backend/pipeline/seed_db.py`), which bypasses
RLS in Supabase.

---

## Local development

### One-time setup

```bash
# 0. Clone
git clone <repo> hermesy && cd hermesy

# 1. Supabase project
#    Create one at https://supabase.com → new project
#    SQL editor → paste and run database.sql
#    Project settings → API → copy:
#       - Project URL                 (use as SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL)
#       - anon public key             (use as NEXT_PUBLIC_SUPABASE_ANON_KEY)
#       - service_role key (secret!)  (use as SUPABASE_SERVICE_ROLE_KEY, backend only)

# 2. Backend
cd backend
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optionally GITHUB_TOKEN
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3. Frontend
cd ../frontend
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
```

### Run the pipeline (populate Supabase)

```bash
cd backend
source .venv/bin/activate

# (optional) refresh raw GitHub data — only needed for new commits
python -m generators.fetch_daily

# regenerate all 50 HTML artifacts → frontend/public/artifacts/
python -m generators.orchestrator

# extract skill list → frontend/src/data/skills.json
python -m pipeline.extract_skills

# push artifacts + memory + dossiers to Supabase
python -m pipeline.seed_db
```

### Run the frontend

```bash
cd frontend
npm run dev      # http://localhost:3000
# or:
npm run build && npm start
```

---

## Deployment

### Frontend → Vercel (recommended) or Netlify

1. Push the repo to GitHub.
2. Import into Vercel; set the **Root Directory** to `frontend/`.
3. Add the two environment variables under *Settings → Environment Variables*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Static pages will be generated at build time from Supabase data,
   then revalidated hourly.

`frontend/vercel.json` is already in the repo; no extra config needed.

For Netlify the equivalent is: **Base directory** = `frontend`,
**Build command** = `npm run build`, **Publish directory** = `frontend/.next`,
plus the same env vars.

### Backend → VPS (any Linux box with Python 3.11+)

```bash
# on the VPS:
git clone <repo> /opt/hermetic && cd /opt/hermetic/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && nano .env   # paste real keys

# one-shot regenerate + reseed:
python -m generators.orchestrator
python -m pipeline.seed_db
```

Schedule it with cron if you want it daily:

```cron
# /etc/cron.d/hermetic
0 6 * * *  hermetic  cd /opt/hermetic/backend && \
            .venv/bin/python -m generators.fetch_daily && \
            .venv/bin/python -m generators.orchestrator && \
            .venv/bin/python -m pipeline.extract_skills && \
            .venv/bin/python -m pipeline.seed_db \
            >> /var/log/hermetic.log 2>&1
```

The cron job only updates Supabase. The frontend revalidates by itself
(ISR every hour) so no redeploy is needed when new data lands.

If you want fresh HTML files on the live site after the cron job runs,
you also need to commit `frontend/public/artifacts/*` to git (or sync them
to your hosting bucket and re-trigger a build). Easiest path:

```cron
... && git add frontend/public/artifacts && \
git commit -m "artifacts: $(date +%F)" && git push
```

…and configure Vercel/Netlify to redeploy on push.

---

## Adding a new P5 style

1. Add a builder function to `backend/generators/p5_new_styles.py`. It should
   return a JS string and start with `var W,H;` plus a `setup()` that calls
   `W=windowWidth||1200; H=windowHeight||900; createCanvas(W,H);`.
2. Register it in `backend/generators/p5_generator.py`:
   - add a palette in `PALETTES`
   - bump `NUM_MODES`
   - register the builder in `STYLE_BUILDERS`
   - update the `style = 10 + (seed_int % N)` line if you want it picked.
3. Run `python -m generators.orchestrator` to regenerate.
4. Run `python -m pipeline.seed_db` to update Supabase.

---

## Conventions

- **Python paths.** Scripts use `Path(__file__).resolve().parent.parent.parent`
  to find the repo root and never relative `os.chdir`. Run them as modules
  (`python -m generators.orchestrator`) from `backend/`.
- **Env vars.** Anything client-side **must** start with `NEXT_PUBLIC_`. The
  service-role key must NEVER appear in any frontend file.
- **Static-first.** All routes use `force-static` + `revalidate = 3600`. We
  don't need (and don't want) on-demand server rendering.
- **No spaghetti.** Don't put Python anywhere outside `backend/`. Don't put
  TS anywhere outside `frontend/`. Data inputs go in `backend/data/`. Build
  outputs the frontend can serve go in `frontend/public/`.

---

## Common operations

| Task                                | Command                                                  |
|-------------------------------------|----------------------------------------------------------|
| Regenerate one day's artifact       | edit `daily.json` & rerun `orchestrator`                 |
| Reset Supabase to a clean state     | rerun `database.sql` (drops & recreates), then `seed_db` |
| Change which P5 styles are used     | edit `p5_generator.py`, line `style = 10 + (seed % 5)`   |
| Update skills sidebar               | `python -m pipeline.extract_skills`                      |
| Bump frontend deps                  | `cd frontend && npm install <pkg>`                       |
| See current artifact filenames      | `ls frontend/public/artifacts/`                          |

---

## What's intentionally NOT here

- No SQLite. The old `museum.db` is gone; everything reads/writes Supabase.
- No `website/` static site. The old hand-rolled HTML museum was retired in
  favor of the Next.js app under `frontend/`.
- No GitHub Actions. Deployment is now Vercel + a VPS cron, both documented
  above. Add Actions back if you prefer them; they're not load-bearing.

---

For UI-level conventions (component naming, color tokens, etc.), look at
`frontend/src/app/globals.css` and existing components — patterns there are
intentional.
