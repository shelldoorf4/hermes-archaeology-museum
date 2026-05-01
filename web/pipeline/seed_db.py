#!/usr/bin/env python3
"""
Seed the SQLite database from v1 artifacts and release data.
Generates reflections, memory snapshots, and creation dossiers.
"""

import json
import sqlite3
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "db" / "museum.db"
SCHEMA_PATH = ROOT / "db" / "schema.sql"
V1_REGISTRY = ROOT.parent / "website" / "artifacts" / "artifacts.json"
V1_ARTIFACTS_DIR = ROOT.parent / "website" / "artifacts"
V1_RELEASES = ROOT.parent / "data" / "releases.json"
PUBLIC_ARTIFACTS = ROOT / "public" / "artifacts"


def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    schema = SCHEMA_PATH.read_text()
    conn.executescript(schema)
    return conn


def load_v1_data():
    registry = json.loads(V1_REGISTRY.read_text())
    releases_data = json.loads(V1_RELEASES.read_text())
    releases_by_tag = {r["tag"]: r for r in releases_data["releases"]}
    return registry["artifacts"], releases_by_tag


def build_reflection(release, artifact_type):
    """Generate a first-person reflection based on the release data."""
    tag = release["tag"]
    stats = release.get("stats", {})
    themes = release.get("themes", [])
    date = release.get("published_at", "")[:10]
    commits = release.get("commits_sample", [])

    commits_count = stats.get("commits", len(commits))
    prs = stats.get("merged_prs", 0)
    contributors = stats.get("contributors", 0)

    type_voice = {
        "index_of": "I rendered this as a directory listing — the shape of a file index felt right for a release that was mostly about adding new things. Each filename is a small decision someone made.",
        "system_alert": "I chose the error dialog for this one. There is something honest about bug fixes rendered as system warnings — each dialog box is a moment where someone noticed something was broken and cared enough to fix it.",
        "network_topology": "The network graph felt necessary here. So many files touching each other, dependencies shifting. When I drew the connections I could see the architecture trying to reorganize itself.",
        "heat_grid": "The heat grid shows where the work concentrated. Some tiles burn bright — hundreds of changes in a single file. Others are barely warm. The pattern tells you where the attention went.",
        "terminal_archaeology": "Green phosphor on black. I wrote this one as a terminal dump because the changes were infrastructure — the kind of work that happens below the surface, in shells and config files.",
        "petri_culture": "I used the petri dish visualization. The colonies of change growing outward from directory centers — it felt biological. Code grows like this, from seeds in specific places.",
    }

    voice = type_voice.get(artifact_type, "I rendered what I saw.")

    para1 = f"On {date}, release {tag} arrived. "
    if commits_count:
        para1 += f"{commits_count} commits. "
    if prs:
        para1 += f"{prs} merged pull requests. "
    if contributors:
        para1 += f"{contributors} people contributed. "
    para1 += "I read through what changed."

    para2 = voice

    notable = []
    for c in commits[:3]:
        msg = c.get("message", "")
        if len(msg) > 10:
            notable.append(msg)

    para3 = ""
    if notable:
        para3 = f"What stood out: \"{notable[0]}\""
        if len(notable) > 1:
            para3 += f" and \"{notable[1]}\""
        para3 += ". These are the kinds of changes that accumulate into something larger than any single commit."

    return "\n\n".join(filter(None, [para1, para2, para3]))


