# Celestial echo and burn follow-up — September 5, 2026

Historical September 5 evidence. The September 6 crisp presentation supersedes the core fading, fire trails and burn residue described below; matching echoes remain enabled.

- Wayward outbound, return, speed bonuses and permanent-companion motion are
  60% slower. Baseline flight is now 3.2 tiles/s, previously 8.
- Star cores cycle through azure, violet and ember, including single-star
  activations. These are static colour treatments of the approved 512 px core.
- Contact flashes, fragments and trails use five colours: azure, violet,
  ember, mint and rose.
- Both abilities reuse the existing high-resolution dig flash/fragment atlases
  for a clear contact point and short ember residue. Wayward intersects the
  incoming path with the struck tile face; Lance keeps its authored hand/foot
  release and scheduled surface contacts.
- Star fire trails pivot behind the core. Cinder retains its fixed 64x28 size
  and 225 px/s speed, fades to 32% opacity, and emits bounded fading echoes.
  The previously approved rare prismatic Cinder shot remains available.

No new raster art, procedural placeholder graphics, damage changes, hitstop
or camera shake were introduced by this pass. Echoes, flashes, residue and
fragments are bounded and are destroyed with their owners.

## Current review

[Open the animation preview](http://localhost:8080/testing/2026-09-05-celestial-presentation/index.html?ability=star&rank=3).

The Wayward, Lance and companion WebM recordings in this directory use the
production renderers served by the canonical `serve.py`.
Fresh maximum-rank and companion previews reported zero runtime errors and
zero missing textures. Three permanent companions were active.

`wayward-gameplay-contact.json/.png` is the final aligned Star capture:
native S+3 input, two real tile contacts at 3.2 tiles/s, with contact and
trail counts published by the production engine.
`lance-gameplay.json/.png` captures an actual S+F mining strike: an authored
hand/foot release, five destroyed blocks, seven live echoes and contact residue.
These runs used the existing God Mode/E2E fixture with save writes blocked.

The completed task "Polish fireball lance projectiles" supplied the final
visible-contact-frame correction during this pass. Its contact origin, frame
alignment and compact size were preserved. The echo emission hook was
reconciled with that finished work, then rechecked in the live preview.

## Validation

Six test entry points pass; the echo/burn check also runs the shared
presentation lifecycle contract:

- `testing/2026-09-05-celestial-echo-burn-contract.mjs`
- `testing/2026-08-31-stellar-lance-vfx-hud-contract.mjs`
- `testing/2026-09-05-lance-three-versions/contact-contract.mjs`
- `testing/2026-09-03-celestial-talent-skill-audit-contract.mjs`
- `testing/2026-09-04-celestial-apex-passives-contract.mjs`
- `testing/2026-08-03-celestial-runtime-wiring-contract.mjs`

Coverage includes real-engine movement distance, returns and companion speeds;
three star colours and five contact colours; all tile faces and a corner;
trail alignment; fixed-size fading Cinder shots; the existing launch-frame
regression; allocation limits; and cancellation/teardown.

This is focused validation, not a full-repository or long-session performance run.
`baseline.json` preserves the pre-follow-up source. The edit manifests record
the staged changes; later small fixes and overlap reconciliation are represented
by the current source hashes in `checks.json`.
