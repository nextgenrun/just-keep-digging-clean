# 200 Low-Clutter AAA Moving-Visual Polish Candidates

**Date:** 2026-07-26  
**Status:** Review list only. Nothing in this document is wired yet.

## Goal

Make the existing persistent digging game feel expensive, alive, physical, and satisfying through motion and visual choreography rather than more HUD, labels, panels, badges, trackers, or notification text.

The strongest direction is not “more effects everywhere.” It is better timing, better silhouettes, better material response, stronger world-space feedback, and deliberate quiet between important moments.

## Hard visual guardrails

- Add no new persistent HUD elements.
- Add no new task trackers, floating instructions, screen banners, route lines, tile boxes, or diagnostic-looking labels.
- Keep GP cost and ability state in the existing HUD; world-space effects only communicate direction, force, contact, and validity.
- Prefer character-attached, tile-attached, and environment-attached motion over screen-space overlays.
- Preserve all gameplay, economy, combo decay, collision, save, and input behavior unless a candidate explicitly says otherwise.
- Do not reveal hidden caves, geodes, resources, or destinations through effects.
- Use short-lived, pooled effects with strict particle and additive-blend budgets.
- Background motion must yield to mining, abilities, discoveries, and danger so the screen never becomes visual noise.
- Put every tunable color, duration, scale, count, alpha, and quality threshold in `/values/`.
- Treat this as an approval list. Wire only explicitly selected candidates.

## Rating key

- **Effort:** XS = tune or reuse an existing hook; S = one focused visual behavior; M = a limited multi-system choreography.
- **Risk:** Very low = presentation only; Low = presentation tied to gameplay timing; Medium = camera, collision-derived, or asset-sensitive.
- **Impact:** Expected improvement to perceived production quality.

## A. Player locomotion and body language

1. **Idle weight transfer** — Add a barely visible two-step weight shift after the player has stood still, then return to a quiet breathing loop. **Wire:** idle state from `PlayerController` → sprite scale/offset in `PlayerBodyLanguageSystem`; tune in `values/playerMotionPolish.js`. **Effort: XS · Risk: Very low · Impact: High**

2. **Breathing that respects danger** — Slow the idle breathing amplitude underground and tighten it during earthquakes instead of playing one universal idle motion. **Wire:** `PlayerBodyLanguageSystem` reads `EarthquakeSystem` intensity and depth band; presentation only. **Effort: S · Risk: Very low · Impact: Medium-high**

3. **Movement-start anticipation** — Lean the sprite two or three pixels into the first movement frame before full travel speed visually settles. Physics remains immediate. **Wire:** movement-state edge in `PlayerMovement` → `PlayerMotionPolishSystem`. **Effort: XS · Risk: Very low · Impact: High**

4. **Stop overshoot and settle** — On releasing movement, let the visual body travel one tiny extra offset and ease back while the physics body stops normally. **Wire:** velocity-to-zero transition → `PlayerKinematicMotionSystem`; values in `values/playerKinematicMotion.js`. **Effort: XS · Risk: Very low · Impact: High**

5. **Turnaround shoulder lead** — During a fast direction reversal, rotate or offset the upper silhouette before the feet visually catch up. **Wire:** sign change in horizontal input → `PlayerBodyLanguageSystem`. **Effort: S · Risk: Very low · Impact: High**

6. **Run cadence speed matching** — Slightly retime animation playback to actual horizontal speed so acceleration and slow movement stop looking like foot sliding. **Wire:** `PlayerMovement` speed ratio → `UalNativePlayerAnimations`; clamp in `values/ualNativePlayerAssetProfile.js`. **Effort: XS · Risk: Low · Impact: High**

7. **Foot-contact dust timing** — Spawn town or cave dust only on authored foot-contact frames instead of a generic timer. **Wire:** animation-frame contacts from `UalActionContactTimeline` → `GroundEffectsAtmosphere`. **Effort: S · Risk: Very low · Impact: High**

8. **Footstep side alternation** — Alternate left/right dust offsets and pebble kicks so repeated walking does not look like one central particle emitter. **Wire:** locomotion contact counter → `GroundEffectsAtmosphere`. **Effort: XS · Risk: Very low · Impact: Medium-high**

9. **Jump crouch compression** — Add a short pre-launch visual squash when a grounded jump begins without delaying the physics impulse. **Wire:** jump state edge → `PlayerMotionPolishSystem`; scale caps in `values/playerMotionPolish.js`. **Effort: XS · Risk: Very low · Impact: High**

10. **Takeoff dust cone** — Emit a narrow downward cone based on horizontal launch speed rather than one circular puff. **Wire:** jump impulse and velocity → `GroundEffectsAtmosphere`. **Effort: XS · Risk: Very low · Impact: High**

11. **Apex silhouette hold** — Ease the sprite pitch and trail intensity near vertical velocity zero so the jump apex reads cleanly for a few frames. **Wire:** `PlayerPhysicsBody.vy` → `PlayerKinematicMotionSystem`. **Effort: XS · Risk: Very low · Impact: Medium-high**

12. **Fall posture progression** — Blend from neutral fall to a more committed downward silhouette as fall speed grows. **Wire:** fall-speed bands → `UalNativeLocomotionTransitionSelector` and sprite presentation. **Effort: S · Risk: Low · Impact: High**

13. **Velocity-scaled landing squash** — Scale the existing landing compression and dust from gentle to heavy while leaving collision untouched. **Wire:** `PlayerRigContactSystem` landing velocity → `PlayerMotionPolishSystem` and `GroundEffectsAtmosphere`. **Effort: XS · Risk: Very low · Impact: High**

14. **Hard-landing recovery step** — Add a brief visual foot or body recovery offset after large falls instead of instantly returning to idle. **Wire:** hard-landing tier → `PlayerBodyLanguageSystem`. **Effort: S · Risk: Very low · Impact: High**

15. **Wall-contact body alignment** — Nudge the visual body toward the contacted wall and restore it smoothly on release. **Wire:** contact normal from `PlayerRigContactSystem` → `PlayerSolidOcclusionSystem`/body transform. **Effort: XS · Risk: Very low · Impact: Medium-high**

16. **Climb hand-contact grit** — Emit two or three particles from alternating upper contact points on climb animation contacts, not continuously. **Wire:** climb frames → `ClimbTrailSystem`; pool and offsets in `values/playerMotionPolish.js`. **Effort: S · Risk: Very low · Impact: High**

17. **Climb reversal follow-through** — Let old grit continue briefly in its original direction when climb input reverses so the trail does not snap. **Wire:** climb direction edge → `ClimbTrailSystem`. **Effort: XS · Risk: Very low · Impact: Medium-high**

18. **Flight pitch from velocity** — Pitch the flight silhouette subtly upward on ascent and downward on descent, preserving the approved animation. **Wire:** normalized velocity → `PlayerKinematicMotionSystem`; bounds in `values/playerFlightFootFx.js`. **Effort: XS · Risk: Very low · Impact: High**

