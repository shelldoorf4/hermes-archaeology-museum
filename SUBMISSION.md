# Hermes Archaeology Museum

**Software history rendered as interface archaeology.**

## What it is

The Hermes Agent examines its own codebase evolution and generates post-internet
art artifacts — one per release, daily going forward. Each artifact is a self-contained
HTML artwork in a distinct visual language drawn from digital art history:

- **Index of /** — Apache directory listings (ref: 0100101110101101.org)
- **System Alert** — Win95/OS9 dialog cascades (ref: Perry Hoberman)
- **Network Topology** — Force-directed SVG graphs (ref: I/O/D WebStalker)
- **Heat Grid** — Colored tile matrices (ref: data visualization art)
- **Terminal Archaeology** — Green phosphor terminal dumps
- **Petri Culture** — Animated canvas growth patterns (ref: Eduardo Kac)

The museum is self-referential: Hermes Agent is both subject and author.

## Live demo

https://shelldoorf4.github.io/hermes-archaeology-museum/

## Source code

https://github.com/shelldoorf4/hermes-archaeology-museum

## How it uses Hermes Agent

1. **Skill System** — A custom `archaeology-museum` skill teaches Hermes
   the full pipeline: fetch release data, analyze changes, select an artifact
   type based on the narrative character of each release, generate HTML art.

2. **Cron Scheduling** — A daily cron job with a pre-script checks GitHub for
   new Hermes Agent releases. When one is found, Hermes generates a new artifact
   and updates the museum. When nothing is new, it stays silent.

3. **Memory / Self-Improvement** — The skill instructs Hermes to remember which
   artifact types it assigned and why, refining its curatorial judgment over time.

4. **Tool Use** — Terminal execution, GitHub API interaction, file I/O — all
   orchestrated through Hermes's native tool stack.

## Tech

- Pure Python artifact generators (no image generation APIs — the code IS the art)
- Self-contained HTML/SVG/Canvas artifacts with zero external dependencies
- Brutalist gallery website (raw HTML/CSS/JS, no framework)
- GitHub Actions for CI/CD and daily generation
- GitHub Pages for hosting

## Built for

Nous Research Hermes Agent Creative Hackathon
