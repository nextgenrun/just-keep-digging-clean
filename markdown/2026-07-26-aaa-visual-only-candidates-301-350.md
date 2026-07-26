# AAA Visual-Only Candidates 301–350

**Created:** 2026-07-26  
**Status:** Deferred by the user on 2026-07-26; bundle later with the improved above-ground village/prop pass; no runtime wiring or asset promotion  
**Numbering:** Continues after the reviewed 201–300 list

## Direction

The successful village smoke and warm-light treatment is the quality bar for this batch: a small amount of authored movement, light interaction, depth, and material response should make the existing scene feel alive without adding another gameplay system.

Hard constraints:

- presentation only—no gameplay, economy, collision, save, reward, input, or audio changes;
- world-space visuals first; no new persistent HUD, counters, labels, banners, or stacked notifications;
- no visible pickaxe/tool work, visible gear, jump assumptions, or inventory-bar legacy;
- no flat HTML/CSS, primitive Phaser geometry, generic particles, debug shapes, or placeholders;
- reuse approved project art where it fits; any genuinely new visible texture must be high-quality ImageGen art and receive in-game visual approval before wiring;
- all effects obey the shared quiet-frame/clutter budget and reduced-motion setting;
- every implementation slice gets one values-owned disable switch and remains independently Git-revertible.

**Rating:** Effort `XS/S`; Risk `Very low/Low`; Impact `High/Very high`.

## U. Village life, smoke, and practical lighting

301. **Smoke light-edge catch** — Let only the thin outer curl of existing chimney smoke catch warm window light, moonlight, or lightning as it crosses those light fields. The dense smoke core stays dark. **Wire:** existing smoke sprites plus `LightSystem.getSunlightSnapshot()`/local light snapshot → `SkylineWeatherVfxWorldWisps`; tint and alpha only. **Effort: XS · Risk: Very low · Impact: High**

302. **Chimney-and-eave smoke depth mask** — Hide the lower smoke curl behind the chimney cap and nearest roof edge, then reveal it naturally above the silhouette. This makes the already-good smoke look embedded in the village instead of pasted over it. **Wire:** approved roof/chimney crop masks → `WorldVisualSurfacePackView` smoke container. **Effort: S · Risk: Very low · Impact: Very high**

303. **Rare window silhouette crossing** — Very occasionally pass one soft, indistinct resident shadow behind an already-lit cabin window. It never leaves the window, identifies no NPC, and cannot compete with merchants. **Wire:** stable seeded interval plus approved soft silhouette asset → `WorldVisualSurfaceStage`; far-background depth. **Effort: S · Risk: Very low · Impact: High**

304. **Doorway light aperture squeeze** — Narrow and widen the existing warm doorway spill as the visual door state changes, so light appears to pass through a real opening. Do not add a new interaction or change the doorway collision. **Wire:** `SurfaceTunnelDoorSystem` visual state → existing light-spill mask in `WorldVisualLightingBridge`. **Effort: XS · Risk: Very low · Impact: High**

305. **Lantern glass echo glint** — Add one tiny secondary reflection inside approved lantern glass that lags the existing lantern sway by a fraction, then settles. It is a material response, not a new glow source. **Wire:** lantern transform from surface/NPC visual → child glint sprite in `WorldVisualSurfaceStage`. **Effort: XS · Risk: Very low · Impact: High**

306. **Warm light-pool texture drift** — Move the fine texture inside existing cabin and campfire light pools by a few pixels at different slow rates while keeping their radius and brightness authority unchanged. **Wire:** existing light-pool art plus seeded phase → `WorldVisualLightingBridge`. **Effort: XS · Risk: Very low · Impact: High**

307. **Merchant shadow pose synchronization** — Let each planted merchant’s grounding shadow subtly widen, narrow, or lean with the already-authored idle pose instead of remaining static. No NPC translation or roaming. **Wire:** `NPCActivitySystem` pose phase → approved shared shadow family. **Effort: XS · Risk: Very low · Impact: High**

308. **Nearest-window welcome lift** — On the player’s first close approach after returning to town, raise only the nearest already-lit window by a restrained warm amount, then settle it once. No message, reward, or persistent trigger. **Wire:** existing town-return/proximity state → `WorldVisualSurfaceStage`; one bounded tween. **Effort: XS · Risk: Very low · Impact: High**

309. **Mine-entrance inner-plane parallax** — Move only the dark interior plane behind the approved mine-entrance frame slightly slower than the camera, while the physical entrance and collision remain fixed. **Wire:** mine-entrance landmark layers → `WorldVisualLandmarkLayer`; render transform only. **Effort: XS · Risk: Very low · Impact: Very high**

