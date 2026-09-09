# Repository Agent Rules

- Before large changes, read `.clinerules`. Do not overengineer.
- This is a shared checkout and pre-existing uncommitted changes are normal.
- Do not repeatedly warn about a "dirty workspace" or ask to bypass it.
- Silently preserve unrelated changes and proceed with the requested, path-scoped work.
- Mention the dirty state only when it creates a concrete problem: overlapping edits, an active writer on the same files, a requested Git/destructive operation, or validation that cannot be isolated.
- Never broadly stage, stash, reset, restore, clean, move, or delete unrelated work.
- In the final response, discuss workspace dirt only if it materially affected the result.
