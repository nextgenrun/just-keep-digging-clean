# Starlight Talent Tree V4 — Mockup-Fidelity Pass

## Outcome

The shared ESC Talents and physical Star Pillar views now use one tall,
single-frame celestial composition built to match the approved mockup. The old
wide panel-within-a-panel presentation is no longer visible while Starlight is
open.

The runtime keeps the existing talent, Bobo-lock, God Mode, Engine, save, and
first-Star reveal authority. This pass changes presentation and host geometry;
it does not change reward math or unlock rules.

## Authored visual package

- Runtime package:
  `sprites/UI/starlight-talent-tree-v4/`
- New ImageGen foundation:
  `starlight-mockup-foundation-v4.png`
- Native source: `1672 x 941`, opaque RGB composition
- SHA-256:
  `55d30c1ff7f7ff86f20c3a5ae08d9c534eeff7d2941b0e7350a5816a2dbc519d`
- The 28 approved transparent V3 signs, locks, Engines, arrows, ribbons, and
  ornaments remain unchanged and are copied into the V4 runtime package.
- The ImageGen source is retained under
  `sprites/UI/starlight-talent-tree-v4/sources/`.

The foundation intentionally contains only authored celestial architecture:
one antique-gold frame, three navigation plaques, three large sign alcoves,
embedded side-arrow housings, and one broad lower dossier. Dynamic Phaser
objects supply only real state: titles, sign/Engine art, locks, levels, reward
copy, and invisible hit areas.

## Runtime composition

- Aspect changed from the V3 `2.39:1` strip to the approved `1.7768:1` tall
  composition.
- ESC Talents mounts across the fitted pause shell instead of inside the small
  generic tab body.
- Generic ESC shell chrome is hidden only while Talents is active, preventing a
  double frame. Clicking `PAUSED` returns to the normal ESC pages; Escape still
  closes the menu.
- The physical Star Pillar uses the same full-shell V4 composition and retains
  its authored close control.
- Three branch choices remain visible. The selected center choice is the focal
  object; side choices remain quieter but readable.
- Branch tabs, sign art, lock seals, labels, Engine medallions, and the lower
  dossier were enlarged together so spacing and art scale stay coherent.
- The lower dossier owns the selected sign/Engine art, mutation or Engine role,
  exact description, Sign level progress, Star yield state, and Star Heart
  count.

## Input and motion

- Page tabs and all three visible choices are mouse-selectable.
- Side arrows move horizontally on hover; nothing follows or sits under the
  pointer.
- Carousel transitions remain bounded tweens.
- Only the selected reward art may own one restrained steady loop.
- No card, tab, lock, or Engine creates an infinite hover loop.

## Health and failure detection

`StarlightTalentTreeView.getHealthSnapshot()` still verifies:

- 10 constellation controls;
- 3 Engine controls;
- 3 pages with exactly one visible;
- 3 visible choices on each talent branch;
- ability-provider readiness;
- no missing Starlight or constellation textures;
- at most one steady motion loop.

The existing runtime canary and health worker forward a Starlight invariant
finding if this snapshot becomes unhealthy.

## Validation

- `testing/2026-07-28-starlight-talent-tree-contract.mjs`
  - pins the V4 asset dimensions/hash and exact 29-file runtime inventory;
  - verifies full-shell ESC and Star Pillar integration;
  - checks large art/readability floors and dossier containment;
  - preserves Bobo locks, first-Star routing, Engine actions, and worker alerts.
- `testing/2026-07-30-starlight-mockup-fidelity-live-qa.mjs`
  - renders all three pages through the real Phaser view;
  - rejects missing textures, invalid page state, and browser exceptions;
  - captures both `1280 x 720` and compact `960 x 640` layouts.
- Adjacent ESC routing, mouse-priority, pause-loading, constellation modifier,
  Engine, God Mode, release-safety, and Boot asset contracts remain green.
- The broad system-health sweep loaded all 252 system modules with 252 syntax
  passes, 252 module-load passes, and zero blocking failures.

## Visual evidence

Final captures live in:

`visual-approval-previews/starlight-talent-tree-v4/`

The `compact-approved-page-*.png` set proves the smallest supported review
layout without the old double shell. The final large-resolution set is captured
after the same single-frame runtime path is mounted.

## Rollback boundary

The V3 package remains untouched at:

`sprites/UI/starlight-talent-tree-v3/`

To roll back this presentation, restore the prior
`values/starlightTalentTree.js` V3 asset path, foundation filename, aspect, and
layout values, then remove the immersive shell visibility calls from
`PlaySceneUI`, `StarPillarSystem`, and the visual harness. No save migration or
gameplay rollback is required because V4 changes no persisted talent data.