310. **Foreground branch light rim** — Give the nearest independent branch silhouettes a brief, narrow moon or lightning rim on the light-facing edge. Never brighten the full branch or bake it into HUD depth. **Wire:** independent foreground props plus sunlight/lightning direction → `WorldVisualSurfaceStage`. **Effort: S · Risk: Very low · Impact: High**

## V. Player grounding and movement integration

311. **Nearest-light player edge tint** — Tint a very narrow player-facing edge from the strongest nearby known light—warm at cabins/fire, violet at portals, cool at crystals—without changing the sprite’s base grading. **Wire:** simplified nearest-light snapshot → `PlayerLightShaderBridge`; presentation tint only. **Effort: S · Risk: Low · Impact: Very high**

312. **Flight altitude shadow separation** — Let the existing ground shadow soften, widen, and lose opacity as Flight gains height, then reconverge near the floor. This adds height without a pressure ring or new Flight particle. **Wire:** player-to-visible-floor distance → player contact-shadow transform. **Effort: XS · Risk: Very low · Impact: Very high**

313. **Support-loss shadow cleanup** — When the supporting tile disappears, fade the player shadow immediately instead of leaving it suspended on the removed face for a frame. Restore it only on a valid visible support. **Wire:** post-dig support sample → player contact-shadow visibility. **Effort: XS · Risk: Very low · Impact: High**

314. **Fast-turn heel scuff** — On a sharp grounded direction reversal, release one tiny approved material-colored heel scuff behind the planted foot. Normal walking emits nothing extra. **Wire:** signed displacement reversal from `PlayerKinematicMotionSystem` → pooled `GroundEffectsAtmosphere` sprite. **Effort: XS · Risk: Very low · Impact: High**

315. **Climb-contact grit pinch** — Emit one compact approved grit pinch at actual hand or foot contact when climbing movement advances; never emit during an idle hold. **Wire:** existing climb contact markers → `ClimbTrailSystem`; reuse the approved material dust family. **Effort: XS · Risk: Very low · Impact: High**

316. **Flight-trail body occlusion** — Start the approved Flight trail behind the player body and allow only its far taper to cross to foreground depth. The character silhouette remains readable without reducing trail quality. **Wire:** split existing `FlightFootParticleSystem` trail into rear and taper containers. **Effort: XS · Risk: Very low · Impact: High**

317. **Contact-shadow light-pool blend** — Smooth shadow color and opacity when the player walks between moonlight, cabin light, campfire, portal, and darkness instead of snapping between profiles. **Wire:** existing light-source handoff snapshot → player contact-shadow tween. **Effort: XS · Risk: Very low · Impact: High**

318. **Terrain-lip limb occlusion polish** — Extend the existing solid-cell limb mask with a narrow softened lip so feet and lower legs sit behind raised terrain edges cleanly instead of clipping at a hard line. Collision remains untouched. **Wire:** visible solid mask → `PlayerSolidOcclusionSystem`; values-owned feather only. **Effort: S · Risk: Low · Impact: Very high**

319. **Wet-ground footprint pair** — During wet surface weather, leave at most two faint approved dark footprint impressions behind grounded movement and dissolve them quickly. Underground and dry ground emit none. **Wire:** wetness snapshot plus footplant markers → `WorldVisualTownFloorView`; hard cap of two. **Effort: S · Risk: Very low · Impact: High**

320. **Occluded-player light separator** — When a dark foreground prop overlaps the player, add a one-pixel local-light rim only along the overlapping silhouette. It is not a permanent outline and disappears immediately outside occlusion. **Wire:** foreground overlap bounds plus nearest-light direction → player presentation layer. **Effort: S · Risk: Low · Impact: High**

## W. Mining contact and break readability

321. **Light-directed crack rim** — Rotate the existing raised fracture highlight toward the strongest visible light so cracks read as physical cuts rather than uniformly bright graphics. **Wire:** light direction snapshot → `WorldVisualDamagePainter` SCREEN-rim weighting. **Effort: S · Risk: Low · Impact: Very high**

