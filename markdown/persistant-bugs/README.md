# Persistent Bugs Database

Repository: `C:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned`
Audit date: 2026-08-09
Scope: active runtime, authored data, imports, assets, persistence, lifecycle cleanup, archive and legacy code
Rule: findings only; no application code was changed

This directory is the durable bug database requested for the Dig Game repository. The index is the entry point. Each finding records evidence, current impact, confidence, and a permanent solution setup rather than a one-off patch.

## Status

Ten evidence-backed findings are recorded. The active runtime load smoke test completed with one canvas and no console warnings or errors during the observation window. Static checks found no additional confirmed broken active imports, named exports, syntax errors, missing active media paths, duplicate runtime placement IDs, or unresolved direct PlayScene method calls.

The archive contains broken imports, so it is included as a legacy code finding even though it is not part of the shipped runtime. Vendor files under `libs` were treated as third-party code, not as project-owned defects.

## Severity

- `P2`: can cause player-visible data loss or invalid runtime values when the triggering condition occurs.
- `P3`: confirmed maintainability, reuse, or compatibility defect with limited current runtime impact.
- `P4`: confirmed inconsistency or naming debt with no current behavioral break.

## Files

- `BUG-INDEX.md`: sortable finding list and audit-cleared evidence.
- `PERMANENT-SOLUTION-SETUP.md`: reusable prevention and remediation workflow.
- `PERSIST-001-milestone-persistence.md`: swallowed milestone persistence failures.
- `PERSIST-002-clamp01-duplication.md`: duplicate numeric clamp implementations with different invalid-input behavior.
- `PERSIST-003-archive-broken-imports.md`: broken relative imports in archived modules.
- `PERSIST-004-animation-key-alias.md`: duplicate animation asset key literals.
- `PERSIST-005-tiled-layer-typos.md`: misspelled authored layer identifiers.
- `PERSIST-006-persistence-adapter-sprawl.md`: repeated progression storage adapters swallow failures independently.
- `PERSIST-007-render-helper-duplication.md`: repeated rendering helper implementations and inconsistent contracts.
- `PERSIST-008-shallow-frozen-asset-catalog.md`: a shallow-frozen asset catalog is mutated through nested runtime state.
- `PERSIST-009-manifest-type-contract.md`: valid but malformed JSON can escape the guarded audio manifest loader.
- `PERSIST-010-audio-catalog-drift.md`: audio preload lists and runtime library metadata are duplicated and disagree on paths.
Audit database now contains 21 evidence-backed findings. The latest continuation pass added PERSIST-018 through PERSIST-021. The latest confirmed documentation/runtime-contract defect is [PERSIST-021-stale-architecture-readmes.md](PERSIST-021-stale-architecture-readmes.md).
