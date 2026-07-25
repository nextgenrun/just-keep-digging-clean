# V11 Split Sky Islands — TMX Wiring

The approved split sky-island composition is authored into:

`exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx`

## Authored geometry

- Level divider: bedrock column at source tile `x=159`, rows `40..104`.
- All other bedrock above ground row `105` is cleared to open the sky.
- Level 1 platform: source tiles `x=120..135`, walkable top row `58`.
- Level 2 platform: source tiles `x=182..197`, walkable top row `58`.
- Each platform contains four static eclipse-gate objects.
- The portals are image objects, not `TELEPORT_TILE` gameplay tiles.

## Portal-bank contract

The TMX objects declare the intended later runtime policy:

- two independent banks, one per level;
- four portal slots per bank;
- retain the four deepest destinations discovered for that level;
- a newly discovered deeper destination replaces that bank's shallowest slot;
- the TMX property `runtimeWired=false` remains authoritative until gameplay
  cycling and safe-return logic are implemented separately.

## Assets and rollback

- Tileset: `sprites/backgrounds/world-v11-sky-islands-v1/world-v11-sky-islands-v1.tsx`
- Approval preview: `visual-approval-previews/v11-split-sky-islands-wired-2026-07-13.png`
- Validation report: `visual-approval-previews/v11-split-sky-islands-wired-2026-07-13.json`
- Backup: `exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test-before-split-sky-island-wire-2026-07-13.tmx`

The date-stamped wiring tool is idempotent and validates exactly two platforms,
eight portal objects, and 65 sky-bedrock divider tiles.
