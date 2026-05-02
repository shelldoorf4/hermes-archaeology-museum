-- ============================================================================
-- Hermetic — Supabase Schema
-- ============================================================================
--
-- How to use:
--   1. Create a new Supabase project (https://supabase.com)
--   2. Open the SQL editor in the dashboard
--   3. Paste the entire contents of this file and run it
--
-- Tables:
--   artifacts            — daily P5.js artworks (one per day of commit history)
--   memory_snapshots     — Hermes's memory state when it created the artifact
--   creation_dossiers    — process notes, commits read, skills used
--   invented_skills      — skills produced by Hermes (downloadable .md files)
--
-- Read-only public access via RLS. Writes only via the service role key
-- (used by the backend pipeline; never exposed to the browser).
-- ============================================================================

-- Drop in reverse-dependency order if rerunning
DROP TABLE IF EXISTS public.invented_skills CASCADE;
DROP TABLE IF EXISTS public.creation_dossiers CASCADE;
DROP TABLE IF EXISTS public.memory_snapshots CASCADE;
DROP TABLE IF EXISTS public.artifacts CASCADE;

-- ----------------------------------------------------------------------------
-- artifacts
-- ----------------------------------------------------------------------------
CREATE TABLE public.artifacts (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date            TEXT UNIQUE NOT NULL,
  tag             TEXT NOT NULL,
  commits         JSONB NOT NULL DEFAULT '[]'::jsonb,
  render_format   TEXT NOT NULL DEFAULT 'html',
  source_code     TEXT NOT NULL DEFAULT '',
  filename        TEXT NOT NULL,
  title           TEXT NOT NULL DEFAULT '',
  reflection      TEXT NOT NULL DEFAULT '',
  aesthetic_used  JSONB NOT NULL DEFAULT '[]'::jsonb,
  release_name    TEXT NOT NULL DEFAULT '',
  stats           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX artifacts_date_idx ON public.artifacts (date DESC);

-- ----------------------------------------------------------------------------
-- memory_snapshots — one per artifact, captures Hermes's memory at creation
-- ----------------------------------------------------------------------------
CREATE TABLE public.memory_snapshots (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  artifact_id          BIGINT UNIQUE
                         REFERENCES public.artifacts(id) ON DELETE CASCADE,
  memory_md            TEXT NOT NULL DEFAULT '',
  capacity_used_pct    INTEGER NOT NULL DEFAULT 0,
  entries_count        INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX memory_snapshots_artifact_idx
  ON public.memory_snapshots (artifact_id);

-- ----------------------------------------------------------------------------
-- creation_dossiers — process metadata for each artifact
-- ----------------------------------------------------------------------------
CREATE TABLE public.creation_dossiers (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  artifact_id         BIGINT UNIQUE
                        REFERENCES public.artifacts(id) ON DELETE CASCADE,
  commits_read        JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills_invented     JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills_used         JSONB NOT NULL DEFAULT '[]'::jsonb,
  references_pulled   JSONB NOT NULL DEFAULT '[]'::jsonb,
  process_notes       TEXT NOT NULL DEFAULT '',
  iterations          INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX creation_dossiers_artifact_idx
  ON public.creation_dossiers (artifact_id);

-- ----------------------------------------------------------------------------
-- invented_skills — skills authored by Hermes; downloadable as markdown
-- ----------------------------------------------------------------------------
CREATE TABLE public.invented_skills (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                     TEXT UNIQUE NOT NULL,
  created_on_date          TEXT NOT NULL,
  category                 TEXT NOT NULL DEFAULT 'render',
  content                  TEXT NOT NULL,
  description              TEXT NOT NULL DEFAULT '',
  download_count           INTEGER NOT NULL DEFAULT 0,
  first_used_on_artifact   BIGINT REFERENCES public.artifacts(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX invented_skills_name_idx
  ON public.invented_skills (name);
CREATE INDEX invented_skills_created_on_date_idx
  ON public.invented_skills (created_on_date);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- The site is a public read-only museum. Everyone (including the anon role
-- used by the browser) can SELECT. Only the service_role key (server-side
-- pipeline) can INSERT / UPDATE / DELETE.
-- ============================================================================

ALTER TABLE public.artifacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creation_dossiers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invented_skills    ENABLE ROW LEVEL SECURITY;

-- Read policies (anon + authenticated)
CREATE POLICY "public read artifacts"
  ON public.artifacts FOR SELECT
  USING (true);

CREATE POLICY "public read memory_snapshots"
  ON public.memory_snapshots FOR SELECT
  USING (true);

CREATE POLICY "public read creation_dossiers"
  ON public.creation_dossiers FOR SELECT
  USING (true);

CREATE POLICY "public read invented_skills"
  ON public.invented_skills FOR SELECT
  USING (true);

-- Note: no INSERT/UPDATE/DELETE policies are defined for anon/authenticated.
-- Supabase's `service_role` key bypasses RLS automatically — only the backend
-- pipeline (which holds that key in an env var) can write.
--
-- If you ever want public write access (e.g. an upvote counter), add a policy
-- like:
--   CREATE POLICY "public increment download_count"
--     ON public.invented_skills FOR UPDATE
--     USING (true) WITH CHECK (true);
-- and restrict it to specific columns via a function/trigger if needed.

-- ============================================================================
-- Done. Next: run the seed script (see instructions.md):
--   cd backend && python -m pipeline.seed_db
-- ============================================================================
