# hermetic

A generative art museum that turns one open-source project's git history into
50 daily P5.js artworks. Software change rendered as interface archaeology.

## Stack

- **Frontend** — Next.js 16, deploys to Vercel / Netlify
- **Backend** — Python 3.11+, runs as a cron on any VPS
- **Database** — Supabase (Postgres + Row-Level-Security)
- **Art** — P5.js, embedded as standalone HTML per day

## Layout

```
hermesy/
├── backend/        Python: GitHub fetcher, P5 generator, Supabase seeder
├── frontend/       Next.js app
├── database.sql    Schema + RLS, paste into Supabase SQL editor
└── instructions.md Full architecture + deployment guide
```

## Quickstart

```bash
# 1. Supabase: create a project, run database.sql in the SQL editor.
#    Copy the project URL, anon key, and service-role key.

# 2. Backend
cd backend
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m generators.orchestrator   # generate 50 HTML artifacts
python -m pipeline.extract_skills   # write frontend/src/data/skills.json
python -m pipeline.seed_db          # push to Supabase

# 3. Frontend
cd ../frontend
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_*
npm install
npm run dev                  # http://localhost:3000
```

## Deploy

- **Frontend → Vercel.** Set Root Directory to `frontend/`. Add the two
  `NEXT_PUBLIC_SUPABASE_*` env vars. Push to deploy.
- **Backend → VPS.** Clone the repo, set up `backend/.env`, schedule
  `orchestrator` + `seed_db` as a cron. See `instructions.md` for the
  full crontab line.

For the full picture (architecture diagram, conventions, how to add a new
P5 style, troubleshooting) read [`instructions.md`](./instructions.md).

## License

MIT
