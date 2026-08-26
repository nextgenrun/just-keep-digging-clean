# Feedback Session Implementation Audit — 2026-08-18

## Animation runtime

- Production now resolves the Survival UAL repair-v2 profile through one cache revision in the setup and controller paths.
- Side-dig/run uses the existing repair-v2 contact and locomotion contracts; the stale July profile URL was removed.
- The repair-v2 and side-combo contracts pass. No Blender source was destructively rewritten during this runtime repair.

## Upgrade balance

- Audited all 37 upgrade definitions across six merchants for identifiers, costs, caps, effect ownership, and one-time semantics.
- Corrected Dragon Pickaxe from `360 M` to `360,000 M`, restoring the intended progression after Rune Pickaxe at `75,000 M`.
- Torch drain, torch range, and Cave Eyes are available at Flight readiness instead of being depth-locked behind the danger they solve.
- Hardcore Next Unlock prioritizes torch and GP survival upgrades when affordable.
- Hardcore stress gain now gains 5% resistance per meaningful player level, capped at 40%.
- Hardcore teleports cost zero in every route.

## Player-facing validation

- Tutorial ghost demonstrates descend and dig-down states independently of player input.
- Tutorial free Flight ends when the Flight teaching stage ends.
- Inventory contains authored Inventory, World Guide, Star Atlas, and Special Blocks surfaces.
- Map has a bottom-right clickable control and retains M-key support.
- Weather data is removed from the HUD while the weather simulation remains available for world presentation.
- Falling debris reuses the authored earthquake/cave-in hazards and exposes a contextual hold-Q GP shield.
