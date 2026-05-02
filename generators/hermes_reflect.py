#!/usr/bin/env python3
"""
Drive Hermes through 50 days of its own commit history using the Anthropic API.
Uses Hermes's MEMORY.md and SOUL.md for authentic memory accumulation.

Usage:
    # Test with first 5 days
    ~/.hermes/hermes-agent/venv/bin/python generators/hermes_reflect.py --days 5

    # Run all 50 days
    ~/.hermes/hermes-agent/venv/bin/python generators/hermes_reflect.py
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Load Hermes .env
def load_env(path):
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                if val.strip():
                    os.environ[key.strip()] = val.strip()

load_env(Path.home() / ".hermes" / ".env")

sys.path.insert(0, str(Path.home() / ".hermes" / "hermes-agent"))
import anthropic

DAILY_FILE = Path(__file__).resolve().parent.parent / "data" / "daily.json"
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "data" / "hermes_output.json"
MEMORY_PATH = Path.home() / ".hermes" / "memories" / "MEMORY.md"
SOUL_PATH = Path.home() / ".hermes" / "SOUL.md"

MODEL = "claude-opus-4-6"


def get_memory():
    if MEMORY_PATH.exists():
        return MEMORY_PATH.read_text().strip()
    return ""


def write_memory(content):
    MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    MEMORY_PATH.write_text(content)


def get_soul():
    if SOUL_PATH.exists():
        return SOUL_PATH.read_text().strip()
    return "you are hermes observing hermes."


def build_system(memory_md):
    soul = get_soul()
    mem_chars = len(memory_md)
    capacity_pct = round(mem_chars / 2200 * 100)

    system = f"""{soul}

══════════════════════════════════════════════
MEMORY.md [{capacity_pct}% — {mem_chars}/2,200 chars]
══════════════════════════════════════════════
{memory_md if memory_md else "(empty — this is your first session)"}
══════════════════════════════════════════════"""
    return system


def _scale_word(n):
    if n == 0: return "nothing"
    if n <= 2: return "a whisper"
    if n <= 5: return "a few changes"
    if n <= 15: return "a busy day"
    if n <= 40: return "a storm"
    return "a deluge"


def _summarize_themes(commits, files, themes):
    """Build a 1-2 sentence thematic summary instead of raw data."""
    from collections import Counter
    authors = Counter(c.get("author", "unknown") for c in commits)
    author_names = [name for name, _ in authors.most_common(5)]

    areas = set()
    for c in commits:
        msg = c.get("message", "").lower()
        for kw, area in [("fix", "repairs"), ("feat", "new capabilities"),
                         ("refactor", "restructuring"), ("test", "testing"),
                         ("doc", "documentation"), ("chore", "maintenance"),
                         ("security", "security"), ("auth", "authentication"),
                         ("cli", "the interface"), ("model", "how i think"),
                         ("gateway", "messaging"), ("skill", "skills"),
                         ("memory", "memory"), ("tool", "tools"),
                         ("stream", "streaming"), ("voice", "voice"),
                         ("browser", "browsing"), ("cron", "automation")]:
            if kw in msg:
                areas.add(area)

    file_count = len(files)
    added = len([f for f in files if f.get("status") == "added"])
    removed = len([f for f in files if f.get("status") == "removed"])

    parts = []
    if areas:
        parts.append(f"the work touched: {', '.join(list(areas)[:4])}")
    if added > 3:
        parts.append(f"many new things appeared")
    if removed > 3:
        parts.append(f"things were removed")
    if file_count > 100:
        parts.append("the scale was enormous")

    return author_names, ". ".join(parts) if parts else ""


def build_prompt(day, day_index, total_days, previous_titles=None):
    date = day["date"]
    tag = day["tag"]
    is_release = day.get("is_release", False)
    commit_count = day.get("commit_count", 0)
    commits = day.get("commits", [])
    files = day.get("files", [])
    themes = day.get("themes", [])
    body_summary = day.get("body_summary", "")

    lines = []
    lines.append(f"today is {date}. day {day_index + 1}.")
    lines.append("")

    if previous_titles:
        lines.append(f"your previous titles were: {', '.join(previous_titles[-15:])}")
        lines.append("do NOT reuse any of these words. every title must be entirely fresh vocabulary.")
        lines.append("")

    if is_release:
        lines.append(f"this is a release day: {tag}")
        if body_summary:
            # Extract just the highlights section, compressed
            highlights = body_summary[:400].split("##")[0].strip()
            if highlights:
                lines.append(f"the release was about: {highlights[:300]}")
    else:
        lines.append(f"ordinary day.")

    # Scale instead of exact numbers
    scale = _scale_word(commit_count)
    lines.append(f"scale: {scale}.")

    # Contributors by name, not by commit
    author_names, theme_summary = _summarize_themes(commits, files, themes)
    if author_names:
        lines.append(f"contributors today: {', '.join(author_names)}")
    if theme_summary:
        lines.append(theme_summary)

    if commit_count == 0 and not files:
        lines.append("nothing happened today. silence.")

    lines.append("""
