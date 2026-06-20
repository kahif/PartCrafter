# Vendored Skill

This is the `ui-ux-pro-max` skill (v2.5.0) vendored from the upstream plugin
so it works as a native Claude Code Skill without the plugin system.

- Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Upstream commit: b7e3af8
- License: MIT (see LICENSE) — © nextlevelbuilder

## Layout
- `SKILL.md` — skill instructions (script paths prefixed with `.claude/` for this repo)
- `scripts/` — search engine (search.py / core.py / design_system.py), Python 3 stdlib only
- `data/` — CSV knowledge base (styles, palettes, typography, UX, charts, per-stack guidelines)

## Usage
```
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain style
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system -p "Project"
```
