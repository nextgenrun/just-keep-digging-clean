# Celestial presentation review — September 5, 2026

Wayward Star and Hollow Sun now share the production `CelestialStarVfx` renderer.
It keeps the approved cores solid and fixed in size, with a faint surrounding
glow. Wayward leaves short matching echoes; Hollow keeps an opaque dark centre,
slow counterrotation and inward contact pulses. Permanent Apex cores stay solid,
with quieter and less frequent echoes.

[Open the current animation review](http://localhost:8080/testing/2026-09-05-celestial-presentation/index.html?ability=star&rank=3).
The review links to the separately approved Cinder Lance contact study.
Its compact, fixed-size shots and hand/foot release are retained, with short
matching echoes. Damage states do not resize or fade the projectile cores.

## September 5 evidence (historical)

- `wayward-preview.webm`, `hollow-preview.webm` and `passives-preview.webm`
  are current five-second recordings from the canonical `serve.py` runtime,
  with rank-3 talent fixtures and all three companions. PNGs accompany them.
- Fresh previews reported zero runtime errors and zero missing textures,
  including the new prismatic Cinder asset. Three passive companions were active.
- `wayward-gameplay.json/.png` and `hollow-gameplay.json/.png` capture native
  actionbar activations in the actual PlayScene, using the existing God Mode
  E2E fixture. Save writes were blocked and no runtime errors were reported.
  These gameplay captures precede the concurrent Cinder asset replacement;
  the refreshed rank-3 and passive recordings include its current assets.
- `checks.json` records seven passing focused contracts: shared presentation
  lifecycle, current Lance VFX/HUD, engine rules, runtime wiring, talent audit,
  Apex passives and Quickslash combinations. This was not a full repository run.
- The Wayward/Hollow definition blocks exactly match `baseline.json`.
  Damage, costs, targeting and progression retain their existing authority.
  The separate Cinder task owns its projectile-speed/contact changes.

The renderer caps transient images, throttles overlapping contact effects and
cleans up all owned images and tweens on completion or cancellation.
The presentation contract checks these limits, stationary trail suppression,
quieter companions, delayed cluster arrival, inward pulses and partial-build rollback.

## Historical evidence

Files beginning `superseded-wave-` show an earlier Lance implementation and
are retained only as history. They do not represent the current Cinder design.
Two older broad polish contracts already disagreed with pre-pass definitions:
the August 26 all-abilities check expected a removed Wayward supernova, and the
August 30 Starpillar check expected an earlier Lance duration. They were not
rewritten to conceal those baseline mismatches.

`gameplay.html?jkd_e2e=1` is a diagnostic copy of the game entry page. Its DOM
health panel is review-only; production UI is unchanged. The lightweight
`index.html` review never opens or writes player saves.

## September 6 crisp presentation

Celestial cores now retain full opacity and fixed size while visible. The strong flight fade, breathing distortion, mixed fire trails and impact burn residue are removed. Short echoes preserve their source palette and silhouette, sit behind the moving core, and fade smoothly on their own. Companion cores stay solid while their echoes remain quieter. Contact flashes are smaller, fixed in shape and brief. The Cinder contact gallery includes the same echo spacing and lifetime as gameplay.

Current checks: `verify-crisp.mjs` and `crisp-browser-proof.json` cover all three active skills and the passive companions in WebGL. More than 2,300 rendered core samples stayed at full opacity; echoes kept fixed shapes, stable headings and decreasing opacity. No burn residue, runtime errors or missing textures were observed. The `crisp-*.png` files capture the updated renderers.
