# Above-ground viewfield audit and complete patch proposal

**Status: proposal with captured evidence.** Production rendering and source artwork have not been edited.

The project has enough existing art to fix the major coverage and composition defects. The main problem is how the layers occupy world space: a repeated forest strip, widely separated sky cards, several opaque scenic rectangles, and a review page that swaps screen-fixed pictures. Adding motion to those arrangements would preserve their gaps.

The target is a continuous, readable landscape with the Town Square's depth and the Observatory's independent atmospheric motion throughout the visible world.

**Evidence and scope**

I inspected the current checkout through its canonical serve.py: 28 overlapping surface positions across X0–279, 56 sky views at seven horizontal joins and eight altitudes, and two wider views. All 86 recorded gameplay views have matching streamed bounds and zero pending sky assets. The final run recorded zero page errors and zero failed HTTP responses. I also captured all 14 existing ground-review chapters and the current Observatory V16 runtime.

The game registry resolved full-review, while the modular surface prop layer still reported Level Two disabled. Large eastern hero landmarks and Heavenblocks did render. This is a mixed capability-consumer defect; the eastern captures are not evidence that their supporting assets are absent.

The actor and camera were moved together for the surface survey. For sky inspection the actor controller was held while scenery continued updating, and captures waited for loading and coverage. Earlier camera-only/falling-actor captures were replaced. This is a sampled visual audit, not a manual flight playthrough or a completed renderer fix.

[Open all 100 gameplay/reference captures](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/gallery.html) · [Recorded state and bounds](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/survey.json) · [Observatory V16](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/observatory-v16-t12.png)

**Confirmed problems**

| Priority | Finding | Evidence and cause |
|---|---|---|
| P0 | Straight horizontal cuts through the sky | [Sky band edges](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/sheet-06.jpg). WorldVisualSurfaceStage repeats one 1672×941 forest plate across the whole map at both the ground and island altitudes. Its masks fade incoming horizontal edges only. The exposed top/bottom boundaries remain straight lines. The upper copy creates a floating forest belt across the entire world. |
| P0 | Large plain-blue areas between scenes | [Loaded sky gaps](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/sheet-05.jpg). The safe sky frame is 1254×705, or 13.34×7.5 tiles. Feature centers are 20 tiles apart horizontally and 15–16 vertically. That leaves 6.66-tile horizontal gaps and 7.5–8.5-tile vertical gaps before feathering. An opaque foundation makes coverageReady true even when almost the entire camera view contains only flat atmosphere. |
| P0 in full-review | Bright rectangular Heavenblocks paintings interrupt the night sky | [Eastern sky rectangles](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/sheet-09.jpg). V11SkyIslandVisualSystem.addHeavenblockImages places the three backdrop images at alpha 1, without an edge mask or shared atmosphere grading. Their separate facade/gameplay layers must retain their registration. |
| P1 | Quality drops sharply after town | [Town through the promenade](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/sheet-01.jpg). Town has buildings, layered silhouettes and local motion; much of X27–107 returns to almost the same forest/mountain view with sparse low props and locked plinths. The far plate repeats every 1096 world pixels, alternating its mirror orientation. |
| P1 | Eastern hero structures lose supporting props | [Eastern surface](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/sheet-03.jpg). WorldVisualSurfaceHeroRuntime reads the resolved capabilities; WorldVisualSurfacePropLayer calls isGameplayFeatureEnabled without them and therefore uses the demo facade. Boot already preloads the appropriate prop levels using its resolved capabilities. |
| P1 | The coverage audit overstates what is actually drawn | worldVisualSurfacePropLayout counts town through X23.05, while the native-density town beauty ends at approximately X19.16. Protected ranges and the complete Titan gallery also count as covered without measuring their current visible background. The present Worldroot partly fills the town transition, so the stale town number alone is not proof of an exposed hole. |
| P1 | Block-like bands around the portal corridor | [X107–137](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/sheet-02.jpg). Visible upright and horizontal dark bands read as exposed construction geometry. Their presentation needs an authored gate/cliff treatment. Their exact tile-authoring cause was not established; inspect the corresponding WorldModel cells before changing their presentation. |
| Review limitation | Most of the “complete map” is still a picture viewer | GroundLevelBackgroundField uses setScrollFactor(0) and swaps one image on chapter selection. Twelve panels are 1536×614 inside a 1536×864 view, leaving 125 pixels above and below at zoom 1. They do not prove world-space transitions or adjacent chapter overlap. |

**What the recent attempts actually achieved**

The latest complete-ground review contains one unchanged Town Square video, one independently layered Observatory background, and twelve static reference panels awaiting layer packs. It has no continuous chapter-to-chapter background implementation.

Its readme records why the earlier overlay attempt failed: archived structures and cutouts were placed over flattened landscape references without dependable ground contact, producing floating objects. That approach was removed.

The separate Observatory V16 review is a useful component benchmark. It has a clean sky, 54 independently moving cloud wisps, 900 star IDs, 87 window-light IDs, 14 floating island modules and ten small interior figures. Its browser run had no page or request errors. I captured a 12-second interval; that is not full 48-second loop or long-calendar validation.

