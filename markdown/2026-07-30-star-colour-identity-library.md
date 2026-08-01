# Star Colour Identity Library V1

**Date:** 2026-07-30
**Status:** production-wired

## Player-facing result

Star Blocks now draw from fifty named colour identities instead of six
rarity-colour substitutions. Each identity has its own authored crystal and
light art, colour name, flavour line, and bounded steady-light motion profile.

Rarity and identity deliberately remain separate:

- rarity determines encounter odds, depth gate, Sign XP, material multiplier,
  Engine charge, and the ordinary-versus-wow popup treatment;
- identity determines the exact crystal frame, colour, flavour, and light
  character;
- a rarity can contain many colours.

The library is distributed as 12 Common, 10 Uncommon, 10 Rare, 8 Epic,
6 Mythic, and 4 Astral identities.

## I-key Star Atlas

`UIInventoryPopup` now has three tabs: `INVENTORY`, `WORLD GUIDE`, and
`STAR ATLAS`.

The Star Atlas uses one authored 1536 by 800 ImageGen foundation. Six rarity
tabs sit across the top. The active rarity exposes at most twelve large
identity selectors on the left and one readable dossier on the right. The
dossier explains:

- exact colour identity and reward rarity;
- flavour;
- light-effect name;
- first encounter depth;
- Sign XP;
- material multiplier;
- Engine charge.

The permanent rule reads `COLOUR IS IDENTITY • RARITY IS REWARD`. The guide is
always readable and does not add a second discovery lock. Phaser supplies only
dynamic text, exact authored star images, invisible hit zones, alpha feedback,
and a bounded preview pulse; it does not draw visible menu chrome.

## Discovery popup cadence and preference

Every rarity reveal now settles for exactly three seconds before its exit
animation. `starDiscoveryPopupPolicy.js` prevents repeated mining from turning
that readable hold into a queue:

- routine repeat Stars can admit one popup every 20 seconds;
- the first lifetime encounter of each rarity can bypass the interval;
- a Sign level-up can bypass the interval;
- only an incoming higher-priority rarity/level reveal can replace a live card;
- equal or lower-priority Stars keep the current card instead of restarting it.

`ESC → SETTINGS → GAMEPLAY → Star Discovery Popups` is enabled by default and
persists in `UserSettings`. Switching it off immediately closes the live card
and blocks future cards. It does not suppress the identity crystal release,
rarity counts, Sign XP, materials, Engine charge, constellation callbacks, or
save state.

## Runtime authority

`values/starIdentityLibrary.js` is the visual and copy SSOT.
`values/starIdentityLibraryMath.js` owns lookups, deterministic selection, and
library health validation.

`WorldModel` stores one byte per world tile in `skyTileIdentity`. A second
coordinate hash selects an identity from the already-selected rarity. It does
not consume another primary world RNG draw and does not alter spawn frequency
or rarity. Existing worlds need no save migration because an identity is
reconstructed deterministically from the world seed and tile coordinate.

Both normal Star mining and Heavy Punch/behind-tile Star mining pass the exact
identity into the reward detail. `FloatingTextSystem` carries it through saved
progress metadata, the discovery popup, and the UI-only mined-star release.
Collected Stars remain transient UI presentation and never become persistent
world entities.

The scenic semantic renderer and `SkySteadyLightRenderer` use the same exact
atlas frame. The star therefore keeps one identity in the tile, darkness light,
discovery popup, release, and Star Atlas. No generic star texture is tinted.

## Authored asset package

Built-in ImageGen produced six rarity source sheets plus the Star Atlas
foundation. The deterministic builder
`tools/2026-07-30-build-star-identity-assets.py`:

1. slices the source grids;
2. converts connected black exterior pixels into straight alpha;
3. writes six 320 px-frame transparent runtime atlases;
4. normalizes the authored UI foundation to 1536 by 800;
5. records dimensions, coverage, and SHA-256 hashes.

The runtime atlases contain about 5.1 million decoded pixels in total, rather
than fifty separately preloaded full-size textures.

Source prompt contracts and provenance are recorded in:

- `sprites/environment/star-identities-v1/source/readme.md`;
- `sprites/UI/star-atlas-v1/source/readme.md`.

## Health and regression checks

- `2026-07-30-star-rarity-sign-xp-contract.mjs` executes the three-second hold,
  cooldown, first-rarity and level-up admission, higher-priority replacement,
  settings persistence, immediate active-card teardown, and disabled path.
- `2026-07-26-pause-settings-layout-contract.mjs` keeps the second Gameplay
  feedback row clear at standard and compact ESC sizes.
- `2026-07-30-star-identity-library-contract.mjs` validates all fifty
  identities, exact rarity counts, fifty distinct primary colours and light
  styles, atlas dimensions/hashes/coverage, both mining paths, deterministic
  world assignment, authored-only rendering, Boot preload, popup, and release.
- `2026-07-30-star-atlas-ui-smoke.mjs` executes the real Star Atlas renderer
  with Phaser-like doubles and proves the foundation, twelve Common selectors,
  large preview, eighteen hit zones, guide rule, reward explanation, and frame
  installation.
- `2026-07-30-star-identity-light-smoke.mjs` executes the real pooled darkness
  light renderer with identity-specific frame and motion, then verifies clean
  release.
- `FloatingTextSystem.getStarProgressionHealthSnapshot()` reports library
  validity and the seven required identity/UI textures to runtime health.

## Safe fallback and rollback

The earlier six rarity assets remain safe renderer fallbacks if an identity
frame is unavailable. A narrow rollback can remove the third inventory tab,
identity preloads, `skyTileIdentity`, and the identity-aware renderer paths
without changing rarity progression, Sign XP, constellation state, or saved
world authority.
