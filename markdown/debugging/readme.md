# Debugging

Active debugging workspace. No permanent code lives here.

## Rules (per `.clinerules` §6)
1. **Active debugging only** — no permanent code
2. **Once resolved** → document fix in `/markdown/` and clean up this directory
3. **Persistent bugs** → move to `/debugging/persistant-bugs/` and `/markdown/persistant-bugs/`
4. **Solved at root** → move to `/markdown/persistant-bugs/solved-at-root/`

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `/debugging/persistant-bugs/` | Bugs that resist fixing — tracked long-term |
| `/markdown/persistant-bugs/` | Documentation for persistent bugs |
| `/markdown/persistant-bugs/solved-at-root/` | Bugs solved by root-cause fix |

## Workflow
1. Encounter bug → create debugging file here
2. Solve bug → document fix in `/markdown/` with date-stamp
3. Clean up debugging file
4. If bug persists → move to `persistant-bugs/`