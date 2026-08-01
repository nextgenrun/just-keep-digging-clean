# AAA polish quick-wins pass — 2026-07-31

## Outcome

This pass improves presentation without changing world state, rewards, saves,
collision, mining authority, or progression rules. It concentrates on small
cues that combine into a more finished feel: planted animation contacts,
material-specific feedback, consistent cave response, deterministic type,
dedicated UI one-shots, authored icons, and cleaner world impacts.

## Shipped quick wins

### Player motion and contact

- Promoted the reviewed animation-polish candidates into the production Piskel
  package and runtime sheets.
- Added dedicated up/down mining variants and retained moving diagonal mining.
- Rebuilt the wall brace as entry, full-height loop, and exit instead of a
  partial-frame push.
- Body-locked stationary dig/quickslash contacts so marker correction cannot
  pull the character off the planted gameplay body.
- Calibrated landing and action-settle continuity against the 109 px player
  presentation size.
- Added a two-layer contact shadow below the player. It appears only while the
  body is grounded, fades out in air, and stretches slightly with run speed.

### Mining and cave feedback

- Removed the duplicate destroy-burst dispatch that ran once during tile refresh
  and again during feedback handling.
- Replaced fifteen per-break procedural chip circles with one approved authored
  impact texture, material tint, restrained scale variation, and precious-metal
  glints.
- The impact starts at visible alpha so a low-FPS frame cannot swallow the cue.
- Cave mining now uses the same material pitch, break volume, shake signature,
  display-settings checks, and FPS shake gate as the persistent mine.
- Cave GP presentation now uses the approved HUD buff-chip frame with live text.

### Interface finish

- Bundled Barlow Semi Condensed Regular, SemiBold, and Bold under OFL 1.1.
- Preloaded all three weights and added a bounded font-readiness gate before
  Phaser starts, preventing first-frame system-font swaps.
- Added dedicated reviewed UI select/confirm WAV files, hover debounce, and
  separate pitch/volume identity.
- Replaced prominent save-card, selection, shop requirement, and level reward
  glyph placeholders with the approved icon atlas.
- Removed emoji-font dependencies from compact HUD timers, campfire feedback,
  settings selection, and the flight return label.

## Presentation rollback switches

These query parameters are comparison tools only; they do not alter save data.

- `?animationPolish=0` — disable the full reviewed animation-polish profile.
- `?verticalDigPolish=0` — disable only the dedicated vertical mining variants.
- `?stationaryContactPolish=0` — disable the body-locked stationary contacts.
- `?wallBrace=0` — disable the reviewed wall entry/loop/exit profile.
- `?contactShadow=0` — hide the new player contact shadow.
- `?authoredMineImpact=0` — suppress the new authored break-impact layer.

## Verification evidence

### Automated

- Bundled Node syntax checks passed for all touched JavaScript modules.
- `testing/2026-07-28-player-animation-polish-production-contract.mjs`
  - 133 transition frames
  - 120 diagonal frames
  - 38 promoted animation definitions
- `testing/2026-07-16-player-rig-contact-contract.mjs`
  - marker and body-lock contact paths passed
- Cave identity, cave resource/hazard/darkness, expanded cave, visual UI, shop
  uptime, manual save transfer, game-input audio, and runtime audio streaming
  contracts passed.
- `testing/2026-07-31-aaa-polish-quick-wins-contract.mjs`
  - two reviewed UI audio assets
  - three bundled font weights
  - cave shake/audio parity
  - approved raster impact route
  - contact-shadow lifecycle and rollback switches

### Live Edge

- HTTP 200 and correct MIME types confirmed for the page, main module, TTF,
  UI WAV, and impact PNG.
- System Edge plus the bundled Playwright runtime reached:
  - `MainMenuScene`
  - `StartMenuScene` with the icon atlas resident
  - `PlayScene` in `playing` state
- Clean runs reported no page errors or console errors.
- All three Barlow weights returned ready from `document.fonts.check`.
- Live grounded state reported both contact-shadow layers visible at restrained
  alpha and the authored impact texture resident.

## Good next low-effort candidates

These were deliberately left out of this pass to keep the implementation
bounded and reviewable.

1. Add tiny looped activity accents to static surface props: chimney wisps,
   sign sway, forge embers, and one lantern moth cluster per screen.
2. Add authored compact controller/keycap icons to the controls and tutorial
   copy so keyboard labels do not carry the whole interaction language.
3. Add one cave-only foreground dust veil per archetype, moving at a slower
   camera ratio than the continuous cave background.
4. Add material-specific micro-decals that survive for 1–2 seconds after a
   break: dust for dirt, chips for stone, and a restrained ring for metal.
5. Give save cards one authored mode badge and one last-location badge so
   returning saves scan faster without adding more text.
6. Add subtle menu-to-world audio continuity: keep the menu bed, duck during
   WorldLoad, then crossfade into the first ambient world layer.

The next pass should begin with a live screenshot review at surface, shallow
mine, deep mine, and one cave archetype, then select only the three details with
the highest visual return.