Reuse its cloud separation, offscreen reset padding, independent timing, and light masks. Keep floating-island buoyancy specific to floating islands. Ground buildings, mountains, trunks, cliffs and the walkable surface remain fixed.

**Existing assets to use**

| Library | Use in the patch |
|---|---|
| start-zone-scenic-v1 town composite, slate floor and living-background-v1 | Preserve the current town composition and 18-second town-air video. Keep the floor/earth separate. |
| world-visual-v2/far/sky-cohesion-v1: all 20 paintings | Reuse their safe crops in an explicit regional/altitude order. Select compatible neighbors and crops with suitable horizons. |
| world-visual-v2/far/sky-foundation-v2 | Retain immediate opaque coverage beneath the authored scenery; assess visual continuity separately from opacity. |
| surface-landscape-final-library-v1: 14 panels | Composition references for regional identity and foreground/background balance. Their baked actors, ground and buildings remain reference content. |
| Existing surface props, hero landmarks and sky props | Restore their correct capability admission and retain the current grounding, suppression and clearance rules. Add density only where the actual layout needs it. |
| Observatory authored-layers-v3 and ground-level-world-v1/background-pack | Reuse selected existing transparent wisps, mist and star/light masks with provenance. The ground pack has ten separate atmosphere sprites. |
| v11-skyline-weather-vfx-v1 atmosphere/particle atlases | Small local smoke, ground mist, drifting particles and weather response. |
| heavenblocks-v1 backdrop/facade pairs | Keep registered solid facades; blend and grade only their distant backdrop portion. |

No broad asset-generation pass is needed for the first implementation. Twelve complete independent chapter packs do not currently exist, so reaching exact reference-panel fidelity everywhere remains separate from fixing coverage with the available art.

**The proposed patch**

1. **Make the existing surface and sky continuous.** Update WorldVisualSurfaceStage and its values to feather every exposed background edge. Keep the ground forest at the surface. Limit additional island scenery to the actual island vicinity with padded, feathered bounds. Reuse the existing four-edge blend masks. Replace the repeated full-world island forest belt with the continuous sky field.

2. **Fill the geometric gaps using the existing sky layout/rendering code.** Extend worldVisualSkyTransitionOrder and worldVisualSkyCohesion with regional coverage placements whose stride follows their native crop dimensions and overlap. Reuse the retained grid/blend implementation in WorldVisualSkyCohesionLayer for coverage, preserving an authored regional order. Keep stronger landmarks sparse above that coverage. This gives each camera a composed cloud/sky field rather than only the flat foundation. Use source-safe crops and existing moon-free areas so repeated paintings do not create repeated moons. Preserve the day/night system's celestial authority.

3. **Repair the three Heavenblocks joins.** Add backdrop-only edge-feather and atmosphere settings in heavenblocksVisualConfig. Apply them in V11SkyIslandVisualSystem.addHeavenblockImages and update their grade through the existing lighting context. Let the dramatic regional color emerge gradually at the boundary. Keep facade dimensions, colliders, portals, rewards and access rules unchanged.

4. **Restore supporting scenery and honest coverage.** In WorldVisualSurfacePropLayer, pass the scene's resolved capabilities to isGameplayFeatureEnabled, matching Boot and the hero owner. Apply the same resolved capability to the island-level check in V11SkyIslandVisualSystem. Pass actual rendered town bounds from the surface owner into surfacePropGeometry's coverage audit instead of the stale X23.05 interval. Measure background coverage separately from prop occupancy and gameplay clearances. Locked Titans must remain a valid progression state.

5. **Compose the surface by region.** Use the current chapter/reference data as a composition guide while retaining actual runtime anchors. Give each region a distant silhouette, an intermediate tree/architecture layer and restrained ground-contact detail. Begin with town → Worldroot → western promenade and extend the same rules across the width. Wrap the confirmed portal-corridor bands with existing grounded gate/cliff art after checking their tile ownership; preserve required collision geometry. Keep soil/floor transitions terrain-masked so shafts remain visibly open.

6. **Extend restrained motion only after the static joins work.** Add regional anchors to worldVisualSurfaceAtmosphere and reuse WorldVisualSurfaceAtmosphereLayer's existing pool/streaming ownership. Bring selected Observatory wisps and independent light masks into that route. Use monotonic wind travel, per-instance phase, transparent travel padding and resets outside the maximum camera view. The current Town Square video stays byte-identical. Use one coherent time/weather input across adjoining regions.

7. **Make the review exercise the real world.** Replace the screen-fixed chapter-image swap in the ground review with the actual proposed world-space surface/sky owners. Chapter buttons become camera bookmarks. Dragging must expose neighboring regions together; keep the original panels in a separate reference view. Add a local comparison selector in values and retain the current rendering as rollback during implementation review.

All tuning stays in values. Extend the existing owners and shared asset cache rather than adding a second renderer, new world model or new loading framework.

**Files to change**

