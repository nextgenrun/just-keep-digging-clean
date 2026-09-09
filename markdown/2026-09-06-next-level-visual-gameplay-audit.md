**UNDERSTAR — next-level visuals and gameplay audit, 6 September 2026**

My recommendation is a **cinematic 2.5D excavation game**: deep cave spaces, solid-looking cut rock, moving light, a clearly readable hero, and mining actions that expose opportunities or change a route. This direction can reuse the current renderer, world model, artwork, character rig, and progression systems. It offers a strong improvement per unit of work. A complete real-time 3D conversion would be a separate, substantially larger project.

The defining moment should be easy to describe: **you break through a heavy rock face, fragments fall toward the camera, warm light catches the exposed edge, and a cavern opens behind it with a useful decision inside.** That combines appearance, animation, sound, and gameplay in something players do repeatedly.

This document is an audit and proposal. It changes no game code, assets, balance, saves, or feature defaults. Estimates below are planning judgments, not delivery commitments or measured improvement percentages.

**Evidence and limits**

I read the active entry/configuration, scenic renderer and terrain mask, material-lighting admission, camera motion, player profile and locomotion selector, mining values, Ability Block spawning, Star sanctuary values, runtime asset budgets, and the recent character, gameplay, event, and background reviews. I checked the bundled Phaser version: 3.90.0. A request to `http://127.0.0.1:8080/main.js` returned HTTP 200, matched this checkout's file exactly, and carried development no-cache headers.

I also ran a fresh calculation using the current mining and tile-health modules. This is numerical source evidence, not a gameplay timing benchmark.

The browser-control runtime timed out on repeated connection attempts, including a separate initialization attempt. I could not perform a fresh playthrough or measure live performance. I visually inspected the saved 5 September town and 144 m gameplay captures, the character source-frame board, and the newer Crownfall night capture. These are dated evidence, not captures produced by this audit. The underground capture uses a deliberately staged standing pocket, not a naturally discovered chamber. The character board is a source-frame presentation. Crownfall is a review candidate in the full-review world, not the normal demo experience. Audio has not been auditioned here.

Relevant prior reports: [gameplay and Steam audit](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/markdown/2026-09-05-steam-visuals-gamefeel-fun-audit.md), [character audit](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/audit.md), [latest background candidate](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/markdown/2026-09-06-regenerated-backgrounds.md), and [event work](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/markdown/2026-09-05-dynamic-event-polish.md). Historical test passes in those reports were not rerun here.

**What is already available, and what that means for the next investment**

| Area | Current source or reviewed evidence | Useful next change |
|---|---|---|
| Renderer | Phaser 3.90.0, default WebGL; continuous scenic layers over an authoritative 94 px gameplay grid | Extend the current composition and masks; preserve the existing mining/collision/save model |
| Image resolution | High already renders a 1920×1080 backing canvas; explicit UHD is available | Improve composition and material response before increasing pixel count |
| Underground edges | Exposed terrain uses short jittered dark strokes; eligible top surfaces also have authored caps | Give side and lower cut faces material thickness, inset shadow, and coherent corners |
| Lighting | Normal-map lighting is enabled, but its region target is only `surface-entry` | Extend it to a small, selected set of commonly seen rock materials and depth scenes |
| Depth motion | Several underground regions already have bounded camera-relative lag; some are anchored | Add independently authored distant and near planes where space supports them |
| Surface motion | `layeredSky=1` admits the regenerated horizon candidate; the default remains unchanged | Review and finish this existing candidate; use its techniques in reachable Level One areas |
| Character | Existing Blender/Mixamo rig and baked animation pipeline, authored contacts, banking, shadows, and numerous attacks | Improve transition continuity, distinct running, carried-light consistency, and silhouette |
| Mining feedback | Material particles, contact-pose holds, camera response, cracks, and reward effects already exist | Make effort, damage, break, and valuable discovery feel distinctly different |
| Gameplay | Ability trials, Star refuges/scars, Campfire growth, Flight, Titans, and dynamic hazards already exist | Bring their consequences into ordinary excavation and the early journey |
| Release scope | The normal demo is bounded to Level One; Level Two and several systems require full-review | Put the first major improvement where normal players can encounter it |

The screenshot evidence shows a rich art library. In the saved underground view, the square opening, repetitive resource patches, and small neutral-colored hero still compete with very detailed rock imagery. That is a composition problem worth testing against the latest build. The more recent Crownfall candidate demonstrates stronger depth and scale, although the large distant landmark remains decorative. Its technique and visual clarity are useful references for the playable mine.