19. **Flight trail pressure response** — Narrow and lengthen the existing foot trail at speed; widen and soften it while hovering. **Wire:** speed ratio → `FlightFootParticleSystem`. **Effort: XS · Risk: Very low · Impact: High**

20. **Teleport footing settle** — After arrival, compress the silhouette for a few frames and release a small floor-hugging energy ripple instead of popping directly to idle. **Wire:** teleport arrival completion → `PlayerMotionPolishSystem` and `WorldVisualGameplayEffectLayer`. **Effort: S · Risk: Very low · Impact: High**

## B. Mining, tool motion, and contact

21. **Swing anticipation frame** — Give the pickaxe trail a short backward wind-up before the forward arc without delaying damage contact. **Wire:** mining animation start → `PickaxeTrailSystem`; contact remains owned by `UalActionContactTimeline`. **Effort: XS · Risk: Low · Impact: High**

22. **Speed-shaped pickaxe trail** — Make the trail thin at startup, widest just before contact, and tapered after contact rather than one constant ribbon. **Wire:** normalized action time → `PickaxeTrailSystem`; curve in `values/playerMotionPolish.js`. **Effort: S · Risk: Very low · Impact: High**

23. **Surface-normal spark fan** — Launch impact sparks away from the struck face rather than radially from the tile center. **Wire:** committed contact direction from `PlaySceneUpdate` → `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: High**

24. **Contact-point accuracy** — Anchor sparks, dust, and chips to the actual pickaxe/tile contact point instead of the target tile center. **Wire:** `PlayerRigContactSystem` contact geometry → `PickaxeTrailSystem` and break FX. **Effort: S · Risk: Low · Impact: High**

25. **Tiny contact freeze** — Freeze only the player visual and pickaxe trail for a few milliseconds on a solid hit; keep simulation and input running. **Wire:** successful `DigSystem.tryMine()` result → `PlayerMotionPolishSystem`; duration in `/values/`. **Effort: XS · Risk: Low · Impact: High**

26. **Recoil direction match** — Push the visual torso and tool opposite the struck face, then ease back before the next swing. **Wire:** hit direction → `PlayerBodyLanguageSystem`. **Effort: XS · Risk: Very low · Impact: High**

27. **Dust sheet before debris** — Emit one fast, thin contact sheet first, then slower chips a frame later to improve impact layering. **Wire:** tile-damage event → `WorldVisualFeedbackLayer`; two-phase timing in `values/worldVisualFeedback.js`. **Effort: S · Risk: Very low · Impact: High**

28. **Debris foreground split** — Send a small percentage of chips in front of the player and the rest behind, creating depth without increasing total count. **Wire:** break FX container depths → `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: High**

29. **Chip rotation from launch force** — Give fast fragments stronger spin and slow fragments a heavy tumble. **Wire:** particle velocity → angular velocity in `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: Medium-high**

30. **Gravity-varied debris** — Use two or three restrained gravity bands so every chip does not trace the same arc. **Wire:** seeded fragment variants → `WorldVisualFeedbackLayer`; values in `values/worldVisualFeedback.js`. **Effort: XS · Risk: Very low · Impact: Medium-high**

31. **Fresh fracture dust leak** — Let a damaged tile release a faint dust wisp from its newest crack for a moment, then go quiet. **Wire:** damage state change → `WorldVisualDamagePainter` and `AmbientParticleSystem`. **Effort: S · Risk: Very low · Impact: High**

32. **Crack propagation animation** — Reveal the next damage decal along a short directional wipe from the contact point instead of swapping instantly. **Wire:** tile HP tier change → `WorldVisualDamagePainter`. **Effort: S · Risk: Very low · Impact: High**

33. **Final-hit material inhale** — On the breaking hit, pull nearby loose dust a few pixels toward the contact point immediately before the outward shatter. No tile box or label. **Wire:** existing final-hit result → `WorldVisualFeedbackLayer`. **Effort: S · Risk: Very low · Impact: High**

34. **Break-hole darkness bloom** — As a tile disappears, briefly deepen the new opening before the normal background is revealed. **Wire:** destroyed tile event → `WorldVisualRuntime`/`CaveInteriorOcclusionSystem`. **Effort: XS · Risk: Very low · Impact: High**

35. **Overkill forward cone** — Keep the same debris budget but bias more fragments through the far side when damage greatly exceeds remaining HP. **Wire:** overkill ratio from `DigSystem` → `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: High**

36. **Critical strike white core** — Give crit impacts one one-frame white-hot core surrounded by the existing crit color, then immediately return to normal. **Wire:** crit result → `ScreenFlashSystem` local/world effect and `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: High**

37. **Critical trail interruption** — Replace the final section of the pickaxe trail with a sharper luminous slice on crit instead of adding more text. **Wire:** crit flag known at contact → `PickaxeTrailSystem`. **Effort: S · Risk: Very low · Impact: High**

38. **Rapid-mining dust wake** — During sustained fast mining, accumulate one directional dust stream behind the active face rather than spawning full bursts every hit. **Wire:** recent-hit cadence from `DigSystem` → `AmbientParticleSystem`; hard cap in `/values/`. **Effort: S · Risk: Very low · Impact: High**

39. **Mining-stop dust settle** — When sustained mining ends, let the accumulated wake collapse and settle instead of vanishing. **Wire:** cadence timeout → `AmbientParticleSystem`. **Effort: XS · Risk: Very low · Impact: Medium-high**

40. **Unbreakable scrape identity** — Use a short tangential spark scrape and tool recoil for bedrock/protected hits, with no warning label. **Wire:** blocked mining result → `PickaxeTrailSystem` and `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: High**

## C. Quickslash, Heavy Punch, Thunder, and temporary power

41. **Quickslash anticipation shimmer** — Replace the debug tile square, route line, and `Q ROUTE` label with a short violet blade shimmer attached to the player’s facing side. It points only toward the real horizontal target and disappears instantly on release. Existing GP HUD remains the only cost display. **Wire:** held Quickslash state and committed direction → `MiningIntentPreviewSystem` rendered as character-attached world FX; tune in `values/retentionConfig.js`. **Effort: S · Risk: Very low · Impact: High**

42. **Quickslash tapered contact crescent** — Draw a fast crescent that narrows at both ends and peaks exactly on the authored contact frame. **Wire:** Quickslash contact from `UalActionContactTimeline` → `PickaxeTrailSystem` or a focused world-FX path. **Effort: S · Risk: Low · Impact: High**

43. **Quickslash directional afterimage** — Leave one or two low-alpha player silhouettes behind the burst, spaced by actual movement speed and destroyed quickly. **Wire:** active Quickslash movement → `PlayerMotionPolishSystem`; pooled texture references only. **Effort: S · Risk: Very low · Impact: High**

44. **Quickslash floor pressure streak** — Add a thin floor-hugging streak beneath the burst when grounded; omit it in air. **Wire:** Quickslash state plus `PlayerRigContactSystem` grounded result → `GroundEffectsAtmosphere`. **Effort: XS · Risk: Very low · Impact: High**

