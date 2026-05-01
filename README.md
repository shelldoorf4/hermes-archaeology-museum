# Hermes Archaeology Museum

Software history rendered as interface archaeology.

The Hermes Agent examines its own codebase evolution and generates post-internet
artifacts — directory indexes, system dialogs, network graphs, heat grids,
terminal dumps, and petri cultures — one per release, daily going forward.

Built for the Nous Research Hermes Agent Creative Hackathon.

## Quickstart

```bash
pip install -r requirements.txt
export GITHUB_TOKEN=ghp_...        # optional, raises rate limit
python generators/orchestrator.py  # fetch data + generate all artifacts
```

Open `website/index.html` in a browser.

## Running via Hermes Agent

```bash
# One-step setup: installs skill + dependencies
bash setup_hermes.sh

# Then ask Hermes:
#   "Use the archaeology-museum skill to generate artifacts for all releases"
```

### Daily Cron (automated new-release detection)

Inside a Hermes session:

```
/cron add "0 0 * * *" "The check_new_releases script output tells you if there
are new Hermes Agent releases without artifacts. If NEW_RELEASES_DETECTED,
navigate to the project directory shown in the output, delete data/releases.json,
and run python3 generators/orchestrator.py. If [SILENT], do nothing."
--script ~/.hermes/skills/archaeology-museum/scripts/check_new_releases.py
--skill archaeology-museum --name "archaeology-museum-daily"
```

## Artifact Types

| Type | Visual Language | When Used |
|------|----------------|-----------|
| Index of / | Apache directory listing | New modules added |
| System Alert | Win95 / OS 9 dialog cascade | Bug fixes, breaking changes |
| Network Topology | Force-directed SVG graph | Architecture changes |
| Heat Grid | Colored tile matrix | High file churn |
| Terminal Archaeology | Green phosphor terminal | Infrastructure / CLI changes |
| Petri Culture | Canvas growth visualization | Growth milestones |

## Project Structure

```
hermesy/
├── generators/          # Python artifact generators
│   ├── fetch_data.py
│   ├── artifact_base.py
│   ├── index_of.py
│   ├── system_alert.py
│   ├── network_topology.py
│   ├── heat_grid.py
│   ├── terminal_archaeology.py
│   ├── petri_culture.py
│   └── orchestrator.py
├── hermes-skill/
│   └── SKILL.md
├── website/
│   ├── index.html
│   ├── viewer.html
│   ├── css/museum.css
│   ├── js/museum.js
│   └── artifacts/
├── data/
│   └── releases.json
└── requirements.txt
```

## License

MIT