![Existing Crownfall review capture; full-review candidate, not a result generated by this audit](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated/crownfall-night.jpg)

The current candidate has evolved beyond the older horizon report: current values reference `regenerated-horizon-v2` and a 96-cloud cap. Earlier claims about 54 Observatory wisps and a 180-sprite cap describe an older revision. The latest report and active values should guide any continuation.

**Ranked changes with the best return**

Prototype estimates assume one developer familiar with this checkout, existing assets where suitable, and one bounded comparison. They exclude full-world rollout, multiple art revisions, and broad platform acceptance. Impact is a design assessment.

| Rank | Change | Visible/gameplay effect | Small review prototype | Main dependency or risk |
|---|---|---|---|---|
| 1 | Give excavated rock physical depth | Very high visual impact through ordinary mining | 1–3 days, one material family | Correct corners, masks, and readable collision edges |
| 2 | Extend moving material light | High visual impact throughout the local play area | 1–3 days, one region | Matching normals, baked-light conflicts, GPU cost |
| 3 | Improve early excavation payoff | Very high gameplay impact from the opening minutes | 0.5–2 days | Equipment-matched pacing and reward balance |
| 4 | Add a small, capped fracture-seam mechanic | Very high potential: changes how players choose a cut | 2–4 days, one seam type | Exactly-once damage/rewards, protected cells, balance |
| 5 | Finish core character motion | High visual and control-feel impact | 2–4 days for selected transitions | Matched rig poses, contact preservation, torch coverage |
| 6 | Guarantee an early useful Ability Block trial | High gameplay impact using an existing exciting feature | 1–2 days | Durable one-time placement and a useful room |
| 7 | Finish the existing layered-world candidate | High surface/flight impact | 0.5–1 day to assess the candidate; integration is additional | Level One relevance, seams, weather, platform readability |
| 8 | Stage discoveries with the existing camera and effects | Medium/high impact at meaningful moments | 0.5–2 days | Threat visibility, input continuity, restrained motion |
| 9 | Author three distinctive excavation pockets | High gameplay variety and visual identity | 3–6 days for a small three-room set | World placement, persistence, guaranteed escape routes |
| 10 | Make Star consequences visible locally | High identity and decision-making impact | 1–3 days, one refuge/scar comparison | Preserve existing light, GP, territory, and Panic authority |
| 11 | Improve hero/HUD visual hierarchy | Medium/high benefit on almost every screen | 1–3 days, representative views | Review at actual size using approved art |
| 12 | Show a few major upgrades on the character/world | High progression satisfaction at milestones | 2–4 days for one milestone | Consistent animation coverage and meaningful capability change |

These estimates are not additive project quotes. Several items share art and rendering work; animation expansion, save migrations, or new room-generation rules can substantially increase integration effort.

**1. Make the mine look excavated in depth**

The current exposed-edge drawing is a concrete low-cost starting point: [WorldVisualMaterialField.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/scenic-world/WorldVisualMaterialField.js:148) builds the solid mask, and its exposed-edge method draws the outline. The existing authored top caps should remain part of the composition.

Extend that boundary with a compact family of authored rock lips and corner pieces. The solid face should overlap a darker recessed surface; the open space behind it should have lower contrast and a different scale. Put a restrained highlight on edges that actually face a nearby light. Debris should emerge from the cut and settle with material-appropriate motion. Reuse the existing material atlas and particle owner where possible.

Use a small set of edge variants with deterministic selection. Update affected visible boundaries through the renderer's existing invalidation work. A background fracture painted across several tiles must not imply that the player can walk through solid cells.

The first prototype should cover a straight shaft, a horizontal tunnel, an inside corner, a ledge, and a freshly broken tile. One attractive still image is insufficient: the new surface must stay attached during mining, running, camera movement, and Flight.

**2. Make light describe shape**

The active [material-lighting configuration](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/worldVisualDepthBackdrops.js:324) already supplies a cool fill and warm player light. [Region admission](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js:420) only applies `Light2D` when matching normal data exists and the region is selected.

Begin with rock near the player, a cut edge, and one important prop. As the player moves, the light should roll over their surface rather than merely brighten a circular patch. Keep distant scenery softer so that local movement becomes visible. Use the existing darkness/reveal logic for what can be seen; presentation lighting must not reveal hidden resources or remove survival pressure.