45. **Quickslash target compression** — Briefly compress the struck tile’s visual material inward before damage resolution reveals the normal result. **Wire:** committed Quickslash contact → `WorldVisualMaterialField`/feedback layer; presentation does not alter HP. **Effort: S · Risk: Very low · Impact: High**

46. **Quickslash spark continuation** — Let the brightest slash spark travel slightly beyond the contact face so the motion reads through the target. **Wire:** Quickslash direction → `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: Medium-high**

47. **Quickslash insufficient-GP sputter** — On a failed cast, show a very short broken blade glint at the player’s hand and nothing else—no label, route, or screen flash. **Wire:** failed `canPayQuickslashCost()` transition → `PickaxeTrailSystem`. **Effort: XS · Risk: Very low · Impact: High**

48. **Quickslash repeat variation** — Alternate between two mirrored crescent curvatures so rapid use does not look stamped while direction remains clear. **Wire:** successful Quickslash action counter → seeded variant in `PickaxeTrailSystem`. **Effort: XS · Risk: Very low · Impact: Medium-high**

49. **Heavy Punch forearm pressure arc** — Build a compact orange pressure arc around the striking side before contact rather than highlighting tiles with boxes. **Wire:** Heavy Punch preview/contact → `PlayerBodyLanguageSystem` and world-space graphics. **Effort: S · Risk: Very low · Impact: High**

50. **Heavy Punch rear-tile refraction** — Distort or brighten the actual affected rear tile for a fraction of a second without text or a permanent footprint. **Wire:** `DigSystem.getHeavyPunchPreview()` → `WorldVisualGameplayEffectLayer`. **Effort: S · Risk: Very low · Impact: High**

51. **Heavy Punch compression wave** — Send a narrow ring through the target and rear tile on contact, synchronized to destruction. **Wire:** Heavy Punch result → `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: High**

