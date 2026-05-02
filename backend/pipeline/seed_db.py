#!/usr/bin/env python3
"""
Seed Supabase from local data.

Reads:
  - frontend/public/artifacts/artifacts.json  (artifact registry)
  - frontend/public/artifacts/<filename>.html (each artifact's source code)
  - backend/data/daily.json                    (commit/file metadata per day)
  - backend/data/hermes_output.json            (Hermes reflections, optional)

Writes (via Supabase REST, using the service-role key which bypasses RLS):
  - artifacts
  - memory_snapshots
  - creation_dossiers

Required env vars (put them in backend/.env or export them in your shell):
  SUPABASE_URL                e.g. https://xxxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY   the *service_role* key, NOT the anon key

Usage:
  cd backend && python -m pipeline.seed_db
"""

import json
import os
import sys
from pathlib import Path

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: install dependencies first:  pip install -r requirements.txt")
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_REGISTRY = REPO_ROOT / "frontend" / "public" / "artifacts" / "artifacts.json"
ARTIFACTS_DIR = REPO_ROOT / "frontend" / "public" / "artifacts"
DAILY_DATA = REPO_ROOT / "backend" / "data" / "daily.json"
HERMES_OUTPUT = REPO_ROOT / "backend" / "data" / "hermes_output.json"


def _env_or_die(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        print(f"ERROR: environment variable {name} is not set.")
        print("       see backend/.env.example for the required vars.")
        sys.exit(1)
    return val


def _load_dotenv() -> None:
    """Tiny .env loader so users don't need python-dotenv."""
    env_file = REPO_ROOT / "backend" / ".env"
    if not env_file.exists():
        return
    for raw in env_file.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def load_data():
    registry = json.loads(ARTIFACTS_REGISTRY.read_text())
    daily = json.loads(DAILY_DATA.read_text())
    days_by_date = {d["date"]: d for d in daily["days"]}

    hermes = {}
    if HERMES_OUTPUT.exists():
        hermes_data = json.loads(HERMES_OUTPUT.read_text())
        hermes = {h["date"]: h for h in hermes_data}
        print(f"  Loaded {len(hermes)} Hermes reflections")
    else:
        print("  No hermes_output.json — using fallback reflections")

    return registry["artifacts"], days_by_date, hermes


def fallback_reflection(day):
    date = day.get("date", "unknown")
    commit_count = day.get("commit_count", 0)
    if commit_count == 0:
        return f"{date}.\nnothing happened. i rendered it anyway.\npending."
    return f"{date}.\n{commit_count} changes arrived.\ni read through them.\npending."


def build_dossier(day):
    commits = day.get("commits", [])
    commits_read = [
        {
            "sha": c.get("sha", ""),
            "message": c.get("message", ""),
            "author": c.get("author", ""),
        }
        for c in commits[:20]
    ]
    themes = day.get("themes", []) or ["daily"]
    process_notes = (
        f"consumed {len(commits_read)} specimens. "
        f"dominant signals: {', '.join(themes)}. "
        f"rendered in one pass."
    )
    return {
        "commits_read": commits_read,
        "skills_invented": [],
        "skills_used": [],
        "references_pulled": [],
        "process_notes": process_notes,
        "iterations": 1,
    }


def seed():
    _load_dotenv()
    url = _env_or_die("SUPABASE_URL")
    key = _env_or_die("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(url, key)

    artifacts, days_by_date, hermes = load_data()

    print("  Wiping existing rows...")
    # delete cascades; just clearing the parent table is enough.
    supabase.table("artifacts").delete().neq("id", -1).execute()

    total = len(artifacts)
    print(f"  Seeding {total} artifacts to Supabase...")

    for i, art in enumerate(artifacts):
        date = art["date"][:10]
        tag = art["tag"]
        day = days_by_date.get(
            date, {"date": date, "tag": tag, "commits": [], "commit_count": 0}
        )

        html_path = ARTIFACTS_DIR / art["filename"]
        source_code = html_path.read_text() if html_path.exists() else ""

        h = hermes.get(date)
        if h and h.get("reflection") and not h["reflection"].startswith("["):
            title = h.get("title", "")
            reflection = h["reflection"]
            memory_md = h.get("memory_md", "")
            capacity = h.get("memory_capacity_pct", 0)
            entries_count = (
                len([l for l in memory_md.split("§") if l.strip()]) if memory_md else 0
            )
        else:
            title = ""
            reflection = fallback_reflection(day)
            memory_md = ""
            capacity = 0
            entries_count = 0

        dossier = build_dossier(day)
        commits = day.get("commits", [])
        stats = day.get("stats", {})

        artifact_row = {
            "date": date,
            "tag": tag,
            "commits": commits[:20],
            "render_format": "html",
            "source_code": source_code,
            "filename": art["filename"],
            "title": title,
            "reflection": reflection,
            "aesthetic_used": ["p5_composition"],
            "release_name": art.get("release_name", tag),
            "stats": stats,
        }

        result = supabase.table("artifacts").insert(artifact_row).execute()
        artifact_id = result.data[0]["id"]

        supabase.table("memory_snapshots").insert(
            {
                "artifact_id": artifact_id,
                "memory_md": memory_md,
                "capacity_used_pct": capacity,
                "entries_count": entries_count,
            }
        ).execute()

        supabase.table("creation_dossiers").insert(
            {
                "artifact_id": artifact_id,
                "commits_read": dossier["commits_read"],
                "skills_invented": dossier["skills_invented"],
                "skills_used": dossier["skills_used"],
                "references_pulled": dossier["references_pulled"],
                "process_notes": dossier["process_notes"],
                "iterations": dossier["iterations"],
            }
        ).execute()

        source = "H" if h and h.get("reflection") and not h["reflection"].startswith("[") else "F"
        marker = "R" if day.get("is_release") else "."
        print(f"  [{i+1}/{total}] {marker}{source} {date} {tag} — memory: {capacity}%")

    print(f"\n  Done. {total} artifacts pushed to {url}")


if __name__ == "__main__":
    seed()
