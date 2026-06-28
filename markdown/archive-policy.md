# Archive Policy — Dig Game Dev Environment

**Last updated:** 2026-06-25

This file defines what gets archived, where it goes, and when it can be deleted.

---

## 1. What Gets Archived

Move to archive if any of these apply:
- **Unused tools/scripts** — no longer referenced by the build or workflow
- **Replaced by newer version** — superseded by a better approach
- **Experimental or failed** — attempted solution that didn't work
- **Deprecated assets** — old sprites, sounds, or config that are no longer loaded
- **Old markdown** — `/markdown/` exceeds 10 files, archive oldest date-stamped files

## 2. What NEVER Gets Archived

- Active game code in `world/`, `player/`, `systems/`, `ui/`, `values/`
- Active asset files in `sprites/` or `sound/`
- Policy documents in `/markdown/` that are linked from `.clinerules` or `readme.md`
- The `readme.md` and `.clinerules` themselves

## 3. Archive Location and Format

All archived content goes into `/archive/`.

**Naming format:**
```
archive/
├── YYYY-MM-DD-description/
│   ├── (archived files)
│   └── INDEX.md       ← manifest explaining why it was archived
```

**INDEX.md template:**
```markdown
# Archived: YYYY-MM-DD-description

**Archived on:** YYYY-MM-DD
**Reason:** [unused | replaced-by-X | experimental | deprecated]
**Replaced by:** [link to new file or "nothing"]
**Last used in:** [commit hash or backup date]
**Safety:** [safe to delete after YYYY-MM-DD | keep indefinitely]
```

## 4. Deletion Policy

| Condition | Action |
|-----------|--------|
| Archived < 180 days | Keep |
| Archived > 180 days AND no code references exist | Safe to delete |
| Archived > 180 days BUT still referenced | Keep until references are updated |
| Archive contains last known working version | Keep indefinitely |

**Before deleting:**
1. Search the codebase for any import or reference to the archived files
2. Check `ai-tools/` for tools that reference the archived files
3. Verify no backup snapshot relies on those files
4. Update any INDEX.md to note the deletion

## 5. Archive Manifest

Every archive directory MUST have an `INDEX.md` file explaining:
- What was archived and why
- When it was archived
- What replaced it (if anything)
- When it's safe to delete
- Any dependencies that might break

The root `/archive/INDEX.md` lists all archived items in reverse chronological order.

## 6. Quick Rules

- ✅ Archive unused tools/scripts with date prefix
- ✅ Keep a manifest (`INDEX.md`) in every archive directory
- ✅ Delete from archive if >180 days AND no references
- ❌ Never delete active game code — only tools, scripts, experimental content
- ❌ Never archive code that is currently imported anywhere
- ❌ Don't archive something twice — update existing archive instead

---

**See also:**
- [organisation-policy.md](organisation-policy.md) — directory responsibilities
- [naming-policy.md](naming-policy.md) — naming conventions
- [version-control/version-control.md](version-control/version-control.md) — 3-tier version control