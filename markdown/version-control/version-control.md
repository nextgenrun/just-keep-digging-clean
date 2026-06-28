# Version Control - Dig Game Dev Environment

**Last updated:** 2026-06-29

This project uses a **3-tier version control system** to prevent code loss, enable rollback, and maintain a clean development history.

---

## Tier 1: Active Development (dig-game-dev-env-cleaned/)

**This is the ONLY place where code is added, removed, or changed.**

- All new features, bug fixes, and refactors happen here
- Code is written from scratch to simulate the dev env - no direct copying of broken files
- Deployable builds are generated from this directory
- This is the source of truth for the game runtime

**Rules:**
- No code lives exclusively outside this directory
- No "backup" copies of active code should exist elsewhere
- If a file needs to be archived, move it to /archive/ with a date prefix
- If a file is experimental, prefix with _ or place in /ai-tools/ with date stamp

---

## Tier 2: Local Backups (back-ups-dig-game/)

Located at `C:\xampp\_Backups\dig-game-simple\back-ups-dig-game\`

**Structure:**
- Date-stamped directories: `DD-MM-YYYY/` or `DD-MM-YYYY-description/`
- Each directory contains a complete snapshot of the project at that point
- Snapshots are created before major changes, rewrites, or risky operations
