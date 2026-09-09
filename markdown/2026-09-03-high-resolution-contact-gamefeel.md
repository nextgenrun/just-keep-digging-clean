# High-resolution contact gamefeel

Uses the approved material atlases and current authored contact timeline.
No raster assets, player scale, colliders, damage, rewards, mining cooldowns,
flight/jump bindings, combo decay, camera zoom or scene time scales are changed.

## Contact ownership

- Successful authored contacts prepare a brief, material-weighted **pose-only**
  hitstop. It pauses just the current player animation, not physics, input,
  hazards, the scene or timers. Moving/speed-buffed poses get shorter holds.
- The hold starts inside the authored animation callback, preventing Phaser's
  skipped-frame loop from immediately advancing beyond the impact pose.
  Post-update then projects the hand/foot after current-frame movement and
  presents the particles and directional camera impulse together.
- Holds never rewind a skipped pose, run on watchdog fallbacks, stack, alter
  animation timeScale, or resume a replacement animation. Pre-update, pause,
  sleep and disposal release only the pause owned by this effect.
- Main and cave feedback skip the old mining-shake dispatcher when this contact
  path owns it. Misses/cooldown failures do not shake. Particle-only disabling
  remains independent from camera and pose feedback.

## Camera and resolution

`CameraShakeSystem` remains the only shake dispatcher, retaining priorities,
display settings and its low-FPS gate. Impact impulses use a render-only world
scroll offset after camera follow/deadzone calculation. It restores scroll,
world view and midpoint after rendering, so HUD, input, follow position and
subsequent frames cannot accumulate shake drift. Offset size is logical screen
pixels, not backing pixels, and is compensated for camera zoom.

Fragment selection considers actual backing density, camera zoom and visible
size. Larger fragments select sufficient native pixels from the same approved
material family; tiny source flecks remain fine grit instead of being enlarged
into blurry chunks. Aspect, padded alpha bounds and source hashes stay intact.
The existing two atlases use linear sampling and their named frames install once.

`renderQuality=high` retains 1920x1080 backing; `ultra` is 2560x1440.
The new explicit `renderQuality=uhd` uses 3840x2160. All retain logical 1280x720
input/layout and responsive FIT scaling. Default remains High to avoid forcing
4K fill cost on every device. Reduced motion suppresses the added shake/hold;
the established low-FPS gate does the same under load.

## Rollback and review

- `impactPolish=0`: previous fragment choice and mining-shake path, no hitstop.
- `impactHitstop=0`: disable only pose holds.
- `impactShake=0`: disable only the new contact shake.
- Existing `particlePolish=0`, `digImpact=0`, `groundFootFx=0` and
  `authoredMineImpact=0` retain their own scopes. `nativeDensity=0` restores
  legacy backing density without changing world geometry.

Use canonical `serve.py`, enter the save-disabled local collision review and
press F1. Shift+F8 catches an actual contact; F8 resumes. The caption reports
authored/shown frames, material, requested hold, shake strength and backing
dimensions. `impactMaterial=dirt|copper|stone|glow_crystal` changes the fixture;
`impactBreak=1` enables a one-hit destruction and `impactAfter=80|180` selects
a later particle phase. Glow crystal is a visual-only, non-mineable control;
use dirt, copper or stone for successful contact/destruction checks. These
fixtures cannot write saves or run remotely. Unfrozen hits log a bounded
`[ImpactReview]` render trace with actual pose frames, hold state and offset.

## Focused validation

`testing/2026-09-03-impact-resolution-hitstop-contract.mjs` covers resolution,
native texture selection, filtering, deadzone bypass, exact camera restoration,
same-frame directional onset, priority/settings/FPS gates, hitstop ownership,
moving/high-speed holds, rollback, contact deduplication and main/cave routing.
Run it with the existing contact, particle, render-density, camera, collision,
level-one rhythm/scale, Speed Block and Space/Shift contracts.

### Runtime evidence (2026-09-03)

Canonical `serve.py` on localhost:8765, `jkd_e2e=1&collisionReview=1&cinematics=0`:

- High: live copper contact at 1920x1080 backing. Authored/shown frame 18/18,
  hold active on the first render, released by 33 ms; the 1.54 logical-pixel
  impulse starts at contact and reaches zero by 83 ms. A second, warmed side
  punch shows authored/shown frame 10/10 at the fist and a 26 ms requested hold.
- Ultra: live dirt destruction at 2560x1440 backing, frame 18/18. The 1.134 px
  impulse starts at contact, hold releases by 33 ms, offset is zero by 83 ms.
  A separate 80 ms side-punch capture shows the brown dirt fragments at the
  removed tile, rather than a metal/crystal substitute; frame 10/10 at contact.
- UHD: live copper destruction at 3840x2160 backing, frame 18/18. The stronger
  2.156 px break impulse starts on contact, hold releases by 33 ms and camera
  offset is zero by 83 ms. A warmed side-punch capture at 80 ms shows separate
  faceted copper fragments, with contact frame 10/10 and a 34 ms requested hold.
  The trace reports 41 FPS at completion, so this does not establish sustained
  60 FPS at 4K; High stays the default. All three native backings retain the
  same 1280x720 CSS layout in this browser run. Error logs are empty in all
  three review tabs. The non-mineable glow-crystal control gives no hit event.
- Save-slot metadata remains level 1, depth 5 m, best 513 m, eight tiles dug
  across reloads. Fixture rewards occur in memory only. Space initiates a jump
  under the review ceiling; full jump height is covered by the controller
  contract, not inferred from that ceiling-limited screenshot.

16 focused contract files pass, including the new 11-case gamefeel suite,
material/contact/footstep/destruction, camera and density, collision/mask,
level-one cadence/scale, 50% Speed Block, up-dig/wall animation, authored
timeline, Space/Shift and weather/settings. All 16 touched runtime JS files
pass syntax checks; the scoped diff whitespace check passes.

Broader checks are **not globally green**. Three older contracts stop in paths
not changed by this pass: `2026-07-22-core-state-systems-contract.mjs:88` expects
positive legacy SFX volume; `2026-07-29-world-texture-native-density-contract.mjs:61`
reads a missing `caveBackground.expectedSourceWidthPx`; and
`2026-07-31-aaa-polish-quick-wins-contract.mjs:46` expects legacy `uiSelect`
instead of the current reviewed SFX dispatcher. These were not repaired here.

Coverage limits: this is focused render/contact evidence, not a sustained
performance benchmark, full cave playthrough, or every material/animation at
every display size. Native backing dimensions are verified separately from
the browser's CSS viewport; no physical 4K-monitor claim is made.
