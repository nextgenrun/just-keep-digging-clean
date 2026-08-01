# Starlight Talent Tree V3 Polish

## Outcome

The shared ESC `TALENTS` page and physical Star Pillar now use a native
ultra-wide ImageGen foundation instead of stretching the earlier mockup into
the host rectangle. The visual hierarchy is calmer: three branch cards are
visible at once, the selected card is deliberately larger, authored controls
replace small floating labels, and the detail dossier has dedicated space.

Progression behavior is unchanged. The ten constellation upgrades, Bobo
ability prerequisites, first-star reveal routing, three Celestial Engines,
three-Heart ownership path, one-equipped limit, caps, save data, and God Mode
rules remain authoritative in their existing systems.

## ImageGen asset boundary

`sprites/UI/starlight-talent-tree-v3/` is a 29-asset runtime pack:

- eighteen approved V2 assets retained without destructive replacement;
- one native 1939x811 ultra-wide foundation with three navigation positions,
  three card alcoves, and a separate lower dossier;
- idle and selected navigation plaques;
- idle and selected talent ribbons;
- status and progress plaques;
- left and right carousel controls;
- idle and active star-step markers.

The new transparent assets have zero-alpha corners and full 0-255 alpha ranges.
The manifest pins dimensions, color modes, alpha extrema, and SHA-256 hashes.
Source generations are retained under
`sprites/UI/starlight-talent-tree-v3/sources/`.

## Responsive layout

`StarlightTalentTreeView` first fits a 2.390875:1 content surface inside the
available width and height. Width and height therefore participate in scaling;
the generated art is never independently stretched on one axis.

Each five-item ability branch uses a cyclic three-card window:

- the focused card occupies the large center alcove;
- the previous and next cards occupy smaller, dimmer side alcoves;
- arrows, ribbons, status, and progress all use authored images;
- hover never changes selection or rebuilds the dossier;
- clicking a side card or arrow recenters it with one horizontal tween;
- an Engine side card centers on the first click and acts on the second;
- first-star routing still selects the exact newly discovered material.

The Engine page follows the same proportions and always exposes all three
choices. A late-game save may own all three, but only one remains equipped and
only one Engine activation may exist.

## 2026-07-30 readability recomposition

The ESC shell now shares the Pillar's 1160px maximum width, giving both hosts
the foundation's full 1116px content width instead of shrinking the ESC view by
about twenty percent at 1280x720. The three runtime card centers were measured
from the painted alcoves and moved to `0.258 / 0.500 / 0.742`.

Approved constellation signs keep their original files. A small data table pins
each sign's non-transparent visible bounds; the shared placement helper then
scales and centers the painted symbol rather than its inconsistent transparent
padding. This fixes apparent left/right and vertical drift without manufacturing
replacement graphics.

The ImageGen foundation is now the sole idle frame layer. Runtime navigation
plaques appear only for the active tab, and talent/Engine ribbons appear only on
the centered choice. Flanks remain large, clean previews. The lower dossier is
reduced from five competing rows to four separated rows with larger title, body,
and metadata floors. Bobo locks, selection halos, progress, first-star routing,
Engine ownership/equip rules, and God Mode behavior are unchanged.

## Dynamic presentation

Phaser is limited to placement, clipping, live text, invisible hit regions,
alpha, scale, and motion. It does not draw visible cards, panels, plaques,
arrows, status seals, progress plates, or connectors.

Live text is confined to authored surfaces and uses the hierarchy defined in
`values/starlightTalentTree.js`. The flank cards hide secondary status, the
redundant five-step row is omitted, dossier copy is shortened, and body/meta
type has enforced readability floors. The only steady loop is the tracked Star
Heart pulse; card, lock, Engine, and hidden-page loops are removed. Arrow hover
nudges sideways, while actual card movement occurs only after click, arrow, or
keyboard input.

## God Mode and locks

Normal saves retain the Bobo seal until Quick Slash or Thunder Strike is
owned. Stored star progress remains banked behind that prerequisite.

God Mode uses the production ability provider, clears both prerequisite locks,
exposes all three Engines for free, ignores charge costs, and does not mutate
permanent ownership. Lifetime, impact, bounce, protected-tile, single-active,
and other Engine caps remain active.

The visual harness supports `&god=1` for the free-unlock state and
`&shell=pause` for exact ESC geometry without altering a save.

## Health and verification

The talent-tree snapshot requires:

- ten talent nodes and three Engine options;
- three navigation pages with exactly one visible;
- three visible branch cards on each initialized ability page;
- a live ability provider and zero locked branches in God Mode;
- every one of the 29 textures present;
- no more than one tracked steady-motion loop;
- no missing textures or black-core V1 celestial assets.

The same snapshot feeds `starlight-talent-tree-invariant`, the runtime canary
reporter, admin health presentation, and worker heartbeat route.

Primary checks:

- `testing/2026-07-28-starlight-talent-tree-contract.mjs`
- `testing/2026-07-28-constellation-upgrade-audit-contract.mjs`
- `testing/2026-07-26-celestial-engines-contract.mjs`
- `testing/2026-07-26-godmode-abilities-contract.mjs`
- `testing/2026-07-28-escape-ui-routing-contract.mjs`
- `testing/2026-07-29-ui-mouse-priority-contract.mjs`
- `testing/2026-07-28-starlight-talent-tree-visual-harness.html`

Browser review covers first-star, mid-progress, mastered, and God Mode states
at both compact and wide host sizes, all three pages, side-card recentering,
Engine selection, health data, and a fresh console error window.

## Rollback

The V2 directory and assets remain intact. Repointing
`STARLIGHT_TALENT_TREE_CONFIG.assets.basePath` and the matching asset map to V2
restores the earlier presentation without touching save data or progression
systems.

`?starHearts=0` remains the independent Celestial Engine runtime rollback and
does not delete saved ownership.