| Work | Existing owners |
|---|---|
| Forest band edges, island-local backing and town handoff | world/rendering/scenic-world/WorldVisualSurfaceStage.js; values/worldVisualRuntime.js; WorldVisualSurfacePackView.js |
| Continuous sky placements, density and shared blends | values/worldVisualSkyCohesion.js; values/worldVisualSkyTransitionOrder.js; world/rendering/scenic-world/WorldVisualSkyCohesionLayer.js |
| Heavenblocks backdrop edges and capability parity | systems/environment/V11SkyIslandVisualSystem.js; values/heavenblocksVisualConfig.js |
| Prop admission and measured coverage | world/rendering/scenic-world/WorldVisualSurfacePropLayer.js; surfacePropGeometry.js; values/worldVisualSurfacePropLayout.js |
| Regional motion | values/worldVisualSurfaceAtmosphere.js; world/rendering/scenic-world/WorldVisualSurfaceAtmosphereLayer.js |
| Actual continuous-world review and references | testing/animation-sandbox/2026-08-30-ground-level-world-v1/GroundLevelBackgroundField.js and main.js; its existing review values |
| Integration and validation | WorldVisualRuntime.js only where owner/context wiring is needed; existing surface/sky contracts; this audit runner |

**Regional treatment**

These are visual themes, not instructions to relocate gameplay. The current Titan gallery spans approximately X25.6–115, including the Craftsmen and Skywell reference chapters.

| Tiles | Reference theme | Background and motion treatment |
|---|---|---|
| 0–19 | Merchant Hearth | Preserve town-air; blend the canopy and right handoff into Worldroot. |
| 20–39 | Titan Walk West | Layered valley and pine silhouettes; low mist and isolated lights behind plinth clearances. |
| 40–59 | Titan Walk East | Garden depth, related forest variation and restrained foliage/light motion. |
| 60–79 | Craftsmen Commons | Distant workshop character and small smoke anchors behind the live Titan route. |
| 80–99 | Skywell Market | Clear portal approach, low distant market accents and localized water/light effects. |
| 100–119 | Relic Grove | Tree framing and distinct gate light; retain all altar and prompt clearances. |
| 120–139 | Mine Threshold | Registered mine/cliff transition, readable drop seam and threshold mist. |
| 140–159 | Arrival Forge | Forge hero with restored supporting props, warm localized smoke and embers. |
| 160–179 | Caravan Rest | Wagon/shelter depth with restored low support art and local hearth atmosphere. |
| 180–199 | Starwell Herb Court | Portal-compatible courtyard depth, herbs and subtle water/mist. |
| 200–219 | Timberwright Yard | Timber silhouettes and modest dust/smoke anchored to the existing yard. |
| 220–239 | Observatory | Low surface silhouettes under the flight lane; continuous graded sky and independent star/cloud motion. |
| 240–259 | Frontier Survey | Related valley background, garden depth and sparse foliage/cloth motion. |
| 260–279 | Expedition Overlook | Broad distant horizon, coherent statue/shelter context and small brazier/wind accents. |

**Acceptance before calling the patch complete**

- Repeat this full-width survey with the same actor/camera/loading safeguards. Review every join, both world ends, the town handoff, portal corridor and all three Heavenblocks boundaries.
- Exercise normal walking and actual upward/downward flight after implementation. Check chapter centers as well as midpoints, vertical band boundaries, diagonal motion and the supported zoom range, including 0.78 and 1.18.
- Compare identical camera and clock/weather states. Verify clear night, daylight and a weather transition without a new rectangle or sudden color jump.
- Validate composition when Titans are locked and unlocked and at relevant Worldroot growth states. Gameplay clearance remains separate from distant scenery coverage.
- Require no exposed rectangular backdrop edges, no duplicated moon sequence, no floating ground structures, and no extensive foundation-only corridors masquerading as completed scenic coverage.
- Inspect motion over at least the 18-second Town loop and a complete Observatory-derived reset cycle. Mountains/buildings/terrain stay fixed; independently timed atmospheric layers remain bounded and readable.
- Exercise slow/failed loading, pause/resume, resize and scene teardown. Keep the existing asset coordinator and neighboring coverage alive until replacements are ready; verify texture/decoder cleanup.
- Preserve digging masks, shafts, floor alignment, collision, save behavior and gameplay capability boundaries.
- Keep the Town video SHA-256 at 1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6.

**Current validation**

The ground-review contract and sky/underground cohesion contract pass. The older surface-living-background contract reaches its page cache-chain assertion and fails because it requires the literal 20260826-surface-motion-v2 revision while index.html now uses 20260831-worldroot-v4-despill-v1. That test needs a current behavior/cache check during implementation; it is not evidence that the current video fails to play.

The proposed renderer changes, manual traversal, full motion-cycle tests, loading failure tests and performance comparison remain implementation work. The deliverable here is the complete patch proposal plus current evidence.

[Ground quality progression](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/sheet-01.jpg) · [Portal irregularities](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/sheet-02.jpg) · [Sky gap/edge evidence](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/sheet-06.jpg) · [Eastern backdrop rectangles](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/sheet-09.jpg) · [Layered motion benchmark](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/2026-09-05-surface-viewfield-audit/observatory-v16-t12.png)

