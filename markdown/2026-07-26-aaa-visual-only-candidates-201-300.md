# AAA Visual-Only Candidates 201–300

**Created:** 2026-07-26  
**Status:** Suggestions only; no runtime wiring or new mockups  
**Numbering:** Continues after the existing 1–200 visual list. Candidates 180–200 remain untouched and unreviewed.

## Scope

These 100 candidates are presentation-only:

- no gameplay, reward, progression, collision, save, economy, input, or audio changes;
- no new objectives, modes, inventory systems, or retention layers;
- no jump-related work—the player uses walking, climbing, digging, and Flight;
- no persistent HUD growth or stacked notification systems;
- no flat HTML/CSS, debug primitives, placeholder particles, or low-quality procedural art;
- any new visible asset must use the project-matched image-generation and in-game visual-approval pipeline before wiring;
- all motion remains subordinate to the shared quiet-frame and clutter budget.

**Rating:** Effort `XS/S/M`; Risk `Very low/Low`; Impact `Medium-high/High/Very high`.

## K. Character, equipment, and Flight presentation

201. **Pickaxe-head specular travel** — Move one restrained highlight across the metal head during the authored swing, peaking just before contact. **Wire:** action phase from `UalActionContactTimeline` → `PickaxeTrailSystem`; approved tool material mask. **Effort: XS · Risk: Very low · Impact: High**

202. **Hand-to-handle registration polish** — Correct tiny visual gaps between the hands and pickaxe handle across facing and contact frames without changing hit geometry. **Wire:** approved per-frame offsets → `UalNativePlayerAnimations`. **Effort: S · Risk: Very low · Impact: High**

203. **Tool shadow sweep** — Cast a faint moving pickaxe shadow across the player and contacted face during surface and well-lit cave swings. **Wire:** action angle plus local light snapshot → `PlayerLightShaderBridge`. **Effort: S · Risk: Very low · Impact: High**

204. **Tool-head inertia offset** — Let the visible tool head lag the torso by one restrained frame during wind-up and recover at contact. Damage timing remains unchanged. **Wire:** swing phase → `PlayerBodyLanguageSystem`. **Effort: XS · Risk: Very low · Impact: High**

205. **Footplant sole compression** — Compress the small contact shadow and lower silhouette on authored walking/climbing footplants so movement looks grounded. **Wire:** locomotion contacts → `PlayerMotionPolishSystem`. **Effort: XS · Risk: Very low · Impact: Medium-high**

206. **Turn-settle accessory follow-through** — Give any coat, strap, pack, or loose silhouette accent one short settle after a fast turn. Use only approved native sprite layers. **Wire:** direction reversal → `PlayerBodyLanguageSystem`. **Effort: S · Risk: Very low · Impact: High**

207. **Flight ignition compression** — Pull existing Flight light and particles inward for a brief visual compression before they expand into lift, without delaying control. **Wire:** Flight state entry → `FlightFootParticleSystem`. **Effort: XS · Risk: Very low · Impact: High**

208. **Low-altitude Flight pressure halo** — While hovering close to a visible floor, flatten existing Flight particles into a subtle floor-hugging pressure ring; omit it at height. **Wire:** floor distance sample → `FlightFootParticleSystem`. **Effort: S · Risk: Very low · Impact: High**

209. **Flight braking ribbon curl** — Curl the existing trail gently ahead of the player during rapid deceleration so stopping has visible air resistance. **Wire:** velocity delta → `FlightFootParticleSystem`. **Effort: XS · Risk: Very low · Impact: High**

210. **Torch-behind-body light masking** — During turns, let the torso briefly occlude a narrow portion of the carried torch glow so the light feels spatial. **Wire:** facing plus torch anchor → `PlayerLightShaderBridge`. **Effort: S · Risk: Very low · Impact: High**

## L. Mining contact, debris, and cavity depth