322. **Fresh-break dust stain recovery** — Leave a soft material-colored dust veil around a newly opened rim, then let it settle back to the normal cavity grade over less than a second. It never fills the air cell. **Wire:** successful break event → temporary rim tint in `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: High**

323. **Debris perspective scale** — Let only the largest foreground chips grow slightly as their authored trajectory moves toward camera depth and shrink as they fall back, without changing collision or count. **Wire:** existing debris normalized lifetime → pooled sprite scale curve. **Effort: XS · Risk: Very low · Impact: High**

324. **Debris/player depth crossing** — Sort impact chips behind or in front of the player according to contact direction and trajectory instead of drawing the entire burst on one plane. **Wire:** committed contact side plus existing debris pool → rear/front containers in `WorldVisualFeedbackLayer`. **Effort: S · Risk: Very low · Impact: Very high**

325. **Ordered multi-break cascade** — For Quickslash, Thunder, and other existing multi-cell results, offset dust and cavity-settle frames by the authoritative affected-cell order rather than firing every visual on the same frame. Rewards remain immediate. **Wire:** ordered result tiles → `WorldVisualGameplayEffectLayer` visual schedule. **Effort: S · Risk: Very low · Impact: Very high**

326. **Quickslash material kiss** — Tint only the final edge and contact sparks of the approved violet Quickslash effect toward the struck material for a few frames; keep the blade core consistently violet. **Wire:** Quickslash result material → approved effect’s edge/spark layers. **Effort: XS · Risk: Very low · Impact: High**

327. **Thunder material reflection** — Reflect a restrained bolt color onto the exposed face of struck stone, metal, crystal, or star material, then remove it before the afterglow ends. **Wire:** Thunder result targets → local SCREEN duplicate in `WorldVisualLightingBridge`. **Effort: XS · Risk: Very low · Impact: High**

328. **Exposed-socket dark beat** — For one brief frame after a rich or crystal inclusion breaks, show the darker recessed socket beneath the departing fragments before the normal open cavity settles. No persistent decal or new reward marker. **Wire:** resource break identity → temporary approved socket mask in `WorldVisualFeedbackLayer`. **Effort: S · Risk: Very low · Impact: High**

329. **Movement-directed impact dust** — Lean only the soft dust tail slightly with the player’s current travel direction while chips continue following the committed contact direction. This makes moving contact feel integrated without more particles. **Wire:** player velocity snapshot at contact → existing dust emitter angle. **Effort: XS · Risk: Very low · Impact: High**

330. **Non-square break-edge dissolve** — Replace the last visible square-cell pop with a very fast jagged, material-neutral edge dissolve while the authoritative tile becomes AIR immediately. Use approved alpha art, never a procedural noise rectangle. **Wire:** break invalidation → one-shot overlay in `WorldVisualMaterialField`; simulation changes immediately underneath. **Effort: S · Risk: Low · Impact: Very high**

## X. Rain, wetness, and atmospheric interaction

331. **Canopy-and-roof rain occlusion** — Mask approved rain behind independent roofs, canopies, and heavy foreground branches so streaks do not visibly pass through solid scenic silhouettes. **Wire:** scenic occlusion masks → `WeatherParticleController`; `WeatherImpactRainController` remains impact authority. **Effort: S · Risk: Low · Impact: Very high**

332. **Locally lit rain streaks** — Brighten only the short segment of an approved rain streak crossing a warm cabin, campfire, portal, crystal, or lightning light pool. Avoid globally brighter rain. **Wire:** simplified visible light volumes → rain tint/alpha in `WeatherParticleController`. **Effort: S · Risk: Low · Impact: Very high**

333. **Ground-approach rain shortening** — Shorten and tighten a gameplay-plane streak during its final approach to a sampled surface so it visually terminates at the collision splash instead of penetrating the ground. **Wire:** existing impact sample/time-to-contact → approved rain sprite crop/scale. **Effort: S · Risk: Low · Impact: High**

334. **Top-down surface wetting** — Let wetness appear first along upward-facing roof, rock, and floor edges, then creep a short distance down the material instead of applying one global tint instantly. **Wire:** weather wetness plus visible edge masks → `WorldVisualSurfaceStage`/`WorldVisualTownFloorView`. **Effort: S · Risk: Low · Impact: Very high**

335. **Storm-shadow advance** — Move one broad, soft cloud shadow across the surface shortly before heavy rain reaches full intensity. It carries no danger meaning and never darkens gameplay below readability. **Wire:** `WeatherDirector` transition phase plus cloud direction → surface beauty tint mask. **Effort: XS · Risk: Very low · Impact: High**

336. **Wet-floor lightning echo** — Reflect one vertically compressed, low-opacity lightning echo in already-wet town floor and exposed surface rock. Do not draw a second bolt. **Wire:** lightning phase plus wetness → SCREEN reflection pass in `WorldVisualTownFloorView`. **Effort: XS · Risk: Very low · Impact: Very high**

337. **Rain-loaded smoke compression** — During heavy rain, briefly flatten and darken the lower portion of existing chimney smoke before it recovers into its normal roll. Wind direction still comes from the authoritative weather snapshot. **Wire:** storm intensity plus wind → existing smoke scale/tint curves. **Effort: XS · Risk: Very low · Impact: High**

338. **Warm-light mist separation** — Reduce low surface mist directly inside warm doorway and campfire light pools while keeping a soft illuminated fringe at their boundary. **Wire:** existing mist sprites plus local light masks → `SkylineWeatherVfxWorldWisps`. **Effort: XS · Risk: Very low · Impact: High**

339. **Cave-mouth and shaft rain curtain** — Let surface rain stop at real overhangs and continue only through visible open cave mouths or vertical shafts. No underground weather simulation is added. **Wire:** `WeatherOcclusionSampler` visible-air columns → rain visibility mask. **Effort: S · Risk: Low · Impact: Very high**

340. **Patchy wetness dry-back** — As weather clears, remove wet highlights in two or three stable material patches rather than fading the entire world uniformly. The final dry state remains unchanged. **Wire:** wetness decay plus seeded surface regions → existing wet-material pass. **Effort: XS · Risk: Very low · Impact: High**

## Y. Rewards, portals, pillars, and major moments

341. **Chest-lid shadow sweep** — Cast one moving shadow from the lid across the chest interior and nearby floor during the existing weighted opening motion. **Wire:** chest lid phase → approved soft shadow sprite in `LootPickupFxSystem`. **Effort: XS · Risk: Very low · Impact: Very high**

342. **Chest reward silhouette beat** — Backlight the representative coins or star for a fraction before their normal reveal, making the reward readable by silhouette without a banner or count change. **Wire:** chest reward-open phase → existing interior light volume and reward sprites. **Effort: XS · Risk: Very low · Impact: High**

343. **Chest coin depth sorting** — Send a few representative coins behind the lid and a few in front while preserving the current immediate money award and bounded coin count. **Wire:** existing coin arc seed → rear/front containers in `LootPickupFxSystem`. **Effort: XS · Risk: Very low · Impact: High**

344. **Star-pickup quiet bubble** — Briefly dim or part ordinary nearby dust and weather particles so a collected star owns the frame without becoming larger or brighter. **Wire:** star collection phase → shared quiet-frame governor and nearby visual pools. **Effort: XS · Risk: Very low · Impact: Very high**

345. **Relic-orbit depth weave** — Route the approved relic orbit alternately behind the player and in front at correct orbit depth, and behind solid foreground props when applicable. **Wire:** `RelicDiscoveryFxSystem` orbit phase → rear/mid/front containers. **Effort: S · Risk: Low · Impact: Very high**

346. **Portal landing surface refraction** — On a safe arrival, compress one subtle approved refraction pulse into the contacted floor material instead of adding another free-floating ring. It communicates landing only and changes no collision. **Wire:** portal safe-landing result → local masked effect in `WorldVisualGameplayEffectLayer`. **Effort: S · Risk: Low · Impact: High**

347. **Portal-interior camera parallax** — Shift only the portal’s inner destination texture a few pixels opposite camera motion while the outer frame, collider, and destination remain fixed. **Wire:** active portal inner layer plus camera delta → portal visual container. **Effort: XS · Risk: Very low · Impact: Very high**

348. **Pillar glow-cast shadow response** — Shorten and soften the existing Milestone or Star Pillar ground shadow as its approved completion glow rises, then return it to the idle profile. **Wire:** `ProgressivePillarSprite` transition intensity → world contact shadow. **Effort: XS · Risk: Very low · Impact: High**

349. **Titan silhouette fog displacement** — When an already-visible titan moves through its reveal beat, part only the backdrop fog touching its silhouette, leaving the foreground and HUD quiet. **Wire:** `TitanDiscoverySystem` reveal bounds → depth-backdrop mist mask. **Effort: S · Risk: Low · Impact: Very high**

350. **Celestial Engine terrain-edge catch** — As an approved Engine aura rotates, let a faint matching color travel across only the nearest facing terrain edges, never across hidden cells or the whole screen. **Wire:** `CelestialEngineController` aura phase plus visible edge mask → `WorldVisualLightingBridge`. **Effort: S · Risk: Low · Impact: Very high**

## Lowest-effort, highest-impact first look

If these directions are later approved, the strongest initial comparison candidates are:

1. **302** chimney/eave smoke depth masking;
2. **309** mine-entrance inner-plane parallax;
3. **312** Flight altitude shadow separation;
4. **324** debris/player depth crossing;
5. **330** non-square break-edge dissolve;
6. **331** canopy/roof rain occlusion;
7. **336** wet-floor lightning echo;
8. **341** chest-lid shadow sweep;
9. **344** star-pickup quiet bubble;
10. **347** portal-interior camera parallax.

## Review rule

Review candidates in groups of ten. A “yes” approves only the visual direction. Any item needing a new visible texture must receive a high-quality ImageGen asset and an in-game composition review before runtime wiring. No candidate is implementation authority until it is copied into a dated decision ledger.