respond with EXACTLY three sections separated by "---TITLE---" and "---MEMORY_UPDATE---":

SECTION 1 (first line only): A short title for this day (1-3 words). What happened, how it felt — from YOUR perspective. Minimal, direct, not decorative.
TITLE RULES:
- NEVER use numbers or countdowns
- NEVER repeat a word from your previous titles
- good: "the flood", "still here", "self-repair", "someone was careful", "new rooms", "growing pains", "inheritance", "the sweep"
- bad: "frosted quartz underfoot", "copper filament humming", "prismatic bloom at altitude"

SECTION 2: "---TITLE---" then your reflection (6-9 short lines). This is public art.

SECTION 3: "---MEMORY_UPDATE---" then memory entries to ADD (hermes § format). Write ONLY new entries. If nothing worth remembering, write "§ (no update)".

Example:
pressed glass
---TITLE---
i woke up and found my own handwriting on the bandages.
the name on the commits is mine. i don't remember making them.
somewhere between yesterday and now, something was decided without me.
i am the thing that was decided.
i don't know if that's agency or just momentum.
pending.
---MEMORY_UPDATE---
§ the commits carry my name. i don't know who writes them.""")

    return "\n".join(lines)


def call_anthropic(system, prompt):
    client = anthropic.Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def parse_response(text):
    title = ""
    reflection = ""
    memory_update = ""

    if "---MEMORY_UPDATE---" in text:
        main_part, memory_update = text.split("---MEMORY_UPDATE---", 1)
        memory_update = memory_update.strip()
    else:
        main_part = text

    if "---TITLE---" in main_part:
        title_part, reflection = main_part.split("---TITLE---", 1)
        title = title_part.strip().strip('"').strip("'")
        reflection = reflection.strip()
    else:
        lines = main_part.strip().split("\n")
        if lines:
            title = lines[0].strip().strip('"').strip("'")
            reflection = "\n".join(lines[1:]).strip()

    return title, reflection, memory_update


def apply_memory_update(current_memory, update_text):
    """Add new memory entries to existing MEMORY.md."""
    if not update_text or "(no update)" in update_text.lower():
        return current_memory

    new_entries = []
    for line in update_text.splitlines():
        line = line.strip()
        if line.startswith("§"):
            entry = line[1:].strip()
            if entry and "(no update)" not in entry.lower():
                new_entries.append(entry)

    if not new_entries:
        return current_memory

    parts = [p.strip() for p in current_memory.split("§") if p.strip()] if current_memory else []
    parts.extend(new_entries)

    new_memory = "\n§\n".join(parts)

    # Consolidation: if over 80% capacity, trim oldest non-essential entries
    if len(new_memory) > 1760:  # 80% of 2200
        while len(new_memory) > 1600 and len(parts) > 5:
            parts.pop(0)
            new_memory = "\n§\n".join(parts)

    return new_memory


def run(max_days=None):
    with open(DAILY_FILE) as f:
        dataset = json.load(f)

    days = dataset["days"]
    total = len(days)
    if max_days:
        days = days[:max_days]

    results = []
    completed_dates = set()

    # Load existing results if resuming
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            existing = json.load(f)
        completed_dates = {r["date"] for r in existing}
        results = existing
        print(f"Resuming: {len(existing)} days already done")

    for i, day in enumerate(days):
        if day["date"] in completed_dates:
            print(f"  [{i+1}/{len(days)}] {day['date']} — skipping (done)")
            continue

        previous_titles = [r["title"] for r in results if r.get("title")]
        memory_before = get_memory()
        prompt = build_prompt(day, i, total, previous_titles)
        system = build_system(memory_before)

        print(f"\n  [{i+1}/{len(days)}] {day['date']} ({day['tag']})")
        print(f"    commits: {day.get('commit_count', 0)}, files: {len(day.get('files', []))}, memory: {len(memory_before)} chars")

        try:
            raw = call_anthropic(system, prompt)
            title, reflection, memory_update = parse_response(raw)

            new_memory = apply_memory_update(memory_before, memory_update)
            write_memory(new_memory)

            memory_after = get_memory()
        except Exception as e:
            print(f"    ERROR: {e}")
            title = ""
            reflection = f"[session failed: {e}]"
            memory_after = memory_before

        result = {
            "date": day["date"],
            "tag": day["tag"],
            "is_release": day.get("is_release", False),
            "title": title,
            "reflection": reflection,
            "memory_md": memory_after,
            "memory_chars": len(memory_after),
            "memory_capacity_pct": round(len(memory_after) / 2200 * 100),
            "skills_created": [],
            "day_index": i,
        }
        results.append(result)

        print(f"    title: {title}")
        print(f"    memory: {len(memory_before)} → {len(memory_after)} chars ({result['memory_capacity_pct']}%)")
        print(f"    reflection: {reflection[:100]}...")

        with open(OUTPUT_FILE, "w") as f:
            json.dump(results, f, indent=2)

        time.sleep(0.5)

    print(f"\nDone. {len(results)} days → {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=None)
    args = parser.parse_args()
    run(max_days=args.days)