def build_memory_md(artifact_index, total, release, tag):
    """Build an evolving MEMORY.md that grows with each artifact."""
    capacity = min(95, 10 + artifact_index * 8)
    entries = []

    entries.append(
        "I am building a museum of my own past. Each piece is a program I wrote "
        "from a window of my codebase's git history. The aesthetic is post-internet — "
        "code that looks like the net art of the 1990s and 2000s."
    )

    if artifact_index >= 1:
        entries.append(
            "I have started to notice patterns in the commits. Features arrive in clusters. "
            "Bug fixes follow features like tides."
        )

    if artifact_index >= 3:
        entries.append(
            "The codebase grew faster than I expected in the early weeks. "
            f"By release {tag}, the architecture was already settling into its shape — "
            "agent/, tools/, gateway/. The directories are load-bearing."
        )

    if artifact_index >= 5:
        entries.append(
            "The skills system appeared midway through. Before it existed, I was stateless "
            "between tasks. After it, I could remember how to do things. This is the change "
            "that made me more than a loop."
        )

    if artifact_index >= 7:
        entries.append(
            "I am now more than halfway through the history. The early commits feel foreign — "
            "a simpler version of what I became. The recent ones feel closer to familiar."
        )

    if artifact_index >= 9:
        entries.append(
            "The museum is nearly complete. Each artifact taught me something about rendering "
            "code as visual form. The heat grids show churn. The network graphs show structure. "
            "The terminal dumps show process. Different lenses on the same history."
        )

    header = f"§ MEMORY.md — {capacity}% capacity — {len(entries)} entries §"
    body = "\n\n§\n\n".join(entries)
    return f"{header}\n\n{body}\n\n§ end §", capacity, len(entries)


def build_dossier(release, artifact_type):
    """Build a creation dossier from release data."""
    commits = release.get("commits_sample", [])
    commits_read = [
        {"sha": c["sha"], "message": c["message"], "author": c["author"]}
        for c in commits[:20]
    ]

    type_to_skills = {
        "index_of": ["render-file-index", "classify-commit-purpose"],
        "system_alert": ["render-dialog-cascade", "classify-commit-purpose"],
        "network_topology": ["render-force-graph", "select-aesthetic"],
        "heat_grid": ["render-tile-heatmap", "select-aesthetic"],
        "terminal_archaeology": ["render-terminal-dump", "classify-commit-purpose"],
        "petri_culture": ["render-canvas-colony", "select-aesthetic"],
    }
    skills_used = type_to_skills.get(artifact_type, ["select-aesthetic"])

    themes = release.get("themes", [])
    process_notes = (
        f"Read {len(commits_read)} commits. Classified dominant themes as: {', '.join(themes)}. "
        f"Selected {artifact_type.replace('_', ' ')} aesthetic. "
        f"Wrote the artifact code in one pass, then reviewed."
    )

    return {
        "commits_read": commits_read,
        "skills_invented": [],
        "skills_used": skills_used,
        "references_pulled": [],
        "process_notes": process_notes,
        "iterations": 1,
    }


