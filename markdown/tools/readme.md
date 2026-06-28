# Tools & AI Tools — Dig Game Dev Environment

**Last updated:** 2026-06-25

This file inventories all available AI tools and development utilities. Always check here before writing new code — the right tool might already fix your problem.

---

## Reporting & Diagnostics Tools

| Tool | Location | What it does | When to use |
|------|----------|-------------|-------------|
| **Pathing Resolve** | `markdown/tools/pathing-resolve/` | Analyzes import paths and reports broken references | When imports fail to resolve, or before making large-scale import changes |
| **Comprehensive Import Fixer** | `ai-tools/2026-06-25-comprehensive-import-fixer.py` | Scans all .js files and rewires imports to canonical paths | After file moves, directory restructures, or when import errors accumulate |
| **Detect & Rewire** | `ai-tools/2026-06-25-detect-and-rewire-imports.py` | Detects wrong import paths and suggests corrections | When specific imports fail but you don't know the root cause |
| **Final Path Fixes** | `ai-tools/2026-06-25-final-path-fixes.py` | Applies remaining path corrections after bulk fixes | Cleanup pass after comprehensive import fixing |
| **Fix Remaining Paths** | `ai-tools/2026-06-25-fix-remaining-paths.py` | Handles edge cases missed by other fixers | When some imports still fail after bulk fix |
| **PlayScene Import Fix** | `ai-tools/2026-06-25-playScene-import-fix.py` | Specifically fixes PlayScene import paths | If PlayScene.js has broken imports |
| **Rewrite All Imports** | `ai-tools/2026-06-25-rewrite-all-imports.py` | Bulk rewrite of ALL import statements | Complete import path overhaul |
| **Rewire Imports** | `ai-tools/2026-06-25-rewire-imports.py` | Interactive import path rewiring | When you need to review changes before applying |
| **Rewire Imports Batch** | `ai-tools/rewire-imports.bat` | Windows batch file to run the rewire script | Quick run from command line |

## Corruption Fixing

| Tool | Location | What it does | When to use |
|------|----------|-------------|-------------|
| **Fix Corruption** | `ai-tools/_fix_corruption.ps1` | PowerShell script to detect and repair file corruption | If files show encoding issues, truncation, or binary corruption |

## Fixed Library

| Tool | Location | What it does | When to use |
|------|----------|-------------|-------------|
| **Fixed Library** | `ai-tools/fixed-library/` | Contains corrected/repaired versions of known problematic files | When a known buggy file needs replacement |

---

## Development Workflow

1. **Before making changes** — run `markdown/tools/pathing-resolve/` to check current import health
2. **If imports break** during changes — run the appropriate fixer from the list above
3. **After bulk operations** — run the complete fixer suite to catch edge cases
4. **If corruption is suspected** — run `_fix_corruption.ps1` first
5. **Document the fix** — add a dated entry in `/markdown/` with the resolution

---

## Related Pathing Guide

See `/markdown/pathing/readme.md` for import path conventions and the complete pathing-resolve tool documentation.