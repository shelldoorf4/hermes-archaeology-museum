"""
Orchestrator: fetch data, select artifact types per release, generate all artifacts.

Each release gets ONE primary artifact type based on its dominant theme.
The selection ensures visual variety across the museum.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from generators.fetch_data import build_full_dataset
from generators.index_of import generate as gen_index_of
from generators.system_alert import generate as gen_system_alert
from generators.network_topology import generate as gen_network_topology
from generators.heat_grid import generate as gen_heat_grid
from generators.terminal_archaeology import generate as gen_terminal_archaeology
from generators.petri_culture import generate as gen_petri_culture

GENERATORS = {
    "index_of": gen_index_of,
    "system_alert": gen_system_alert,
    "network_topology": gen_network_topology,
    "heat_grid": gen_heat_grid,
    "terminal_archaeology": gen_terminal_archaeology,
    "petri_culture": gen_petri_culture,
}

THEME_TO_TYPE = {
    "new_modules": "index_of",
    "bugfix": "system_alert",
    "architecture": "network_topology",
    "high_churn": "heat_grid",
    "infrastructure": "terminal_archaeology",
    "growth": "petri_culture",
    "general": "heat_grid",
}

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "website" / "artifacts"
REGISTRY_FILE = ARTIFACTS_DIR / "artifacts.json"


def select_type(release, used_types):
    """Pick the best artifact type for a release ensuring all 6 types appear."""
    themes = release.get("themes", ["general"])
    all_types = list(GENERATORS.keys())

    type_counts = {t: used_types.count(t) for t in all_types}
    min_count = min(type_counts.values()) if type_counts else 0
    underused = [t for t, c in type_counts.items() if c == min_count]

    candidates = []
    for theme in themes:
        atype = THEME_TO_TYPE.get(theme)
        if atype:
            candidates.append(atype)

    preferred = [c for c in candidates if c in underused]
    if preferred:
        for p in preferred:
            if p not in used_types[-1:]:
                return p
        return preferred[0]

    if underused:
        for u in underused:
            if u not in used_types[-1:]:
                return u
        return underused[0]

    for c in candidates:
        if c not in used_types[-2:]:
            return c

    return candidates[0] if candidates else all_types[0]


def generate_artifact(release, artifact_type):
    """Generate a single artifact, write HTML file, return metadata."""
    gen_fn = GENERATORS[artifact_type]
    html_content, meta = gen_fn(release)

    tag_slug = release["tag"].replace(".", "-").replace("/", "-")
    filename = f"{tag_slug}_{artifact_type}.html"
    filepath = ARTIFACTS_DIR / filename

    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w") as f:
        f.write(html_content)

    meta["filename"] = filename
    meta["file_size"] = len(html_content)
    return meta


def generate_all(use_cache=True):
    """Generate artifacts for all releases."""
    dataset = build_full_dataset(use_cache=use_cache)
    releases = dataset["releases"]

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    existing_registry = []
    if REGISTRY_FILE.exists():
        with open(REGISTRY_FILE) as f:
            existing_registry = json.load(f).get("artifacts", [])
    existing_tags = {a["tag"] for a in existing_registry}

    all_artifacts = list(existing_registry)
    used_types = [a["type"] for a in existing_registry]

    for rel in releases:
        if rel["tag"] in existing_tags:
            print(f"  Skipping {rel['tag']} (already generated)")
            continue

        artifact_type = select_type(rel, used_types)
        print(f"  Generating {rel['tag']} -> {artifact_type}")

        meta = generate_artifact(rel, artifact_type)
        all_artifacts.append(meta)
        used_types.append(artifact_type)

    all_artifacts.sort(key=lambda a: a.get("date", ""))

    registry = {
        "generated_at": dataset["generated_at"],
        "repo": dataset["repo"],
        "total_artifacts": len(all_artifacts),
        "artifacts": all_artifacts,
    }

    with open(REGISTRY_FILE, "w") as f:
        json.dump(registry, f, indent=2)

    print(f"\nGenerated {len(all_artifacts)} artifacts")
    print(f"Registry: {REGISTRY_FILE}")
    return registry


if __name__ == "__main__":
    force = "--force" in sys.argv
    if force and REGISTRY_FILE.exists():
        os.remove(REGISTRY_FILE)
        for f in ARTIFACTS_DIR.glob("*.html"):
            f.unlink()
        print("Cleared existing artifacts")

    registry = generate_all(use_cache=True)
    for a in registry["artifacts"]:
        print(f"  {a['tag']:20s}  {a['type']:25s}  {a['filename']}")