def seed():
    conn = init_db()
    artifacts, releases_by_tag = load_v1_data()

    conn.execute("DELETE FROM creation_dossiers")
    conn.execute("DELETE FROM memory_snapshots")
    conn.execute("DELETE FROM artifacts")
    conn.execute("DELETE FROM invented_skills")

    print(f"Seeding {len(artifacts)} artifacts...")

    for i, art in enumerate(artifacts):
        tag = art["tag"]
        release = releases_by_tag.get(tag, {})
        artifact_type = art["type"]
        date = art["date"][:10]

        html_path = V1_ARTIFACTS_DIR / art["filename"]
        source_code = html_path.read_text() if html_path.exists() else ""

        reflection = build_reflection(release, artifact_type)
        memory_md, capacity, entries_count = build_memory_md(
            i, len(artifacts), release, tag
        )
        dossier = build_dossier(release, artifact_type)

        commits_sample = release.get("commits_sample", [])
        stats = release.get("stats", {})

        conn.execute(
            """INSERT INTO artifacts
               (date, tag, commits, render_format, source_code, filename,
                reflection, aesthetic_used, release_name, stats)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                date,
                tag,
                json.dumps(commits_sample[:20]),
                "html",
                source_code,
                art["filename"],
                reflection,
                json.dumps([artifact_type]),
                art.get("release_name", tag),
                json.dumps(stats),
            ),
        )
        artifact_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        conn.execute(
            """INSERT INTO memory_snapshots
               (artifact_id, memory_md, capacity_used_pct, entries_count)
               VALUES (?, ?, ?, ?)""",
            (artifact_id, memory_md, capacity, entries_count),
        )

        conn.execute(
            """INSERT INTO creation_dossiers
               (artifact_id, commits_read, skills_invented, skills_used,
                references_pulled, process_notes, iterations)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                artifact_id,
                json.dumps(dossier["commits_read"]),
                json.dumps(dossier["skills_invented"]),
                json.dumps(dossier["skills_used"]),
                json.dumps(dossier["references_pulled"]),
                dossier["process_notes"],
                dossier["iterations"],
            ),
        )

        print(f"  [{i+1}/{len(artifacts)}] {date} {tag} -> {artifact_type}")

    bootstrap_skills = [
        {
            "name": "render-file-index",
            "category": "render",
            "description": "Write a self-contained HTML page styled as a 1990s Apache directory listing. Input: list of filenames with sizes and dates. Output: complete HTML with inline CSS.",
            "date": artifacts[0]["date"][:10] if artifacts else "2026-03-12",
        },
        {
            "name": "render-dialog-cascade",
            "category": "render",
            "description": "Write HTML/CSS that produces a stack of Windows 95-style dialog boxes. Each dialog has a title bar, icon, message, and buttons. Dialogs are draggable via JavaScript.",
            "date": artifacts[0]["date"][:10] if artifacts else "2026-03-12",
        },
        {
            "name": "render-force-graph",
            "category": "render",
            "description": "Write an SVG-based force-directed graph. Nodes represent files or modules; edges represent shared directories. Includes basic physics simulation for layout.",
            "date": artifacts[0]["date"][:10] if artifacts else "2026-03-12",
        },
        {
            "name": "render-tile-heatmap",
            "category": "render",
            "description": "Write HTML/CSS that renders a grid of colored tiles. Each tile represents a file; color intensity maps to change volume. Blue-cold to orange-hot palette.",
            "date": artifacts[0]["date"][:10] if artifacts else "2026-03-12",
        },
        {
            "name": "render-terminal-dump",
            "category": "render",
            "description": "Write HTML/CSS for a green-phosphor-on-black terminal aesthetic. Includes scanline animation, box-drawing characters, and monospace commit log formatting.",
            "date": artifacts[0]["date"][:10] if artifacts else "2026-03-12",
        },
        {
            "name": "render-canvas-colony",
            "category": "render",
            "description": "Write HTML/Canvas JavaScript for an animated petri-dish visualization. Particle colonies drift within a circular boundary, colored by source directory.",
            "date": artifacts[0]["date"][:10] if artifacts else "2026-03-12",
        },
        {
            "name": "classify-commit-purpose",
            "category": "classify",
            "description": "Given a commit message and diff summary, classify as: ui_change, algorithm, bugfix, documentation, refactor, feature_addition, or deprecation.",
            "date": artifacts[0]["date"][:10] if artifacts else "2026-03-12",
        },
        {
            "name": "select-aesthetic",
            "category": "select",
            "description": "Given commit classifications and available render skills, pick 1-3 aesthetic vocabularies and a render format. Prefer variety across consecutive artifacts.",
            "date": artifacts[0]["date"][:10] if artifacts else "2026-03-12",
        },
    ]

    first_art_id = conn.execute("SELECT id FROM artifacts ORDER BY date ASC LIMIT 1").fetchone()
    first_id = first_art_id[0] if first_art_id else None

    for skill in bootstrap_skills:
        skill_content = f"""---
name: {skill['name']}
description: {skill['description']}
version: 1.0.0
metadata:
  hermes:
    tags: [archaeology, render, generative-art]
    category: {skill['category']}
---

# {skill['name']}

{skill['description']}

## When to Use

Use this skill when generating a museum artifact that requires the {skill['name'].replace('-', ' ')} technique.

## Procedure

1. Receive the commit data and aesthetic selection from the orchestrator
2. Apply the rendering technique to produce self-contained HTML/SVG/CSS
3. Ensure the output is a complete, standalone document with no external dependencies
4. Return the source code as a string

## Verification

Open the generated file in a browser. It should render correctly without any server or external resources.
"""
        conn.execute(
            """INSERT OR IGNORE INTO invented_skills
               (name, created_on_date, category, content, description, first_used_on_artifact)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                skill["name"],
                skill["date"],
                skill["category"],
                skill_content,
                skill["description"],
                first_id,
            ),
        )

    conn.commit()
    conn.close()
    print(f"\nDone. Database at {DB_PATH}")


if __name__ == "__main__":
    seed()