Normal maps provide directional surface information. They do not create actual cavities, cast arbitrary 3D shadows, or supply a complete physically based material system. Existing paintings also contain baked illumination, so their normals and new lights need restrained art review. An automatic brightness-to-height conversion can mistake a painted shadow for a physical dent. Phaser 3.90 explicitly supports normal-mapped objects through its lighting pipeline. [Phaser Light documentation](https://docs.phaser.io/api-documentation/3.90.0/class/gameobjects-light).

**3. Change the payoff of ordinary excavation**

A fresh calculation from [miningConfig.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/miningConfig.js) and [tileHealth.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/tileHealth.js) gives the following at 20 m:

| Material | Base HP | Nominal damage per contact | Nominal contacts to break |
|---|---:|---:|---:|
| Dirt | 45 | 16 | 3 |
| Stone | 87 | 8 | 11 |
| Copper | 141 | 8 | 18 |
| Ability Block | 191 | 16 | 12 |

The base ordinary action cooldown is 1,500 ms. These numbers exclude levels, equipment, criticals, temporary effects, and multiple authored contacts within an action. They are not observed clear times. They establish a worthwhile pacing hypothesis: ordinary hard-material encounters can demand a lot of repeated work before anything changes.

Test two equipment-matched early routes with different break frequencies. Preserve a recognizable hierarchy between soft material, ordinary rock, valuable ore, and a deliberately tough obstacle. A useful first purchase should visibly change a familiar material's effort. Keep contact, damage, and reward synchronized under the current owners. Combo-decay timing stays as previously requested.

A change in this area can make the whole game feel more responsive even before new graphics are added. The choice must come from playtesting actual actions and reward value, not a blanket speed multiplier.

**4. Add one new excavation interaction: fracture seams**

Place a short, visually connected fracture across a small authored group of ordinary rock or ore cells. Breaking its marked weak point releases a bounded sequence of adjacent pieces. The visual result is a satisfying crack traveling through rock, with staggered fragments and a useful opening.

The player chooses between opening the quick, lower-yield route and individually extracting the richer seam. This tradeoff needs an explicit economic test: if the chain preserves all value and always saves time, it is a reward interaction rather than a meaningful choice. Both can be useful, but the design should be intentional.

Start with one small seam and a hard limit on affected cells. Resolve the chain through the existing mining/reward/save path. Exclude bedrock, protected structures, Stars, portals, and other special cells. Make the visual fracture match exactly the cells eligible to break. Keep normal mining usable and avoid adding a mandatory timing minigame.

This is new gameplay work. Its modest art footprint does not remove the need to test duplicate contacts, ability interactions, save/reload, cancellation, and world-stream boundaries.

**5. Use the existing 3D character pipeline to finish the performance**

The hero already uses 3D-authored animation rendered into sprites. Replacing the entire animation library would duplicate substantial work. Current source explicitly enables `continuousFlightLoop`, bypassing the selector's ordinary enter/exit path; hover and travel also share the flight animation. The profile describes Ctrl running with the Standard Walk source. Those are practical targets for a focused improvement. [Player profile](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/survivalUalPlayerAssetProfile.js:548), [flight selector](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/visual/UalNativeLocomotionTransitionSelector.js:88).

Prioritize a seamless flight cycle with matched entry/braking/release, a recognizably different running gait, a short authored weight recovery between mining contacts, and consistent torch carry or stow through attacks and ledges. Match landing and climb exits to the next pose. Keep cloth/backpack follow-through subtle and bake it on the same rig.

At the character's small gameplay size, clear boots, hands, head, and torso grouping will contribute more than additional skin texture detail. A restrained identifying accent can help, but it needs comparison against both bright scenery and dark rock. This is a targeted appearance proposal, not an approved costume replacement.

Reuse the [Blender Animation Lab](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/blender-animation-lab-v1/readme.md), existing retargeted candidates, source markers, and current contact timeline. The 5 September [character audit](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/audit.md) contains useful source-frame findings; its numerical seam and atlas measurements remain dated evidence until refreshed.

**6. Put exciting powers and useful spaces on the early route**

The [Ability Block](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/specialBlocks.js:160) already offers a 20-second free power trial. Its spawn value is 0.0000875, or 0.00875%, and [WorldSpawnAuthority](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/model/WorldSpawnAuthority.js:81) uses seeded placement and admission. This is a per-placement rule, not the probability that a player will encounter one.

Create one durable, authored early opportunity near the first successful sell/upgrade loop. Put useful terrain beside it so the power has an immediate purpose. A short aligned seam showcases Lance; a compact pocket showcases a local area power. Preserve ordinary permanent unlocks and prevent repeat farming.

Then build three small room types from existing world art and mechanics: a fracture pocket, an intact-Star refuge with an optional richer detour, and a partly buried landmark with a useful exit revealed by excavation. These rooms should change the route or decision, not just supply another background picture. They can provide more apparent variety than many additional biome names.

**7. Make the existing Star loop visible and understandable**

Intact Stars already provide refuge behavior, and consumption already creates territory consequences, including a configured 4× Panic multiplier. Those are existing mechanics, not additions proposed here. [Star sanctuary values](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/starSanctuary.js).

Make one complete loop legible: **excavate toward a light → reach relief → decide whether to preserve its usefulness or harvest its power → see the local territory and Worldroot reflect that decision → choose the next expedition.** Show the affected area before commitment using the existing environmental and map surfaces.

A more ambitious later experiment could reward a traversable connection between two intact refuges. That requires new connection criteria, invalidation, persistence, and balance. It is medium-to-large work and should wait until the ordinary preserve/harvest choice proves interesting.

**8. Choreograph motion, danger, and recovery**

Use the existing camera look-ahead, depth zoom, impact response, particles, and audio roles to create clear contrasts. Ordinary hits stay restrained; a break has a stronger physical release; a valuable opening earns a brief reveal; a threat has a readable warning; a refuge provides quiet relief. Preserve control during camera presentation and keep UI stable.

The Wurm, earthquake, and Shadowminer already have recent work and explicit admission rules. The latest report includes meaningful Shadowminer terrain work, so the older description of it as entirely visual-only is outdated. Inspect current ownership before proposing another reward or excavation behavior for it. Several threats also belong to Hardcore or have depth/progression gates; they cannot be assumed to improve every player's opening.

For an additional environment interaction, the existing Pressure Vent proposal is more promising than another unrelated random attack: expose a crack, read the warning, and choose a safe way to vent it. It is a second mechanic to consider after fracture seams, not part of the cheapest first pass.

Audio timing is part of this work, but the active mix needs a listening session before gain or asset changes are justified. Reuse the approved library and compare the combined experience with music, mining, Flight, and warnings active.

**9. Make progression and the interface support the new presentation**

Show a few meaningful milestones through the existing hero, Campfire, and Worldroot. For the current punch/kick character, a stronger glove/boot treatment or a recognizable power signature could connect a purchase to the action on screen. Check the intended equipment fantasy against the existing pickaxe icon and shop language before authoring a full gear family.

Reassess player, target, threat, reward, and HUD contrast together at gameplay size. Existing screenshots show different HUD revisions, so old control positions are not a current layout defect. The general goal is consistent: the hero and immediate action should lead the image; small text must remain readable; secondary chrome should not compete with discovery. Reuse approved UI assets and existing layout owners.

Controller coverage, new-run setup, save recovery, and the first two hours remain important product questions from the earlier audit. This graphics-focused pass does not establish that they are solved. A complete redesign should keep them on the acceptance plan rather than expanding content around an untested player journey.

**How much real 3D should be used?**

| Route | What it provides | Relative effort | Recommendation |
|---|---|---|---|
| 2.5D world layers, cut faces, local light, restrained perspective effects | Strong depth and motion while retaining current gameplay and assets | Low/medium for bounded slices | Best first investment |
| Blender-rendered sprites, props, and matched normal passes | Consistent 3D-authored motion and shape at a fixed camera angle | Low/medium per selected family; broad coverage is larger | Continue and improve the existing pipeline |
| Real-time 3D hero or selected props composited into the game | Continuous lighting, rotations, and potentially fewer baked action atlases | Medium/large; integration can take weeks | Consider only after a small lighting/occlusion prototype justifies it |
| Full real-time 3D world and excavation | Free cameras, true geometry, a different spatial experience | Large; a multi-month undertaking is plausible | Treat as a separate product/architecture decision |

Phaser's Mesh can provide perspective tricks and small model effects, but Phaser 3.90 documents that this path has no depth buffer. It is not a shortcut to a complete modern 3D scene. Real-time 3D integration would need a deliberate solution for masks, depth order, character lighting, world coordinates, input, effects, and rendering ownership. This effort assessment is an engineering inference from the current architecture. [Phaser Mesh documentation](https://docs.phaser.io/api-documentation/3.90.0/class/gameobjects-mesh).

**Effort traps to avoid in the first pass**

- A default switch to 4K: current High is already 1080p; UHD increases backing pixel count fourfold. It does not fix scale, lighting, silhouettes, or gameplay.
- Global bloom, sharpening, or fake relief over every painting: these can intensify noise and baked lighting. The existing `fullWorldMaterials=1` treatment is explicitly a review path.
- More independent animation sheets before fixing the transitions and carry policy: this increases the matrix of actions to keep consistent.
- Moving a whole painted cliff or architecture layer to simulate life: separate water, foliage, smoke, or light so solid structures remain stable.
- Full fluid simulation, arbitrary destructible 3D terrain, free camera rotation, or a new enemy ecosystem: each introduces a much larger gameplay and asset problem.
- Building the first showcase entirely in gated Level Two content: the bounded Level One journey needs to receive the improvement.
- Adding a new progression currency or duplicating a world/lighting/event authority to support a presentation effect.

**Performance and integration constraints**

Use `WorldVisualRuntime` for presentation, `WorldModel` for solid/air state and persistence, existing mining systems for contact/damage/rewards, and `LightSystem`/Hardcore owners for visibility and survival. New tuning belongs in `/values/`. New visuals should demand-load through the existing asset coordinator and feature manager.

The current asset configuration has 704 MiB and 640 MiB decoded-texture watermarks. Those are management thresholds, not a measurement of available GPU headroom. A 2048×2048 RGBA image is 16 MiB before mipmaps or duplicate CPU/GPU storage; a matching normal map adds another 16 MiB at that representation. A 4096×4096 pair is 128 MiB. This is why selectively lighting commonly seen materials is a better initial experiment than generating normal maps for every asset. [Current memory configuration](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/runtimeAssetLoading.js:227).

Budget visible light sources, overlapping transparent planes, resident textures, and first-use loading. Retain source quality and offer lower-cost effects settings by reducing optional passes or density. Measure the real target GPU at the normal rendering preset before accepting performance claims. A shader working, an image decoding, or a headless capture completing does not establish shipping FPS.

**The first concrete implementation I recommend**

Build a reviewable **shallow-mine slice** containing one approach, one excavation pocket, one short fracture seam, one intact-Star refuge, and the existing early power trial. The first visual version can use the current character while its motion refinements are reviewed separately.

1. The player enters from the familiar town. Near terrain, distant space, and the hero have clear visual separation.
2. Walking past an ordinary rock face shows moving local light and an attached material edge.
3. Mining visibly chips and cracks that surface. A final contact releases a short fracture, dust, and an opening with depth.
4. The new pocket contains a useful power trial and an optional richer route. The player's choice changes what they do next.
5. An intact Star provides a readable recovery point. Returning to town connects the gained resources to one practical upgrade and an existing world-state response where applicable.

A bounded visual/mechanical prototype is plausibly **3–5 focused developer days**. A coherent pilot with selected character fixes, art review, persistence, both-scene coverage, and performance checks is more plausibly **8–15 developer days**. Full-world rollout should be estimated after that evidence; it is not included in either range.

Judge the first result by whether the upgrade is obvious in an ordinary three-second gameplay view and whether a short mining sequence presents a better decision. A distant beautiful landmark alone does not meet that target.

**Acceptance before expansion**

- Capture matched old/new views and short actual-input recordings at the same seed, equipment, light state, and camera position. Include town, the first mining area, representative deeper Level One regions, and a compact cave.
- Verify walking, Ctrl running, fixed 1.2-tile jump, powered Flight, release, ledges, torch transitions, all dig directions, and relevant abilities. After motion changes, run the required `testing/2026-08-20-player-jump-flight-motion-contract.mjs` plus affected focused checks.
- Check that cut-face art matches collision, newly opened space appears immediately, hidden resources remain hidden appropriately, and both facing directions receive correct material lighting.
- Measure contacts, time to first useful reward, upgrade payoff, trial usefulness, and fracture-route choices with normal progression. Preserve combo-decay timing.
- Verify exactly-once rewards, durable one-time trial state, save/reload, protected cells, pause/resume, scene teardown, and effect rollback for the new mechanic.
- Record frame-time distributions, worst first-use stalls, decoded/resident texture estimates, cold-start cost, and an extended traversal on representative hardware. Set the rollout budget against that measured baseline.
- Review sound and visuals together at the actual gameplay scale, including reduced motion and the normal demo profile. Keep source contracts, saved screenshots, live input proof, and subjective approval distinct.

The highest-value first commitment is **physical-looking excavation + moving material light + one satisfying terrain interaction**. That combination can establish a new visual standard and a stronger reason to keep playing, using the systems UNDERSTAR already has.