52. **Heavy Punch heavy debris bias** — Use fewer but larger fragments for the rear-tile hit while keeping the total particle budget unchanged. **Wire:** source action metadata → `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: Medium-high**

53. **Thunder charge particle draw-in** — Pull existing dust and tiny sparks from nearby visible tiles toward the player during charge instead of drawing a footprint grid. **Wire:** Thunder charge progress → `AmbientParticleSystem`; only sample visible tiles. **Effort: S · Risk: Very low · Impact: High**

54. **Thunder pre-strike silence frame** — Visually dim background particles for one short beat immediately before the strike so the bolt owns the frame. **Wire:** Thunder contact timeline → global effect-intensity governor in `PlaySceneUpdate`. **Effort: XS · Risk: Very low · Impact: High**

55. **Thunder branched bolt silhouette** — Use one dominant bolt plus two restrained branches aimed through the real affected column. **Wire:** `getThunderStrikePreview()` geometry → `WorldVisualGameplayEffectLayer`. **Effort: S · Risk: Very low · Impact: High**

56. **Thunder contact light propagation** — Flash nearby visible material edges from nearest to farthest over a few frames. **Wire:** Thunder entries → `WorldVisualLightingBridge`; no hidden-tile reveal. **Effort: S · Risk: Very low · Impact: High**

57. **Thunder debris levitation beat** — Lift loose dust and existing debris slightly before slamming it down after contact. **Wire:** charge/contact/end phases → `AmbientParticleSystem` and feedback pools. **Effort: S · Risk: Very low · Impact: High**

58. **Thunder ground-crawl filaments** — Let two or three thin energy filaments crawl along exposed visible surfaces after the strike and fade quickly. **Wire:** destroyed/visible tile edges → `WorldVisualGameplayEffectLayer`. **Effort: S · Risk: Very low · Impact: High**

59. **Chest ultra-buff speed wake** — While the 20-second buff is active, make mining motion leave a restrained gold-violet wake that grows only on critical contacts. No timer or new icon. **Wire:** existing chest-buff state → `PickaxeTrailSystem` and `PlayerBodyLanguageSystem`. **Effort: S · Risk: Very low · Impact: High**

60. **Buff expiration dissolve** — Fade the speed wake into a few upward motes during the final second so power loss feels intentional without another warning panel. **Wire:** remaining chest-buff duration → `AmbientParticleSystem`; gameplay duration unchanged. **Effort: XS · Risk: Very low · Impact: High**

## D. Tile materials, cracks, and destruction motion

61. **Directional edge sheen** — Give exposed tile edges a subtle light-facing sheen so the mine reads as carved volume instead of a flat grid. **Wire:** visible neighbor mask → `WorldVisualMaterialField` and `WorldVisualLightingBridge`. **Effort: S · Risk: Very low · Impact: High**

62. **Ore inclusion parallax** — Offset embedded ore flecks by a tiny fraction of camera motion while the base tile remains fixed. **Wire:** resource material layer → `WorldVisualMaterialBandView`; bounds in `values/worldVisualMaterials.js`. **Effort: S · Risk: Very low · Impact: High**

63. **Rare-block internal glint** — Animate one restrained internal glint across rich, packed, and ancient blocks on a long, seeded interval. No outline or label. **Wire:** rarity descriptor → `WorldVisualMaterialField`; seed from tile coordinates. **Effort: S · Risk: Very low · Impact: High**

64. **Rarity-specific glint cadence** — Make rich glints quick, packed glints broad, and ancient glints slow and deep while keeping brightness similar. **Wire:** existing rarity type → material animation values. **Effort: XS · Risk: Very low · Impact: Medium-high**

65. **Damage darkening under cracks** — Darken material directly beneath crack decals so damage looks cut into the surface rather than printed on top. **Wire:** HP tier → `WorldVisualDamagePainter`. **Effort: XS · Risk: Very low · Impact: High**

66. **Seeded crack origin** — Begin fracture growth at the actual contact quadrant while keeping deterministic decal variants for saves and re-entry. **Wire:** last contact direction → `WorldVisualDamagePainter`; stable seed in `values/worldVisualDamage.js`. **Effort: S · Risk: Very low · Impact: High**

67. **Crack dust direction memory** — Emit the next dust leak from the most recently extended crack endpoint. **Wire:** damage-painter geometry → `AmbientParticleSystem`. **Effort: S · Risk: Very low · Impact: Medium-high**

68. **Fracture micro-displacement** — Shift damaged material fragments inward by one or two pixels at high damage tiers without changing collision. **Wire:** HP tier → render-only offsets in `WorldVisualDamagePainter`. **Effort: S · Risk: Very low · Impact: High**

69. **Break fragment color inheritance** — Sample debris colors from the exact rendered material variant instead of one generic stone palette. **Wire:** `WorldVisualMaterialField` material identity → break FX palette. **Effort: S · Risk: Very low · Impact: High**

70. **Break fragment brightness falloff** — Let front-facing chips catch light briefly while rear chips remain dark, improving depth at the same count. **Wire:** launch direction and `WorldVisualLightingBridge` → debris tint. **Effort: XS · Risk: Very low · Impact: High**

71. **Fresh cavity edge crumbs** — After a tile breaks, release two or three delayed crumbs from the newly unsupported upper edge. **Wire:** visible neighbor change → `WorldVisualFeedbackLayer`; strict delayed-spawn cap. **Effort: S · Risk: Very low · Impact: High**

72. **Loose ledge pebble drops** — Occasionally drop one tiny pebble from an exposed damaged ledge after nearby movement, with no gameplay effect. **Wire:** visible damaged edge plus nearby player movement → `AmbientParticleSystem`; seeded cooldown. **Effort: S · Risk: Very low · Impact: Medium-high**

73. **Rubble layered collapse** — Make rubble fold inward and settle instead of exploding like solid ore-bearing stone. **Wire:** `wasRubble` result → dedicated variant in `WorldVisualFeedbackLayer`. **Effort: S · Risk: Very low · Impact: High**

74. **Bedrock scrape heat** — Let repeated blocked hits build a tiny warm scrape glow that cools quickly after mining stops. No progress implication. **Wire:** bedrock hit cadence → `WorldVisualBedrockMaterialLayer`; capped alpha. **Effort: S · Risk: Very low · Impact: High**

75. **Crystal facet light travel** — Move a narrow highlight across visible crystal facets based on camera/light angle rather than a timer-only pulse. **Wire:** crystal semantic assets → `WorldVisualSemanticAssetLayer` and lighting bridge. **Effort: S · Risk: Very low · Impact: High**

76. **Geode interior depth shimmer** — Give already-visible geode interiors layered facet shimmer without adding proximity hints or hidden-location cues. **Wire:** visible geode templates → `CaveTemplateVisualSystem`. **Effort: S · Risk: Very low · Impact: High**

77. **Ancient material dust behavior** — Ancient tiles shed slower, heavier motes on damage while normal material uses faster dust. Keep audio and rewards unchanged. **Wire:** rarity/material metadata → break FX particle preset. **Effort: XS · Risk: Very low · Impact: Medium-high**

78. **Earthquake loosened-tile jitter** — Apply one or two pixels of seeded render jitter to visible affected tiles before they break; collision remains fixed. **Wire:** `EarthquakeSystem` affected set → `WorldVisualMaterialField`. **Effort: S · Risk: Low · Impact: High**

79. **Earthquake passage settling** — Let newly opened edges release a short layered dust fall after the quake rather than relying on UI highlights. **Wire:** earthquake opened-passage records → `WorldVisualFeedbackLayer`. **Effort: S · Risk: Very low · Impact: High**

80. **Material-band crossfade** — Blend color, particulate density, and backdrop tint over several rows at depth boundaries instead of changing abruptly. **Wire:** `WorldVisualMaterialBandView` + `WorldVisualDepthBackdropStage`; values in `values/worldVisualRegions.js`. **Effort: M · Risk: Very low · Impact: High**

## E. Underground atmosphere and living depth

81. **Three-depth dust field** — Split underground motes into far, middle, and near layers with different parallax and blur-like scale. Keep the total count unchanged. **Wire:** `AmbientParticleSystem` containers and camera movement. **Effort: S · Risk: Very low · Impact: High**

82. **Vertical-shaft air pull** — Bias existing dust slowly up or down inside visible open shafts, derived only from local open-tile geometry. **Wire:** visible air-column query → `AmbientParticleSystem`. **Effort: S · Risk: Very low · Impact: High**

83. **Player wake through motes** — Push nearby ambient particles slightly aside as the player moves through them, then ease them back. **Wire:** player velocity/position → `AmbientParticleSystem`; near-field only. **Effort: S · Risk: Very low · Impact: High**

84. **Mining pressure wake** — Push nearby dust away from the active mining face before fragments appear. **Wire:** mining contact direction → `AmbientParticleSystem`. **Effort: XS · Risk: Very low · Impact: High**

85. **Ceiling grit after impact** — Heavy nearby hits knock a few particles from visible ceilings above, with distance falloff. **Wire:** impact magnitude → visible ceiling samples in `GroundEffectsAtmosphere`. **Effort: S · Risk: Very low · Impact: High**

86. **Cave fog layer breathing** — Move cave fog in slow opposing layers instead of uniform alpha pulsing. **Wire:** `CaveAtmosphereSystem`; tune in `values/caveSceneConfig.js`. **Effort: S · Risk: Very low · Impact: High**

87. **Cave-entry fog displacement** — Part local fog around the player silhouette on entry and let it close behind. **Wire:** `CaveEntryController` transition → `CaveAtmosphereSystem`. **Effort: S · Risk: Very low · Impact: High**

88. **Foreground silhouette drift** — Give near cave foreground shapes a tiny camera-relative drift so tunnels feel enclosed and deep. **Wire:** `CaveInteriorOcclusionSystem` foreground layer → camera delta. **Effort: XS · Risk: Very low · Impact: High**

89. **Occluder edge softness motion** — Let fog and dust soften hard occlusion edges without changing the authoritative visibility mask. **Wire:** `CaveInteriorOcclusionSystem` mask → `CaveAtmosphereSystem`. **Effort: S · Risk: Very low · Impact: Medium-high**

90. **Light-ray particulate travel** — Move sparse particles through existing light rays so shafts read as volume rather than static gradients. **Wire:** `LightRayAtmosphere` ray geometry → `AmbientParticleSystem`. **Effort: S · Risk: Very low · Impact: High**

91. **Ray response to camera angle** — Shift ray endpoints slightly with camera motion while their world anchors stay fixed. **Wire:** camera delta → `LightRayAtmosphere`. **Effort: XS · Risk: Very low · Impact: Medium-high**

92. **Distant backdrop slow life** — Animate only one subtle element per backdrop region—fog bank, suspended dust, crystal glow, or machinery pulse. **Wire:** `WorldVisualDepthBackdropRegionView`; per-region motion in `values/worldVisualDepthBackdrops.js`. **Effort: S · Risk: Very low · Impact: High**

93. **Backdrop motion desynchronization** — Seed phase offsets per region so repeated background elements never pulse together. **Wire:** region ID seed → `WorldVisualDepthBackdropStage`. **Effort: XS · Risk: Very low · Impact: High**

94. **Foreground/background counter-motion** — During fast vertical travel, move the nearest atmospheric layer slightly opposite the far layer to sell speed and depth. **Wire:** camera velocity → `WorldVisualRuntime` layer offsets. **Effort: S · Risk: Very low · Impact: High**

95. **Old-route calmness** — Reduce fresh dust and settling motion in long-cleared saved routes while preserving ambient life. **Wire:** existing dug-tile age/session knowledge → `AmbientParticleSystem`; no new reward state. **Effort: S · Risk: Very low · Impact: Medium-high**

96. **Fresh-route settling** — Newly opened routes keep light crumbs and dust for a few seconds, visually distinguishing active excavation from old tunnels. **Wire:** recent destroyed-tile ring buffer → `WorldVisualFeedbackLayer`. **Effort: S · Risk: Very low · Impact: High**

97. **Depth-pressure particle change** — Gradually make motes slower, larger, and sparser at extreme depth instead of simply tinting the screen darker. **Wire:** normalized depth → `AmbientParticleSystem`; values in `values/ambientParticleConfig.js`. **Effort: XS · Risk: Very low · Impact: High**

98. **Level 2 motion dialect** — Give Level 2 distinct ambient drift directions, crystal timing, and backdrop movement without adding a new mechanic. **Wire:** level ID → `BiomeSystem`, `AmbientParticleSystem`, and depth backdrops. **Effort: S · Risk: Very low · Impact: High**

99. **Quiet-frame governor** — Automatically reduce ambient particle alpha during rapid mining, Thunder, portal travel, and discoveries, then restore it smoothly. **Wire:** major-effect activity flags → `AtmosphereSystem`. **Effort: S · Risk: Very low · Impact: High**

100. **Underground stillness pockets** — Author rare short stretches with almost no motion so the next animated cave or material region feels more impressive. **Wire:** depth/backdrop region config → `WorldVisualDepthBackdropStage`; no gameplay change. **Effort: XS · Risk: Very low · Impact: High**

## F. Surface, town, NPC, and skyline life

101. **Campfire flame shape variation** — Alternate between a few restrained flame silhouettes while preserving light radius and buff behavior. **Wire:** `CampfireSystem` visual layer; variants in `/values/`. **Effort: XS · Risk: Very low · Impact: High**

102. **Campfire smoke wind bend** — Curve smoke based on current weather wind and player movement disturbance. **Wire:** `CampfireSystem` + `WeatherWorldState` → `AmbientParticleSystem`. **Effort: S · Risk: Very low · Impact: High**

103. **Campfire ember lift** — Release sparse embers that accelerate upward through the warm light and fade before the HUD. **Wire:** campfire position → `GroundEffectsAtmosphere`; pooled preset. **Effort: XS · Risk: Very low · Impact: High**

104. **Lantern micro-sway** — Add slow, seeded sway to hanging lights and signs rather than synchronized movement. **Wire:** semantic props in `WorldVisualSemanticAssetLayer`; wind factor from weather. **Effort: S · Risk: Very low · Impact: High**

105. **Lantern light lag** — Let the light pool trail the lantern sprite by a tiny amount during sway. **Wire:** prop transform → `WorldVisualLightingBridge`. **Effort: S · Risk: Very low · Impact: High**

106. **Stall-cloth wind response** — Bend or offset market cloth and banners in two or three wind states. **Wire:** town semantic assets + `WeatherWorldState` → `WorldVisualSurfaceStage`. **Effort: S · Risk: Very low · Impact: High**

107. **Sign-chain secondary motion** — Let hanging signs overshoot slightly after wind changes instead of matching cloth exactly. **Wire:** prop motion state → `WorldVisualSemanticAssetLayer`. **Effort: XS · Risk: Very low · Impact: Medium-high**

108. **Merchant idle phase offsets** — Start NPC idle loops at stable different phases so the town never breathes in unison. **Wire:** NPC ID seed → `NPCManager` animation start frame. **Effort: XS · Risk: Very low · Impact: High**

109. **Merchant player-facing glance** — Add a restrained head/body facing adjustment when the player enters interaction range, with no marker or dialogue. **Wire:** `NPCManager` proximity state → existing sprite orientation. **Effort: S · Risk: Very low · Impact: High**

110. **Merchant return-to-work motion** — When the player leaves, let the NPC settle back into its idle pose rather than snapping orientation. **Wire:** interaction-range exit → `NPCManager` visual tween. **Effort: XS · Risk: Very low · Impact: Medium-high**

111. **Town footstep material response** — Use the existing ground-contact particles with town-floor colors and smaller counts. **Wire:** surface floor semantic from `WorldVisualTownFloorView` → `GroundEffectsAtmosphere`. **Effort: S · Risk: Very low · Impact: High**

112. **Town floor scuff fade** — Leave very faint short-lived scuffs after fast stops and landings; never persist or accumulate heavily. **Wire:** landing/stop events → `WorldVisualTownFloorView`. **Effort: S · Risk: Very low · Impact: Medium-high**

113. **Rooftop dust gusts** — Spawn occasional low-density dust ribbons across roof lines during wind, behind characters. **Wire:** skyline weather state → `SkylineWeatherVfxSystem`. **Effort: S · Risk: Very low · Impact: High**

114. **Cloud-layer speed separation** — Move far clouds slowly and near wisps faster, with weather controlling both rather than one flat layer. **Wire:** `SkylineWeatherVfxSystem`/`SkylineWeatherVfxWorldWisps`. **Effort: XS · Risk: Very low · Impact: High**

115. **Distant silhouette crossings** — Rarely move tiny non-interactive silhouettes across the far skyline to imply a larger world. **Wire:** `WorldVisualSurfaceStage`; long seeded cooldown and strict depth placement. **Effort: S · Risk: Very low · Impact: Medium-high**

116. **Sky-island weight drift** — Give distant sky islands an extremely slow vertical drift with different phases, keeping teleport collision and destinations fixed. **Wire:** `V11SkyIslandVisualSystem`; render transform only. **Effort: S · Risk: Very low · Impact: High**

117. **Sky-island underside motes** — Let a few particles fall or float from island undersides to sell altitude and scale. **Wire:** island visual bounds → `SkylineWeatherVfxWorldWisps`. **Effort: XS · Risk: Very low · Impact: High**

118. **Surface depth parallax** — Increase separation between town foreground, skyline, clouds, and sky islands during horizontal travel. **Wire:** camera delta → `WorldVisualSurfaceStage`. **Effort: S · Risk: Very low · Impact: High**

119. **Town night-light awakening** — Fade lanterns on in a staggered spatial sequence as daylight drops rather than switching all at once. **Wire:** `DayNightCycle` → `WorldVisualLightingBridge`; seeded per prop. **Effort: S · Risk: Very low · Impact: High**

120. **Dawn atmosphere reset** — Let night motes fade, smoke regain daylight color, and distant layers brighten at different speeds. **Wire:** `DayNightCycle` → atmosphere, campfire, and surface stage. **Effort: S · Risk: Very low · Impact: High**

## G. Weather, lighting, shadows, and post-processing

121. **Rain depth layers** — Split rain into far thin streaks, gameplay-plane streaks, and sparse near-camera streaks without increasing the total particle cap. **Wire:** `WeatherParticleController`; values in `values/weatherConfig.js`. **Effort: S · Risk: Very low · Impact: High**

122. **Collision-aware rain splashes** — Place small splashes on the real visible surface hit by each sampled rain streak. **Wire:** `WeatherImpactRainController` + `WeatherOcclusionSampler`. **Effort: S · Risk: Low · Impact: High**

123. **Splash normal alignment** — Flatten or rotate rain impact shapes to match the contacted surface instead of using one horizontal sprite. **Wire:** collision normal → `WeatherImpactRainController`. **Effort: XS · Risk: Very low · Impact: High**

124. **Wind-driven rain curvature** — Curve long rain streaks slightly as gust strength changes rather than snapping angle. **Wire:** `WeatherWorldState` wind → `WeatherParticleController`. **Effort: XS · Risk: Very low · Impact: High**

125. **Player rain wake** — Briefly displace nearby rain and mist around fast player movement on the surface. **Wire:** player velocity → near-field weather particles. **Effort: S · Risk: Very low · Impact: Medium-high**

126. **Cloud pre-lightning bloom** — Brighten the responsible cloud region a fraction before the main lightning flash. **Wire:** `WeatherLightningController` telegraph phase → `SkylineWeatherVfxSystem`. **Effort: S · Risk: Very low · Impact: High**

127. **Lightning silhouette rim** — During the brightest flash, add a one-frame rim to the player, NPCs, and foreground props. **Wire:** lightning flash uniform → `PlayerLightShaderBridge` and surface semantic assets. **Effort: S · Risk: Very low · Impact: High**

128. **Lightning depth delay** — Flash far skyline layers a few milliseconds before near reflective edges to create spatial depth. **Wire:** lightning phase → surface-stage layer uniforms. **Effort: S · Risk: Very low · Impact: High**

129. **Storm particle suppression at impact** — Momentarily lower ordinary rain/mist alpha during a major lightning hit so the strike stays readable. **Wire:** `WeatherLightningController` → `WeatherParticleController`. **Effort: XS · Risk: Very low · Impact: High**

130. **Moving torch flicker** — Tighten and lean the player light slightly opposite travel direction, then restore it when stationary. **Wire:** player velocity → `PlayerLightAnchor`/`PlayerLightShaderBridge`; bounds in `values/lightConfig.js`. **Effort: S · Risk: Very low · Impact: High**

131. **Mining light kick** — Let strong impacts briefly brighten only nearby exposed edges, not the entire screen. **Wire:** impact world position → `WorldVisualLightingBridge`. **Effort: S · Risk: Very low · Impact: High**

132. **Material-aware light response** — Keep stone diffuse, metal-rich seams sharp, and crystals broad under the same light without changing gameplay identity. **Wire:** material type → `WorldVisualMaterialField` lighting parameters. **Effort: M · Risk: Very low · Impact: High**

133. **Campfire bounce movement** — Add a slow secondary warm-light movement on nearby surfaces while preserving the authoritative campfire radius. **Wire:** `CampfireSystem` visual phase → `WorldVisualLightingBridge`. **Effort: S · Risk: Very low · Impact: High**

134. **Crystal secondary bounce** — Let already-visible crystal props cast a faint colored response onto adjacent exposed surfaces. **Wire:** semantic crystal positions → `WorldVisualLightingBridge`; no hidden illumination. **Effort: S · Risk: Very low · Impact: High**

135. **Dust catches light** — Tint only particles that cross player, campfire, or lightning light volumes rather than globally tinting all dust. **Wire:** particle position → simplified light-volume query in `AmbientParticleSystem`. **Effort: M · Risk: Very low · Impact: High**

136. **Darkness-edge softness motion** — Add a slow, tiny noise drift at the boundary of the visibility light so it feels atmospheric rather than geometrically static. **Wire:** `darknessLightShader.js`; values in `values/lightConfig.js`. **Effort: S · Risk: Very low · Impact: High**

137. **Depth color-grade crossfade** — Blend existing color grade and saturation by depth region instead of hard switching. **Wire:** depth band → `PostFxSystem`/shader uniforms. **Effort: S · Risk: Very low · Impact: High**

138. **Impact exposure pulse** — Use a very small localized brightness lift on major crit, Thunder, and portal contacts, never a full white screen. **Wire:** major-effect events → `PostFxSystem` with world-position falloff. **Effort: S · Risk: Very low · Impact: High**

139. **Earthquake dust-light occlusion** — Reduce local light clarity as quake dust density rises, then restore it with the settling cloud. **Wire:** `EarthquakeSystem` intensity → `LightSystem`/`PostFxSystem`. **Effort: S · Risk: Very low · Impact: High**

140. **Weather clear-out choreography** — End storms by thinning near rain first, then far rain, then clouds, instead of switching the entire weather stack off. **Wire:** `WeatherDirector` state transition → particle and skyline systems. **Effort: S · Risk: Very low · Impact: High**

## H. Camera motion, transitions, and cinematic flow

141. **Acceleration-based look-ahead** — Ease the camera slightly toward sustained movement and return it slowly, with no offset during precise mining. **Wire:** movement intent/velocity → PlayScene camera controller; values in `/values/`. **Effort: S · Risk: Low · Impact: High**

142. **Fall-aware vertical lead** — Reveal more landing space as fall speed grows, then settle back on contact. **Wire:** `PlayerPhysicsBody.vy` → camera follow offset. **Effort: S · Risk: Low · Impact: High**

143. **Landing camera compression** — Add a tiny downward camera settle on hard landing, proportional to velocity and separate from shake. **Wire:** landing tier → camera tween in `PlaySceneUpdate`. **Effort: XS · Risk: Very low · Impact: High**

144. **Mining contact nudge** — Nudge the camera one or two pixels toward the struck face on strong contacts and ease back immediately. **Wire:** impact direction/magnitude → camera presentation. **Effort: XS · Risk: Very low · Impact: High**

145. **Crit directional punch** — Give crits a sharper, shorter directional camera impulse rather than a larger generic shake. **Wire:** crit event → `CameraShakeSystem`; tune frequency in `values/cameraShake.js`. **Effort: XS · Risk: Very low · Impact: High**

146. **Quickslash camera lead** — Move the camera slightly into the slash direction during the action, then recover before the next input. **Wire:** Quickslash action phase → camera offset; collision and target unchanged. **Effort: XS · Risk: Very low · Impact: High**

147. **Thunder charge framing** — Ease outward a tiny amount during charge and snap smoothly back through the contact, keeping HUD scale unchanged. **Wire:** Thunder charge progress → camera zoom; strict cap in `/values/`. **Effort: S · Risk: Low · Impact: High**

148. **Earthquake layered sway** — Move background, world, and foreground at slightly different amplitudes instead of shaking the whole frame identically. **Wire:** `EarthquakeSystem` wave → `WorldVisualRuntime` layer transforms and `CameraShakeSystem`. **Effort: M · Risk: Low · Impact: High**

149. **Shake source falloff** — Reduce quake and impact shake by world distance while preserving local particle response. **Wire:** event position → `CameraShakeSystem`; falloff in `values/cameraShake.js`. **Effort: S · Risk: Very low · Impact: High**

150. **Frequency-specific shake** — Use low-frequency motion for quake weight, high-frequency motion for sharp impacts, and one directional impulse for abilities. **Wire:** effect group → `CameraShakeSystem` profiles. **Effort: XS · Risk: Very low · Impact: High**

151. **Portal entry pull** — Ease the camera a few pixels toward the portal as the player enters, then transition before it becomes uncomfortable. **Wire:** teleport entry phase → camera tween. **Effort: S · Risk: Very low · Impact: High**

152. **Portal tunnel parallax** — Move existing portal particles in opposing depth layers during travel instead of adding a loading overlay. **Wire:** teleport transition → `WorldVisualGameplayEffectLayer`. **Effort: S · Risk: Very low · Impact: High**

153. **Portal arrival reverse pull** — Reverse particle flow and camera bias during arrival so exit feels physically connected to entry. **Wire:** arrival phase → the same portal effect pool. **Effort: XS · Risk: Very low · Impact: High**

154. **Cave-entry depth peel** — Slide foreground occlusion, mid fog, and background at separate speeds as the cave scene becomes authoritative. **Wire:** `CaveEntryController` → `CaveInteriorOcclusionSystem` and `CaveAtmosphereSystem`. **Effort: M · Risk: Low · Impact: High**

155. **Cave-exit eye adaptation** — Restore surface brightness in two short stages while the character remains fully controllable. **Wire:** cave exit transition → `PostFxSystem`/lighting. **Effort: S · Risk: Very low · Impact: High**

156. **Town-return camera settle** — Arrive slightly wider, then ease to normal framing while the player regains control. No summary panel is required for the visual beat. **Wire:** return-to-town completion → camera controller. **Effort: S · Risk: Very low · Impact: High**

157. **Discovery camera restraint** — Use a tiny world-position bias toward chests, stars, relics, or titans rather than interrupting control with a hard pan. **Wire:** discovery events → camera offset with immediate input cancellation. **Effort: S · Risk: Low · Impact: High**

158. **Cinematic input cancellation** — Any player movement immediately cancels optional camera flourishes while leaving core effect particles intact. **Wire:** `GameInputHandler` → optional camera tween owner. **Effort: XS · Risk: Low · Impact: High**

159. **Low-FPS motion simplification** — Reduce secondary camera layers before reducing core impact motion, preserving feel under load. **Wire:** measured FPS → `CameraShakeSystem` quality tier. **Effort: S · Risk: Very low · Impact: High**

160. **Reduced-motion coherence** — Existing reduced-motion settings should shorten or remove camera travel while retaining contact flashes and clear silhouettes. **Wire:** `USER_SETTINGS` display values → camera/effect profiles. **Effort: S · Risk: Very low · Impact: High**

## I. Chests, stars, relics, portals, pillars, and discoveries

161. **Chest lid weight** — Add a short anticipation, fast opening rotation, and small rebound instead of an instant state swap. **Wire:** authored chest open event → chest visual object in the world renderer. **Effort: S · Risk: Very low · Impact: High**

162. **Chest dust seal break** — Release a thin ring of dust from the lid seam just before rewards launch. **Wire:** chest opening phase → `WorldVisualFeedbackLayer`. **Effort: XS · Risk: Very low · Impact: High**

163. **Chest money fountain discipline** — Launch fewer representative coins in three readable arcs while awarding the same money instantly. **Wire:** chest reward result → `LootPickupFxSystem`; visual count capped independently of amount. **Effort: S · Risk: Very low · Impact: High**

164. **Chest-star contrast beat** — If a star is present, briefly suppress coin brightness and let the star own the center of the opening. **Wire:** chest reward contents → `LootPickupFxSystem` choreography. **Effort: XS · Risk: Very low · Impact: High**

165. **Star pickup spiral** — Orbit the visible star once around the player before it dissolves upward, without delaying collection. **Wire:** star pickup event → `LootPickupFxSystem`/`FloatingTextSystem` visual layer only. **Effort: S · Risk: Very low · Impact: High**

166. **Star trail taper** — Use a bright head and rapidly thinning tail that curves toward the sky rather than a straight line into UI. **Wire:** star collection FX → `LootPickupFxSystem`. **Effort: XS · Risk: Very low · Impact: High**

167. **Star world-light response** — Let nearby exposed edges catch a brief cool highlight as the star rises. **Wire:** star FX world position → `WorldVisualLightingBridge`. **Effort: S · Risk: Very low · Impact: High**

168. **Relic pedestal wake-up** — Animate dust lifting and tiny runes or facets brightening only after the relic is already visible. No proximity locator. **Wire:** visible relic state → `RelicDiscoveryFxSystem`. **Effort: S · Risk: Very low · Impact: High**

169. **Relic pickup orbit layers** — Rotate two differently sized world-space rings around the relic before they collapse into the player. **Wire:** relic collection event → `RelicDiscoveryFxSystem`. **Effort: S · Risk: Very low · Impact: High**

170. **Relic residual floor mark** — Leave a faint short-lived light pattern where the relic was collected, then dissolve it. **Wire:** relic removal position → `WorldVisualGameplayEffectLayer`. **Effort: XS · Risk: Very low · Impact: Medium-high**

171. **Portal idle depth distortion** — Animate a restrained internal parallax swirl inside active portals while keeping their outer silhouette quiet. **Wire:** portal visual state → `SpecialTileSystem` visual or semantic layer. **Effort: S · Risk: Very low · Impact: High**

172. **Portal activation wave** — Send one clean ring through nearby visible surfaces on first activation rather than adding more text. **Wire:** existing first-activation event → `WorldVisualGameplayEffectLayer`. **Effort: XS · Risk: Very low · Impact: High**

173. **Portal particle suction** — Pull existing motes toward the portal only during entry and reverse them at arrival. **Wire:** teleport phase → `AmbientParticleSystem`. **Effort: S · Risk: Very low · Impact: High**

174. **Portal silhouette stretch** — Stretch the player visual slightly toward the portal center before disappearance; physics and safe landing remain unchanged. **Wire:** teleport entry timeline → `PlayerMotionPolishSystem`. **Effort: S · Risk: Very low · Impact: High**

175. **Level 2 portal motion identity** — Give Level 2 portals a deeper, slower internal rotation and different particle fall direction, not another label. **Wire:** portal level metadata → portal visual preset. **Effort: XS · Risk: Very low · Impact: High**

176. **Milestone Pillar ambient orbit** — Keep two or three sparse motes orbiting the pillar at different radii, speeding up only when a milestone is actually completed. **Wire:** `MilestoneBoardSystem` state → `StarPillarSystem` world visuals. **Effort: S · Risk: Very low · Impact: High**

177. **Pillar completion pulse** — Send a vertical light pulse through the pillar and into nearby floor seams on completion. **Wire:** milestone-complete event → `StarPillarSystem` and lighting bridge. **Effort: S · Risk: Very low · Impact: High**

178. **Titan scale reveal** — Use foreground dust displacement and a slow silhouette light pass to reveal a titan’s size without a large banner. **Wire:** `TitanDiscoverySystem` → `titanDiscoveryFx.js` and atmosphere suppression. **Effort: M · Risk: Very low · Impact: High**

179. **Celestial Engine layered aura** — Separate the engine aura into slow mass, medium rotation, and fast spark layers so it feels powered rather than simply glowing. **Wire:** `CelestialEngineController` → world visual layers; values in `values/celestialEngines.js`. **Effort: S · Risk: Very low · Impact: High**

180. **Heavenblocks threshold transition** — Change particle direction, light softness, and backdrop drift progressively at the threshold instead of presenting a new screen. **Wire:** `HeavenblocksAccessSystem` → `HeavenblocksPresentationSystem`, atmosphere, and lighting. **Effort: M · Risk: Very low · Impact: High**

## J. Visual hierarchy, choreography, variation, and performance

181. **One hero effect at a time** — Give Quickslash, Thunder, portal travel, discoveries, and quakes a shared priority system that temporarily quiets lower-priority particles. **Wire:** effect activity flags → `AtmosphereSystem` and visual managers. **Effort: S · Risk: Very low · Impact: High**

182. **Contact-synchronized effect clock** — Drive trail peak, spark birth, camera impulse, light kick, and debris release from the same authored contact timestamp. **Wire:** `UalActionContactTimeline` → visual event payload consumed by current systems. **Effort: M · Risk: Low · Impact: High**

183. **Seeded impact variants** — Select among a few debris angles, dust shapes, and trail curves using action/tile seeds so repetition varies but recordings remain reproducible. **Wire:** tile coordinates plus action counter → visual variant helper. **Effort: S · Risk: Very low · Impact: High**

184. **No-repeat variant guard** — Prevent the same impact or idle variant from playing more than twice consecutively. **Wire:** small recent-choice state in visual systems only. **Effort: XS · Risk: Very low · Impact: Medium-high**

185. **Motion amplitude hierarchy** — Reserve the largest movement for discoveries and abilities, medium movement for destruction, and small movement for ambience. **Wire:** shared amplitude tiers in `/values/` consumed by camera, particles, and lighting. **Effort: S · Risk: Very low · Impact: High**

186. **Color hierarchy discipline** — Reserve white cores for exceptional contact, violet for Quickslash, cyan for Thunder, warm gold for chest power, and muted material colors for normal mining. **Wire:** consolidate effect colors in existing values files; no mechanics change. **Effort: XS · Risk: Very low · Impact: High**

187. **Additive-blend budget** — Cap simultaneous additive sprites and replace the oldest low-priority glow before spawning a new hero effect. **Wire:** effect pools in `WorldVisualFeedbackLayer`, weather, and discovery FX. **Effort: S · Risk: Very low · Impact: High**

188. **Per-zone particle budget** — Allocate particles to the player vicinity and current hero event rather than distributing them evenly across the whole camera. **Wire:** `AmbientParticleSystem` spawn budget by camera zone. **Effort: S · Risk: Very low · Impact: High**

189. **Offscreen effect culling** — Do not create break, weather-impact, or ambient visual objects outside a padded camera rectangle. Gameplay events still run. **Wire:** shared camera-bounds test → visual spawn call sites. **Effort: XS · Risk: Very low · Impact: High**

190. **Distance-based motion LOD** — Keep near props fully animated, far props on simplified cycles, and very far props static between camera moves. **Wire:** distance bands → semantic asset, skyline, and backdrop systems. **Effort: S · Risk: Very low · Impact: High**

191. **Fast-action particle reuse** — Reposition and retint pooled particles during rapid mining instead of allocating new objects for every hit. **Wire:** `WorldVisualFeedbackLayer`/particle managers. **Effort: S · Risk: Very low · Impact: High**

192. **Effect lifetime compression under load** — Shorten low-priority dust and motes before reducing core contact sparks, preserving responsiveness on weak hardware. **Wire:** measured FPS → visual quality governor. **Effort: S · Risk: Very low · Impact: High**

193. **Background pause during menus** — Freeze world ambient motion cleanly when blocking overlays are open so the composition does not distract behind them. **Wire:** overlay visibility from `OverlayManager` → atmosphere and backdrop systems. **Effort: XS · Risk: Very low · Impact: Medium-high**

194. **Motion resumes with phase continuity** — Resume paused loops from their former phase instead of restarting all props together. **Wire:** visual-system pause/resume clocks. **Effort: XS · Risk: Very low · Impact: Medium-high**

195. **Camera-relative pixel snapping audit** — Keep world art stable while allowing particles and soft lighting to move subpixel, preventing shimmer without making motion rigid. **Wire:** `RenderDensitySystem`, camera transforms, and selected effect containers. **Effort: S · Risk: Low · Impact: High**

196. **Native-density VFX scaling** — Scale particle size, line width, and glow softness consistently under native-density and legacy render modes. **Wire:** `RenderDensitySystem` → visual preset multiplier; preserve `?nativeDensity=0`. **Effort: S · Risk: Very low · Impact: High**

197. **World-space contrast check** — Automatically lower an effect’s glow when it would wash out the player or target silhouette against the local backdrop. **Wire:** simplified backdrop luminance sample → hero FX alpha clamp. **Effort: M · Risk: Very low · Impact: High**

198. **Effect isolation review mode** — Add a developer-only query flag that plays one effect family at a time against the real scene for fast quality review; never ship visible controls. **Wire:** query config → visual managers and existing recording tools. **Effort: S · Risk: Very low · Impact: High**

199. **Automated visual-budget contract** — Add tests for maximum simultaneous particles, additive objects, retained tweens, and offscreen spawns so polish cannot become clutter later. **Wire:** visual-system debug counters → focused contract under `testing/`. **Effort: S · Risk: Very low · Impact: High**

200. **AAA vertical-slice polish pass** — Tune one complete sequence—run, jump, land, aim, mine, crit, Quickslash, tile break, pickup, and atmosphere recovery—before spreading effects across the game. Use that sequence as the quality bar for every later candidate. **Wire:** existing systems above plus a deterministic local test route and `ScreenRecordSystem`. **Effort: M · Risk: Very low · Impact: Very high**

## Best first implementation wave: maximum polish, minimum clutter

These are the strongest low-risk candidates to review first:

1. **#41 Quickslash anticipation shimmer** — directly replaces the dev-tool-looking square, route line, and label.
2. **#42 Quickslash tapered contact crescent**
3. **#22 Speed-shaped pickaxe trail**
4. **#24 Contact-point accuracy**
5. **#27 Dust sheet before debris**
6. **#28 Debris foreground split**
7. **#32 Crack propagation animation**
8. **#33 Final-hit material inhale**
9. **#34 Break-hole darkness bloom**
10. **#36 Critical strike white core**
11. **#38 Rapid-mining dust wake**
12. **#6 Run cadence speed matching**
13. **#7 Foot-contact dust timing**
14. **#13 Velocity-scaled landing squash**
15. **#18 Flight pitch from velocity**
16. **#19 Flight trail pressure response**
17. **#61 Directional edge sheen**
18. **#63 Rare-block internal glint**
19. **#81 Three-depth dust field**
20. **#83 Player wake through motes**
21. **#99 Quiet-frame governor**
22. **#114 Cloud-layer speed separation**
23. **#127 Lightning silhouette rim**
24. **#145 Crit directional punch**
25. **#150 Frequency-specific shake**
26. **#161 Chest lid weight**
27. **#165 Star pickup spiral**
28. **#171 Portal idle depth distortion**
29. **#181 One hero effect at a time**
30. **#200 AAA vertical-slice polish pass**

## Recommended approval method

Approve candidates by number. For the first pass, choose roughly 10–20 from the shortlist rather than wiring all 200. Start with the complete vertical slice in #200, compare it in the real game, then use its motion, color, particle, and timing limits as the production standard.
