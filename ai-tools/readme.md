# AI Tools

All scripts created by LLMs to audit, fix, or edit the codebase.

## Rules (per `.clinerules` §4)
1. **Date-stamp all filenames:** `YYYY-MM-DD-description.ext`
2. **Archive outdated tools:** Move to `/archive/` with date prefix when superseded
3. **Keep readme updated:** Document what each active tool does

## Active Tools

| Tool | Purpose |
|------|---------|
| `2026-06-25-bulk-migrate.py` | Bulk file migration/restructuring |
| `2026-06-25-check-404s.ps1` | Check for 404 resource errors |
| `2026-06-25-fix-404s.py` | Fix 404 resource paths |
| `2026-06-25-fix-corruption.ps1` | Fix file corruption issues |
| `2026-06-25-rewire-imports.bat` | Batch import path rewire |
| `2026-06-25-compare-stubs.py` | Compare stub files against originals |
| `2026-06-25-fix-player-stubs.py` | Fix player stub files |

## Archive
Outdated import fixers from the initial restructuring have been archived to `/archive/2026-06-25-import-fixer-batch/`.