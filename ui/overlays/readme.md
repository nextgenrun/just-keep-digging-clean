# Overlays

UI module — overlays.

- `UIInventoryPopup.js`, `UIInventoryHoldingsView.js`,
  `UIInventoryResourceGuide.js`, and `UIInventoryWorldTilePreview.js` — the
  two-tab `I`-key field inventory. `INVENTORY` keeps all fourteen real
  icon/name pairings visible while discovery gates only quantities.
  `WORLD GUIDE` keeps all fourteen materials clickable before discovery:
  the ten approved resources show all six production ImageGen atlas
  formations over exact live ground frames, Dirt/Dark Dirt/Hard Dirt show six
  exact runtime soil variants, and Lava Dirt shows its five real dig stages.
  The preview combines the always-preloaded production ground, hardness, and
  intact-crack images with the approved semantic atlas, so scenic and legacy
  renderer modes share the same guide without generated substitute art.
- `StarlightTalentTreeView.js`, `StarlightTalentNode.js`,
  `starlightTalentStatus.js`, `starlightTalentDetailPresentation.js`,
  `starlightTalentPageNavigation.js`, `starlightEnginePagePresentation.js`,
  `starlightCarouselPresentation.js`,
  `starlightEngineDetailPresentation.js`, `starlightTalentLayout.js`, and
  `StarlightEngineOptionCard.js` — the shared ESC/Star Pillar talent tree,
  split into spacious Quick Slash, Thunder Strike, and Celestial Engine pages.
  Each five-talent branch is a cyclic three-card carousel with a larger center
  selection; the Engine page uses three large bays. All ten exact sign assets,
  a bespoke ImageGen Bobo seal until Quick Slash or Thunder Strike is owned,
  banked star progress, separate matching Star Block yield and
  ability-mutation states, three alpha-safe Engine medallions, authored
  plaques/arrows/steps, ambient motion, click feedback, and first-star reveal
  routing remain live. Phaser supplies responsive placement, dynamic text,
  invisible hit targets, and tweens; it does not draw visible tree chrome.
- `StarHeartOverlay.js` — the tall three-choice Star Heart modal with ambient constellation motion, keyboard/mouse selection, owned/equipped/available states, and a timed two-step permanent unlock. Three Hearts let a late-game save own all three Engines while only one remains equipped.
- `StarHeartEngineCard.js` — image-backed Wayward Star, Hollow Sun, and Comet Engine cards with fixed-screen hit areas plus hover, focus, press, and selection tweens.
- `ShopOverlay.js` — shared merchant modal. The Molten Money Monster opens on the Arc Forge tab, renders the two canonical crafting recipes, and retains its Sell tab with a timed repeat-confirmation before any uncrafted-core ingredient is sold.
- `ShopOverlay.js` also exposes Bobo's irreversible Hardcore Oath only to
  post-Flight Casual saves. The generated oath crest and typed `YES` path route
  through the live Hardcore bridge; there is no one-click conversion.
- `HardcoreModalOverlay.js` — the approved ImageGen-framed typed confirmation
  surface shared by Bobo conversion, Unstuck, and the 100m/300m/1000m depth
  gates. Bobo and Unstuck retain `TYPE YES`; the depth gates require the
  gate-specific phrases `100M`, `300M`, and `RISK`. Its
  `HardcoreDeathRecapView.js` death state uses
  generated action plates for `TRY AGAIN` and `BACK TO MENU`, paginates the full
  run stats/Journey history with arrow keys, and cannot leave while purge is
  busy. It is Phaser-only and never creates visible HTML or placeholder chrome.
- The Player Upgrades merchant lists the one-time Seismic Suppression endgame
  purchase with visible player-level and depth-milestone requirements. A
  successful purchase synchronizes the live earthquake system before queuing
  the normal upgrade save.
- `TitanArchiveView.js` / `TitanArchiveLoreView.js` /
  `TitanArchiveClueControl.js` — the ESC `TITANS` tab: compact real-art 5x5
  thumbnails, locked silhouettes, and discovered-only epithet, expanded field
  lore, region, and plinth-inscription presentation sourced from
  `values/titanLore.js`. Mouse/keyboard focus and the live discovered total
  remain sourced from retention data. A locked selection can buy a depth-scaled
  locator clue, then enable or disable its permanent arrow from this ESC panel;
  enabling another purchased clue moves the single shared locator. The control
  shows wallet affordability and an exact locked-safe direction without
  exposing the Titan identity. Selecting a
  discovered entry pins its streamed 1536x848 chamber vignette with a restrained
  living pulse; locked entries never request or reveal chamber art.
- `SaveTransferPanelContent.js` — the responsive ESC `SAVES` tab with manual save, save-and-export, and backup-before-import controls that remain inside the fitted modal body.
  Armed or pending Hardcore keeps manual save but locks export with visible
  `OATH LOCKED` status; the store also rejects Hardcore JSON imports so UI
  shortcuts cannot bypass permadeath.