211. **Pickaxe edge-contact glint** — Place a tiny sharp glint exactly where the metal edge meets the visible face, then kill it before debris begins. **Wire:** committed contact point → `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: High**

212. **Pre-crack contact indentation** — Darken a coin-sized patch beneath the impact for a few frames before the authoritative crack decal changes. **Wire:** damage contact → `WorldVisualDamagePainter`; visual-only overlay. **Effort: XS · Risk: Very low · Impact: High**

213. **Stone powder clump breakup** — Start normal stone dust as two or three dense clumps that fragment into fine powder rather than one uniform cloud. **Wire:** stone material preset → `WorldVisualFeedbackLayer`. **Effort: S · Risk: Very low · Impact: High**

214. **Soil impact sheet** — Use a soft, low horizontal sheet for loose-earth contact instead of reusing stone chips. **Wire:** soil material identity → approved image-generated dust atlas in `WorldVisualFeedbackLayer`. **Effort: S · Risk: Very low · Impact: High**

215. **Metal-seam spark starlets** — Add one or two cold, needle-shaped starlets on metal-rich contacts while retaining the normal particle count. **Wire:** resource material type → contact FX variant. **Effort: XS · Risk: Very low · Impact: High**

216. **Crystal-chip internal refraction** — Give detached crystal chips one brief internal color shift as they rotate through local light. **Wire:** crystal debris variant → `WorldVisualFeedbackLayer` tint timeline. **Effort: S · Risk: Very low · Impact: High**

217. **Debris contact shadows** — Add tiny soft shadows beneath the largest foreground chips for the first bounce only. **Wire:** foreground debris subset → pooled shadow sprites. **Effort: S · Risk: Very low · Impact: High**

218. **Bounce dust pinpricks** — Spawn one tiny material-colored dust pinprick when a large chip makes its first visible floor contact. **Wire:** debris bounce callback → existing feedback pool. **Effort: XS · Risk: Very low · Impact: Medium-high**

219. **Fresh-cavity rim thickness** — Shade the newly exposed cavity lip with a narrow near edge and darker far edge so the opening reads as cut depth. **Wire:** neighbor mask change → `WorldVisualMaterialField`. **Effort: S · Risk: Very low · Impact: Very high**

220. **Unsupported-ledge underside shade** — Fade a restrained underside shadow onto newly exposed upper edges after crumbs settle. **Wire:** visible upper-neighbor change → `WorldVisualMaterialField`. **Effort: XS · Risk: Very low · Impact: High**

## M. Resource and rare-material visual identity

221. **Cross-tile ore-vein continuity** — Align decorative vein strokes across adjacent matching resource cells so clusters look geological rather than stamped. World data remains tile-based. **Wire:** visible same-type neighbor mask → `WorldVisualSemanticAssetLayer`. **Effort: M · Risk: Very low · Impact: Very high**

222. **Embedded-ore depth offset** — Place the ore inclusion one restrained visual layer beneath the chipped stone face so cracks appear to expose it. **Wire:** HP tier plus semantic resource art → `WorldVisualMaterialField`. **Effort: S · Risk: Very low · Impact: High**

223. **Resource-specific break silhouette** — Give each major resource family one approved fragment silhouette while keeping counts and trajectories shared. **Wire:** material identity → image-generated debris atlas selection. **Effort: S · Risk: Very low · Impact: High**

224. **Crystal caustic sweep** — Let visible crystal clusters cast one slow, faint prismatic sweep across their own exposed face, never beyond visibility. **Wire:** crystal semantic sprite → local material shader. **Effort: S · Risk: Very low · Impact: High**

225. **Metal-seam cold edge line** — Add a narrow desaturated specular line to exposed metal seams that responds to the nearest visible light. **Wire:** resource semantic mask → `WorldVisualLightingBridge`. **Effort: XS · Risk: Very low · Impact: High**

226. **Rich-block fine mineral dust** — Use sparse, high-density gold-toned grains close to the face rather than a generic glow or rarity label. **Wire:** rich material contact/idle preset → approved particle texture. **Effort: S · Risk: Very low · Impact: High**

227. **Packed-block compressed strata** — Add tightly layered pressure bands and small occluded pockets so packed material looks physically dense. **Wire:** packed rarity art variant → `WorldVisualSemanticAssetLayer`. **Effort: S · Risk: Very low · Impact: High**

228. **Ancient-block mineral bloom** — Add a slow, deep subsurface color bloom confined to already-visible ancient material, with no rune or locator. **Wire:** ancient material semantic mask → material shader. **Effort: S · Risk: Very low · Impact: High**

229. **Star-block eclipse surround** — Darken a very narrow ring immediately around an already-visible Star Block so its existing light reads cleaner without becoming brighter. **Wire:** visible `SKY_TILE` mask → `WorldVisualMaterialField`. **Effort: XS · Risk: Very low · Impact: High**

230. **Material-signature pickup tail** — Reuse one pickup arc but tint and taper its final trail by stone, metal, crystal, or star family. **Wire:** collected resource identity → `LootPickupFxSystem`. **Effort: XS · Risk: Very low · Impact: High**

## N. Underground scenic life and authored depth

231. **Root-tip secondary sway** — Move only the thinnest visible root tips on long, desynchronized cycles while heavy roots remain fixed. **Wire:** root semantic props → `WorldVisualSemanticAssetLayer`. **Effort: S · Risk: Very low · Impact: High**

232. **Condensation bead lifecycle** — Form one small bead on a visible wet ceiling, let it gain weight, fall, and disappear on contact. **Wire:** authored wet-region visual tags → `CaveAtmosphereSystem`. **Effort: S · Risk: Very low · Impact: High**

233. **Wall-moisture specular trails** — Run faint highlights down existing wet wall art without creating physical water or collision. **Wire:** wet semantic mask → material shader. **Effort: S · Risk: Very low · Impact: High**

234. **Cave-puddle reflection ripple** — Distort only the approved puddle reflection when dust, a drop, or the player passes nearby. **Wire:** visible puddle props plus local events → `GroundEffectsAtmosphere`. **Effort: S · Risk: Very low · Impact: High**

235. **Floor-grit depth bands** — Add a darker near-contact grit strip and softer distant grit to cave floors, improving grounding at no particle cost. **Wire:** visible floor edge mask → `WorldVisualMaterialField`. **Effort: XS · Risk: Very low · Impact: High**

236. **Stalactite near-layer parallax** — Move only authored foreground stalactite silhouettes by a few camera-relative pixels while world collision stays fixed. **Wire:** foreground cave props → `CaveInteriorOcclusionSystem`. **Effort: S · Risk: Very low · Impact: High**

237. **Distant-cavern silhouette occlusion** — Let slow fog alternately reveal and conceal one far cavern silhouette without moving the silhouette itself. **Wire:** depth backdrop region → `CaveAtmosphereSystem`. **Effort: XS · Risk: Very low · Impact: High**

238. **Alcove dust eddies** — Rotate a tiny portion of existing motes inside visible recessed air pockets instead of making all dust flow uniformly. **Wire:** local visible-air geometry → `AmbientParticleSystem`. **Effort: S · Risk: Very low · Impact: High**

239. **Cave-mouth mist curl** — Curl mist around the authored cave opening edges during entry and exit, preserving the center silhouette. **Wire:** cave entrance mask → `CaveAtmosphereSystem`. **Effort: S · Risk: Very low · Impact: High**

240. **Cavity-corner ambient occlusion** — Deepen only the interior corners of open cavities based on visible neighbor geometry. **Wire:** visible neighbor mask → `WorldVisualMaterialField`. **Effort: S · Risk: Very low · Impact: Very high**

## O. Surface, town, and prop polish

241. **Chimney-smoke layered roll** — Split approved chimney smoke into a dense core and softer outer curl with different rise speeds. **Wire:** chimney semantic anchors → `SkylineWeatherVfxWorldWisps`. **Effort: S · Risk: Very low · Impact: High**

242. **Window-interior parallax shadow** — Shift one soft interior shadow behind lit windows as the camera moves, while the exterior frame stays fixed. **Wire:** window semantic props → `WorldVisualSurfaceStage`. **Effort: S · Risk: Very low · Impact: High**

243. **Door-threshold light spill** — Add a restrained warm floor wedge at open or active doorways, masked to the visible town floor. **Wire:** door visual state → `WorldVisualLightingBridge`. **Effort: S · Risk: Very low · Impact: High**

244. **Wet-roof specular travel** — Move a narrow reflection across roof edges after rain as the sun or lightning direction changes. **Wire:** roof semantic mask plus wetness snapshot → `WorldVisualSurfaceStage`. **Effort: S · Risk: Very low · Impact: High**

245. **Eave-drip rhythm variation** — Drop small approved water beads from a few authored eave points after rain using stable different intervals. **Wire:** post-rain wetness → `SkylineWeatherVfxWorldWisps`. **Effort: XS · Risk: Very low · Impact: High**

246. **After-rain puddle micro-ripples** — Keep two or three faint asynchronous ripples alive briefly after the storm ends. **Wire:** wetness decay plus approved water atlas → town-floor visual layer. **Effort: XS · Risk: Very low · Impact: High**

247. **Wind-skittered ground litter** — Move one or two tiny leaves or paper fragments across the far town floor on rare gusts, behind characters. **Wire:** wind peak → `WorldVisualSurfaceStage`; strict long cooldown. **Effort: S · Risk: Very low · Impact: Medium-high**

248. **Merchant-work prop motion** — Animate one small held or tabletop work prop during existing idle contacts rather than moving the whole stall. **Wire:** merchant idle timeline → `NPCManager` visual attachment. **Effort: S · Risk: Very low · Impact: High**

249. **Mine-entrance dust curtain** — Add a thin depth-layered dust veil just inside the mine entrance that parts around the player. **Wire:** entrance world mask → `GroundEffectsAtmosphere`. **Effort: S · Risk: Very low · Impact: High**

250. **Town-foreground structure parallax** — Give only the nearest approved fence, awning edge, or roof silhouette a restrained camera-relative shift. **Wire:** foreground surface props → `WorldVisualSurfaceStage`. **Effort: S · Risk: Very low · Impact: High**

## P. High-quality rain, snow, and storm art

251. **Clean rain-streak atlas replacement** — Replace primitive line textures and the rejected matte-contaminated sheet with an approved transparent ImageGen rain family. **Wire:** approved atlas → `WeatherParticleController`; retain collision authority. **Effort: M · Risk: Low · Impact: Very high**

252. **Rain-shape depth family** — Author distinct thin distant, readable gameplay-plane, and soft near-camera streak shapes in the same approved atlas. **Wire:** layer preset → `WeatherParticleController`. **Effort: S · Risk: Very low · Impact: High**

253. **Snowflake atlas activation review** — Create an in-game visual review using the earlier snow assets before enabling any weather path. No snow mechanics or accumulation authority. **Wire:** review profile only → `SkylineWeatherVfxSystem`. **Effort: S · Risk: Very low · Impact: High**

254. **Wind-blown snow powder sheet** — Add a sparse approved low powder texture that follows strong gusts behind gameplay silhouettes. **Wire:** winter visual profile plus wind → weather VFX layer. **Effort: S · Risk: Very low · Impact: High**

255. **Snow-contact powder puff** — Use one tiny approved powder burst where a visible flake meets a sampled surface. **Wire:** weather collision sample → snow impact visual pool. **Effort: S · Risk: Very low · Impact: High**

256. **Rain edge-glints on metal props** — Add sparse moving highlights to wet lanterns, roofs, and metal trim without globally brightening the scene. **Wire:** wetness plus semantic metal props → `WorldVisualLightingBridge`. **Effort: S · Risk: Very low · Impact: High**

257. **Roof-runoff streamlets** — Draw one or two short-lived approved water ribbons from authored roof low points during heavy rain. **Wire:** storm intensity plus roof anchors → surface weather layer. **Effort: S · Risk: Very low · Impact: High**

258. **Tree-branch rain shedding** — Release a brief cluster of larger drops from foreground branches after a gust, behind HUD and characters. **Wire:** gust edge plus tree semantic anchors → weather VFX pool. **Effort: S · Risk: Very low · Impact: High**

259. **Post-storm terrain mist** — Use the earlier atmosphere art to form low mist above wet surfaces as rain clears, then dissolve it before clear weather settles. **Wire:** wetness decay → `SkylineWeatherVfxWorldWisps`. **Effort: S · Risk: Very low · Impact: High**

260. **Thundercloud internal vein light** — Animate restrained branching light inside the responsible independent cloud actor before the exterior flash. **Wire:** lightning telegraph → generated cloud sprite emissive mask. **Effort: S · Risk: Very low · Impact: High**

## Q. Lighting, shadow, and exposure fidelity

261. **Overhang light occlusion** — Reduce player-light reach immediately behind visible ledges without changing the authoritative revealed area. **Wire:** visible solid mask → `darknessLightShader`. **Effort: S · Risk: Low · Impact: High**

262. **Player and prop contact shadows** — Normalize soft grounding shadows beneath the player, merchants, chests, and major props using one approved shape family. **Wire:** visual anchors → `WorldVisualLightingBridge`. **Effort: S · Risk: Very low · Impact: Very high**

263. **Wet-material specular response** — Increase only narrow specular highlights on wet stone, wood, and metal while preserving base color and readability. **Wire:** wetness plus material identity → surface material shader. **Effort: S · Risk: Very low · Impact: High**

264. **Crystal-colored penumbra** — Tint the inner edge of an existing crystal shadow or light pool while leaving the outer darkness neutral. **Wire:** visible crystal light → `WorldVisualLightingBridge`. **Effort: S · Risk: Very low · Impact: High**

265. **Soft player-light penumbra** — Replace a visibly geometric light edge with a narrow approved softness profile that remains stable while moving. **Wire:** `darknessLightShader` values in `values/lightConfig.js`. **Effort: S · Risk: Low · Impact: Very high**

266. **Light-source handoff blend** — Smoothly transfer visual emphasis when player light overlaps campfire, crystal, portal, or lightning illumination. **Wire:** existing light snapshots → `LightSystem`; no radius changes. **Effort: S · Risk: Very low · Impact: High**

267. **Torch-shadow direction inertia** — Let the visual shadow direction trail rapid torch movement slightly, then settle without affecting illumination authority. **Wire:** torch anchor velocity → light presentation transform. **Effort: S · Risk: Very low · Impact: High**

268. **Emissive bloom-radius discipline** — Give small bright sources tighter bloom and large sources broader, dimmer bloom so everything does not glow identically. **Wire:** semantic light class → `WorldVisualLightingBridge`. **Effort: XS · Risk: Very low · Impact: High**

269. **Visible-crack light leak** — Allow a hairline glow through an already-visible high-damage crack only when a known light sits directly behind or beside it. No hidden reveal. **Wire:** visible crack mask plus local light → `WorldVisualDamagePainter`. **Effort: M · Risk: Low · Impact: High**

270. **Lightning exposure recovery** — Recover brightness in two short visual stages after a lightning flash so the eye reads the scene naturally. **Wire:** lightning phase → repaired `PostFxSystem`; bounded and reduced-motion aware. **Effort: S · Risk: Low · Impact: High**

## R. Ability, vehicle, and special-effect art

271. **Image-generated Quickslash blade core** — Replace any remaining primitive crescent with an approved violet blade-core atlas that has bright center, tapered edge, and clean alpha. **Wire:** approved atlas → Quickslash world FX. **Effort: S · Risk: Very low · Impact: Very high**

272. **Quickslash edge-vapor curl** — Let one thin violet vapor curl peel from the approved blade core after contact and disappear immediately. **Wire:** Quickslash contact → pooled world FX. **Effort: XS · Risk: Very low · Impact: High**

273. **Image-generated Thunder bolt family** — Replace generic line lightning with an approved dominant-bolt and restrained-branch atlas. **Wire:** approved alpha atlas → `WorldVisualGameplayEffectLayer`. **Effort: M · Risk: Low · Impact: Very high**

274. **Thunder scorch ghost** — Leave a very faint, seconds-long light-only afterimage along the visible struck column, with no permanent decal. **Wire:** Thunder result → `WorldVisualGameplayEffectLayer`. **Effort: XS · Risk: Very low · Impact: High**

275. **Heavy Punch air-lens compression** — Distort a narrow oval of background and dust around the striking side for a fraction of a second. **Wire:** Heavy Punch phase → local post-effect sprite. **Effort: S · Risk: Low · Impact: High**

276. **Heavy Punch dust shear** — Split nearby loose dust cleanly above and below the pressure line rather than adding more particles. **Wire:** Heavy Punch direction → `AmbientParticleSystem`. **Effort: XS · Risk: Very low · Impact: High**

277. **Arc Core mechanical iris wake-up** — Open an approved mechanical iris or ring in two weighted stages when the Arc Core activates. **Wire:** `ArcCoreVehicleSystem` visual state → semantic sprite layers. **Effort: S · Risk: Very low · Impact: High**

278. **Arc Core travel spark discipline** — Use sparse contact-timed wheel or ground sparks colored from the contacted material, not a continuous emitter. **Wire:** Arc Core ground contacts → `GroundEffectsAtmosphere`. **Effort: S · Risk: Very low · Impact: High**

279. **Celestial Engine aura occlusion** — Let aura rings pass behind the engine body and in front only at the appropriate orbit depth. **Wire:** engine aura layers → `CelestialEngineController` visual containers. **Effort: XS · Risk: Very low · Impact: High**

280. **Flight Gem acquisition fracture** — Break the visible crystal’s internal light into a few rising facets at collection while the authoritative pickup remains immediate. **Wire:** Flight Gem collection event → `LootPickupFxSystem`. **Effort: S · Risk: Very low · Impact: Very high**

## S. Chests, relics, portals, pillars, and titans

281. **Chest-latch snap highlight** — Run one small metal glint across the latch at the instant it releases, before the lid moves. **Wire:** chest opening phase → chest visual object. **Effort: XS · Risk: Very low · Impact: High**

282. **Chest-interior light volume** — Use a soft approved cone or volume that stays inside the open chest silhouette and fades as rewards leave. **Wire:** reward-open phase → `WorldVisualLightingBridge`. **Effort: S · Risk: Very low · Impact: High**

283. **Coin-arc floor shadows** — Add tiny transient shadows beneath the few representative chest coins so their height reads clearly. **Wire:** representative coin FX → `LootPickupFxSystem`. **Effort: S · Risk: Very low · Impact: High**

284. **Coin-face rotation variants** — Alternate approved bright and dark coin faces while spinning without increasing visual coin count. **Wire:** coin FX phase → generated coin atlas frames. **Effort: XS · Risk: Very low · Impact: Medium-high**

285. **Star reflection echo** — Sweep one brief cool reflection across nearby visible debris as the collected star passes overhead. **Wire:** star path position → local debris/material tint. **Effort: S · Risk: Very low · Impact: High**

286. **Relic dust-curtain peel** — Pull a thin layer of settled dust away from an already-visible relic silhouette before its orbit begins. **Wire:** relic collection phase → `RelicDiscoveryFxSystem`. **Effort: XS · Risk: Very low · Impact: High**

287. **Portal-frame surface refraction** — Bend a few pixels of the immediately adjacent visible surface along the inner portal rim, not the whole screen. **Wire:** active portal bounds → local effect mask. **Effort: S · Risk: Low · Impact: High**

288. **Portal destination tint harmony** — Tint only internal portal particles using the destination level’s approved palette while keeping outer frames consistent. **Wire:** portal destination metadata → portal visual preset. **Effort: XS · Risk: Very low · Impact: High**

289. **Milestone Pillar groove illumination** — Send completion light through existing engraved grooves in sequence instead of brightening the whole pillar uniformly. **Wire:** milestone-complete phase → `StarPillarSystem`. **Effort: S · Risk: Very low · Impact: High**

290. **Titan ambient pressure dust** — Once a titan is already visible, push nearby foreground dust outward slowly to reinforce scale without another reveal banner. **Wire:** visible titan bounds → atmosphere displacement. **Effort: S · Risk: Very low · Impact: High**

## T. UI-art replacement and visual consistency cleanup

291. **Generated hover-tooltip frame family** — Create one approved compact frame family for ability, resource, and contextual hover states instead of ad hoc flat panels. **Wire:** image-generated nine-slice art → Phaser UI; text remains dynamic. **Effort: M · Risk: Low · Impact: Very high**

292. **Ability-icon silhouette normalization** — Re-author icons so every action reads at the compact bar’s final size with consistent padding and optical weight. **Wire:** approved icon atlas → ability bar. **Effort: M · Risk: Very low · Impact: Very high**

293. **Target-reticle corner-art atlas** — Replace remaining square/line targeting primitives with approved material-aware corner glints and contact accents. **Wire:** approved atlas → `MiningIntentPreviewSystem`. **Effort: S · Risk: Low · Impact: Very high**

294. **Flat-cyan-frame replacement pass** — Find every visible primitive cyan tutorial or prompt frame and replace it with approved project-matched art or remove it. **Wire:** existing tutorial/prompt surfaces only; no new panels. **Effort: M · Risk: Low · Impact: Very high**

295. **HUD bevel-thickness unification** — Normalize border, corner, and inset thickness across the upper HUD, weather panel, XP bar, inventory, ability bar, and approved tooltips. **Wire:** approved shared frame atlas and layout values. **Effort: S · Risk: Very low · Impact: High**

296. **Icon emissive-intensity normalization** — Keep icon color identity while ensuring no small icon glows more strongly than world discoveries or ability contact. **Wire:** icon atlas grading plus shared UI tint values. **Effort: S · Risk: Very low · Impact: High**

297. **Typography baseline and padding pass** — Correct inconsistent text vertical alignment, internal padding, and optical centering inside existing approved art. **Wire:** `values/uiLayout.js` only after screenshot approval. **Effort: S · Risk: Very low · Impact: High**

298. **Sprite alpha-fringe cleanup** — Remove dark, white, or matte-colored halos from approved player, weather, portal, and UI assets at gameplay scale. **Wire:** offline asset cleanup and atlas rebuild; no runtime system. **Effort: M · Risk: Very low · Impact: Very high**

299. **Animation exposure continuity** — Normalize brightness and color across frames so player, NPC, prop, and effect animations do not flicker from inconsistent source grading. **Wire:** offline atlas grading with deterministic comparison sheets. **Effort: M · Risk: Very low · Impact: Very high**

300. **Per-biome hero-composition pass** — Select one representative camera view per biome and tune only existing art, light, atmosphere, and effect balance until each reads as a polished promotional screenshot. **Wire:** values and approved assets only; no new mechanic or HUD. **Effort: M · Risk: Very low · Impact: Very high**

## Review rule

Review these candidates in groups of ten. A “yes” approves only the direction. Any candidate requiring new visible art must receive an in-game ImageGen composition review before production wiring, and every implementation slice must remain independently disableable and Git-revertible.
