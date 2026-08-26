# Overlays

UI module — overlays.

- `UnderstarEndingOverlay.js` presents the demo-complete story and run summary
  over the approved full-screen Understar painting. Escape returns to the mine;
  Enter uses PlayScene's serialized save-and-main-menu transition.

- `CelestialTalentTreeView.js`, `CelestialTalentTreeNodeView.js`, and
  `CelestialTalentTreeConnectorLayer.js` — the physical Star Pillar's
  image-backed 33-node Celestial progression surface. Three Engine roots fan
  upward through authored connector art into three alternate mastery paths;
  the view reads the live row/lane graph and Star Point authority instead of
  hard-coding the retired five-node columns. V2 uses a socket-free cobalt
  foundation, Pillar-matched square skill frames, and restrained stretchable
  rails so the bitmap cannot contradict the live graph.
- `UIInventoryPopup.js`, `UIInventoryHoldingsView.js`,
  `UIInventoryResourceGuide.js`, and `UIInventoryStarAtlas.js` own the `I`-key
  field inventory. `HOLDINGS` keeps all fourteen named resource icons visible
  while discovery gates quantities. `RESOURCE CODEX` replaces gameplay-tile
  composites with one authored foundation and a dedicated fourteen-specimen
  portrait atlas; its collection, selected border, dossier, copy, and hit zones
  all use the same measured 1738x905 source-space transform.
  `STAR CODEX` follows the Titan Codex hierarchy: six rarity filters, twelve
  identity selectors per page, authored page arrows, a large light preview,
  lore, and three reward sockets on its own proportional 1738x905 foundation.
  Every selector and the dossier pair the crisp identity core with its separate
  authored light-only underlay. `UIStarIdleMotion.js` adds the shared authored
  caustic atlas as one restrained additive sprite over each visible selector
  and the dossier preview. Three animation definitions serve all thirteen live
  sprites, deterministic identity phases prevent synchronized repetition, and
  `?starIdle=0` restores the exact static Codex.
  `UIInventoryStarAtlasControls.js` pages all 250 identities without shrinking
  or crowding them.
  `UIInventoryStarAtlasKeyboard.js` keeps Tab navigation, grid arrows/WASD,
  Page Up/Page Down, and Q/E rarity changes aligned with those selectors. It
  explains each colour's rarity, flavour, exact light style, first depth, Sign
  XP, material multiplier, and Engine charge. Rarity owns rewards while
  identity owns colour/art/flavour. Phaser supplies exact atlas frames, dynamic
  copy, invisible hit zones, alpha hierarchy, and bounded motion. Interactive
  zones inherit the modal input depth and consume both pointer phases, so a
  correctly aligned selection cannot fall through and dismiss the backdrop.
- `SettingsPanelContent.js` — the shared ESC Settings surface. Its `GAMEPLAY`
  tab exposes floating-text policy and session objectives. The retired
  `Star Discovery Popups` toggle no longer exists; legacy saved values are
  ignored. Star rarity, Sign XP, releases, Atlas, and player-opened Starlight
  progression remain live.
- `StarlightTalentTreeView.js`, `StarlightTalentNode.js`,
  `starlightTalentStatus.js`, `starlightTalentDetailPresentation.js`,
  `starlightTalentPageNavigation.js`, `starlightEnginePagePresentation.js`,
  `starlightCarouselPresentation.js`,
  `starlightEngineDetailPresentation.js`, `starlightTalentLayout.js`,
  `starlightImagePlacement.js`, `starlightTalentTreeHealth.js`, and
  `StarlightEngineOptionCard.js` — the
  shared ESC/Star Pillar talent tree, split into spacious Quick Slash,
  Thunder Strike, and Celestial Engine pages.
  Each five-talent branch is a cyclic three-card carousel with a larger center
  selection; the Engine page uses three large bays. All ten exact sign assets,
  a bespoke ImageGen Bobo seal until Quick Slash or Thunder Strike is owned,
  banked star progress, separate matching Star Block yield and
  ability-mutation states, three alpha-safe Engine medallions, authored
  plaques/arrows, one tracked Heart pulse, click feedback, and first-star
  reveal routing remain live. Hover never changes page or selection: side-card
  clicks, arrows, and keyboard input alone move the carousel horizontally.
  ESC and Pillar expose the same authored 1116px content width. Card centers
  match the three painted alcoves, while every uneven transparent sign is
  centered by its visible alpha bounds. Flank cards suppress ribbons and
  secondary status; only the active navigation plaque is overlaid because the
  ImageGen foundation already contains its idle frames. The lower dossier uses
  four separated, larger text rows. An Engine side card must first move to
  center before a second click attunes or equips it. Phaser supplies responsive
  placement, dynamic text, invisible hit targets, and bounded tweens; it does
  not draw visible tree chrome.
- `StarHeartOverlay.js` — the tall three-choice Star Heart modal with ambient constellation motion, keyboard/mouse selection, owned/equipped/available states, and a timed two-step permanent unlock. Three Hearts let a late-game save own all three Engines while only one remains equipped.
- `StarHeartEngineCard.js` — image-backed Wayward Star, Hollow Sun, and Comet Engine cards with fixed-screen hit areas plus hover, focus, press, and selection tweens.
- `ShopOverlay.js` — shared merchant modal. The Molten Money Monster opens on the Arc Forge tab, renders the two canonical crafting recipes, and retains its Sell tab with a timed repeat-confirmation before any uncrafted-core ingredient is sold.
  List rows use hover as a temporary preview until the player clicks one. A
  clicked resource, schematic, or gear/upgrade row remains pinned while the
  pointer crosses other rows; clicking it again releases the pin, while an
  explicit click elsewhere moves it. Keyboard, page, and merchant-tab
  navigation release the mouse pin and remain authoritative.
  Every Level-1 merchant always exposes its complete active catalog; staged
  progression changes row availability into approved lock icons and readable
  hover/detail conditions instead of deleting rows or refusing to open. Global
  selection follows the visible page, Page Up/Page Down provide dedicated page
  input, and the interact key remains purchase-only. Direct cross-merchant
  purchase calls are rejected.
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
  busy. Clicking a permanent world grave opens the same large framed view in
  memorial-inspection mode: every saved stat and achievement remains paginated,
  one generated action plate closes it, and Escape restores play. The shared
  `hardcoreRecapAction.js` owns those approved action plates and their restrained
  pointer motion. The flow is Phaser-only and never creates visible HTML or
  placeholder chrome.
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
- Money Monster exposes `Deep Market Contracts` only in modern depth-economy
  mode. The detail card explicitly shows its World Two Tunnel Key prerequisite,
  and prerequisite failure takes priority over price failure. Sale cards and
  wallet text display up to two decimal places so every 10% starter-resource
  price level is immediately visible. Individual, stack, sell-all, lucky, and
  rush totals share one rounded payout path.

- `StarlightTalentTreeView.js` and its focused presentation modules render the
  V4 single-frame ImageGen composition shared by ESC Talents and the physical
  Star Pillar. `starlightPauseTalentChrome.js` owns the in-foundation title and
  subtitle; navigation, sign/Engine cards, locks, and the lower dossier overlay
  only real state on authored sockets. The selected object may own one
  restrained ambient loop; arrows use bounded horizontal hover travel and no
  object follows the pointer.
