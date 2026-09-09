**UNDERSTAR: visuals, game feel, fun, and Steam priorities — 5 September 2026**

My recommendation is to concentrate the next development pass on a more readable player, satisfying early excavation, an early taste of celestial power, and decisions that change the mine. UNDERSTAR has enough underlying systems to support a distinctive game. Its strongest opportunity is to make those systems produce a coherent experience that a new player can understand, feel, and describe.

This is a review and set of proposed experiments. It does not change the canonical design or authorize a release. No production gameplay, assets, balance, or combo timing were changed for this audit.

**What this review actually checked.** I reviewed the canonical design, current capability gates, player/input/animation pipeline, mining and health values, world generation, visual biome families, lighting, Stars/scars, celestial powers, shop progression, Campfire, Titans, caves, hazards, audio, UI, and runtime asset budgets. I inspected the current Steam page and Valve's device guidance. I also ran the actual world generator and sampled the real Phaser runtime through the checkout's canonical `serve.py`.

The normal browser connection failed repeatedly. An isolated headless Chrome session subsequently worked. A fixture-started guided opening accepted real movement input and moved the player about 306 px. A second, save-disabled review staged small standing pockets at Level One x=20 and depths 18, 144, 693, and 1016 m. Six seconds of real S+F input broke the 45-HP floor at 18 m and damaged the next stone. Those captures used starter progression with GP replenished. They establish current rendering and input behavior, not natural deep-game pacing, a complete playthrough, or Steam/Deck performance. The fixture terrain pockets were explicitly staged; they are not discovered natural caves. Captured page-error arrays were empty.

Level Two, Arc Core, Heavenblocks, natural Hardcore death/return behavior, long-session save recovery, controller operation, and the full first two hours were not played through. The attempted Escape screenshot did not show a pause menu, so it is not evidence that pause works or fails. Audio routing was inspected in source; no listening verdict is claimed.

Evidence: [town capture](C:/Users/Mila/.codex/visualizations/2026/09/05/01a07182-b8e0-7563-8315-7d2dcc0f4370/audit-town.jpg), [144 m fixture](C:/Users/Mila/.codex/visualizations/2026/09/05/01a07182-b8e0-7563-8315-7d2dcc0f4370/audit-depth-144.jpg), [movement record](C:/Users/Mila/.codex/visualizations/2026/09/05/01a07182-b8e0-7563-8315-7d2dcc0f4370/audit-runtime.json), [mining/depth record](C:/Users/Mila/.codex/visualizations/2026/09/05/01a07182-b8e0-7563-8315-7d2dcc0f4370/depth-runtime.json), [model measurements](C:/Users/Mila/.codex/visualizations/2026/09/05/01a07182-b8e0-7563-8315-7d2dcc0f4370/source-measurements.json).

**The game's strongest identity is already present.** Flight makes player-made shafts useful routes. Intact Stars provide local light, GP recovery, and Panic relief. Sacrificed Stars leave depleted territories. Worldroot and Campfire make world state visible above ground. Titans give excavation a sense of scale and mystery. These elements support a memorable promise: *carve a mine, decide which lights to keep, and bring its power home.* That is a proposed positioning direction, not current store copy.

For comparison, Dome Keeper explicitly connects excavation to a clear reason to return and defend. The useful lesson for UNDERSTAR is an immediately understandable expedition decision; its own Stars, GP, persistent routes, and sanctuary can supply that decision. This is a design inference, not a claim about what caused another game's sales. [Dome Keeper's developer description](https://store.steampowered.com/app/1637320/Dome_Keeper/).

**Priority order.** Impact and effort below are design judgments, not measured uplift or delivery estimates. Small means a bounded pass using existing systems; medium needs coordinated art/design/code work; large needs new authored encounters and substantial validation.

| Priority | Biggest win | Evidence strength | Expected impact | Relative effort |
|---|---|---|---|---|
| 1 | Tune early contacts and reward payoff | Current formulas + model + one mining sample | Very high: feel and first-session enjoyment | Small/medium |
| 2 | Establish player, terrain, and HUD hierarchy | Fresh rendered captures + UI values | Very high: readability and visual quality | Medium |
| 3 | Guarantee an early, useful power trial | Actual generated placements + existing Ability Block | Very high: excitement and motivation | Small |
| 4 | Make keeping versus harvesting Stars a viable strategic choice | Current consequences and progression sources | High: identity and expedition decisions | Medium; design decision first |
| 5 | Give major biome families different play patterns | Current visual profiles; gameplay proposals untested | High: discovery and variety | Medium/large |
| 6 | Make upgrades demonstrate new capability | 121 price ranks + existing power mechanics | High: progression satisfaction | Medium |
| 7 | Choreograph danger, audio, and quiet recovery | Systems exist; combined experience needs playtesting | High: atmosphere and fairness | Medium |
| 8 | Complete controller and small-screen UX | Input search + rendered text + Valve requirements | High for the intended Steam audience | Medium/large |
| 9 | Reduce preparation friction and connect discoveries to the next trip | Existing town, Campfire, Journey, and Titan systems | Medium/high: expedition rhythm | Small/medium |

1. **Tune excavation by contacts and payoff, not a global speed multiplier.**

   The current baseline is a 1500 ms mining cooldown, 16 soft-material damage, and 8 hard-material damage. A pure-model preview at 20 m, with no upgrades, level bonuses, criticals, or temporary effects, gives:

   | Material | HP | Damage per ordinary contact | Contacts to break |
   |---|---:|---:|---:|
   | Dirt | 45 | 16 | 3 |
   | Stone | 87 | 8 | 11 |
   | Copper | 141 | 8 | 18 |
   | GP Block | 143 | 16 | 9 |
   | Speed Block | 334 | 16 | 21 |
   | Ability Block | 191 | 16 | 12 |

   These are contact counts, not observed clear times. Some authored combo actions produce multiple contacts, and normal progression changes damage. Nevertheless, the jump from three dirt contacts to eighteen copper contacts is a strong candidate for early fatigue or confusion.

   Speed Blocks also deserve a payoff check: the current +50% mining rate lasts 20 seconds. At the unupgraded cooldown, that provides roughly 6–7 additional action starts during the buff. Compare that gain with the shell's excavation effort, other rewards, travel, and animation contacts before deciding the pickup is worth pursuing.

   My first experiment would preserve depth and rarity ordering while ensuring that ordinary rock gives frequent satisfying breaks at its intended equipment tier. Keep especially tough seams as readable goals with a viable route around them. Make first purchases cross a noticeable breakpoint. Test short, medium, and heavy material responses, with the heaviest sound, debris, and pose hold reserved for meaningful breaks.

   The current contact timeline, material particles, 12–40 ms pose holds, and bounded camera response are valuable foundations. Refine their timing and relative intensity. Combo decay should remain unchanged.

   Sources: [mining baseline](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/miningConfig.js), [health](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/tileHealth.js), [damage/contact preview](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/mining/DigSystem.js:454), [impact tuning](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/miningImpactPolish.js), [contact timeline](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/player/UalActionContactTimeline.js).

2. **Make the image communicate where to look and what can be touched.**

   In the fresh town capture, the player is less visually prominent than the large merchants, ornate interface frames, and detailed scenery. This is an observation about this composition, not a blanket judgment on the assets. The underground fixture also shows several competing texture scales: roots and structural detail, resource patches, the excavation edge, and a small player silhouette.

   Set an explicit priority: player and immediate threat, actionable terrain/reward, useful landmark, atmosphere. Give the player consistent local contrast and a recognizable silhouette. Strengthen the cut face and contact shadow at excavated boundaries. Reduce the contrast and fine detail of decorative layers behind the playable edge. Preserve the existing surface warmth and underground palette variety.

   The recent cave grading and shadow repair already move in this direction. Extend their visual hierarchy using the existing artwork and rendering owners. A coherent cut edge and consistent material scale can improve the whole mine more than another large batch of backgrounds.

   HUD chrome occupies substantial attention while several labels remain very small. The guide permits 8 px detail and 9 px promise minimums; the rendered screenshot demonstrates the resulting reading burden. Put more of the panel's area into readable words. Reveal ability slots as they become relevant, group secondary shortcuts into existing menu surfaces, and keep the current objective visible without making its frame a focal point. Preserve the authored UI language.

   There is also a concrete identity mismatch to resolve: the production Survivor has weapon-free punch/kick animations, while progression still displays pickaxes. Choose the intended fantasy and make purchases visibly affect that hero. For the current brawler, evolving gloves, boots, a carried power source, and recognizable strike signatures are plausible art directions.

   At 693 m the starter-stat fixture is almost entirely dark, even after GP replenishment. That is not a fair representation of a naturally upgraded player. It does make equipment-matched visibility captures a necessary part of the next art review. Evaluate useful silhouettes and playable edges separately from hidden resources; preserve darkness's gameplay role.

   Sources: [player presentation](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/player/readme.md), [guide typography](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/retentionConfig.js:242), [current cave composition](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/caveVisualComposition.js), [visual families](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/levelOneBiomeVisualFamilies.js).

3. **Let the player taste the exciting abilities early.**

   The existing Ability Block already grants a 20-second free choice among Quick Slash, Thunder Strike, Wayward Star, Hollow Sun, and Stellar Lance. The configured probability is 0.00875%. More usefully, running the actual generator with seed 133742 found no Ability Block in the first 50 m of x=0..119, one through 300 m at x=66/depth=89, and the next in that sampled area at 517 m. These are world placements, not encounter probabilities. Other world areas and future generator changes can differ.

   This is a high-value feature that a player following the starter shaft can easily miss. Place one authored trial shortly after the first successful sell/upgrade loop. Offer a small, readable choice and nearby terrain that makes the chosen power useful immediately. Retain the ordinary permanent unlock economy and rare later finds. Prevent repeat farming through the existing durable one-time progression pattern.

   Shape that test chamber around the abilities: a compact pocket for Hollow Sun, a short aligned seam for Lance, and a room that makes a ricochet's path easy to read. The goal is for the player to think, "I want to build toward that," after doing something enjoyable.

   Source: [Ability Block configuration](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/specialBlocks.js:160), [generation authority](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/model/WorldSpawnAuthority.js), [measurement record](C:/Users/Mila/.codex/visualizations/2026/09/05/01a07182-b8e0-7563-8315-7d2dcc0f4370/source-measurements.json).

4. **Develop the Star decision without turning collection into a cleanup chore.**

   Intact Stars have three refuge temperaments. Sacrifice removes the refuge, depletes its territory's material yield, and creates a scar with 4× Panic accumulation. The configuration also warns about destroying the last Star. Those consequences give a decision lasting weight.

   My concern is a potential dominant routine: clear every worthwhile resource, then take the Star. If that is optimal too often, an interesting choice becomes compulsory cleanup. This is a hypothesis, not a measured player response or a proven economy softlock.

   Current progression is more nuanced than "destroy Stars to use powers": levels supply Talent Points for node ownership; Stars fund rank improvements; chests can also award Stars; action-bar celestial powers now cost 100 GP rather than spending the legacy Star Heart charge bank. Any redesign must respect those current facts.

   Test whether preserving a useful refuge and harvesting one for immediate rank power are both attractive during normal progression. Make the affected territory legible before commitment and show the consequence through its existing environment, map, and Worldroot state. The preservation route could receive a bounded, one-time attunement opportunity using existing progression resources. Its exact reward requires comparison against harvest; an easily repeatable refuge reward would undermine the choice.

   Sources: [Star consequences](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/starSanctuary.js), [talent ownership](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/progression/CelestialTalentProgressionSystem.js), [rank costs](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/celestialTalentRanks.js), [current activation](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/celestialEngines.js:183), [chest rewards](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/treasureChestConfig.js).

5. **Give the major biome families different decisions.**

   The current field defines fifty named visual profiles across five parent families. That is substantial presentation variety. The next content investment should make players change their approach when entering a major family. This does not require fifty separate gameplay systems.

   Prototype one room rule per major family. Rootways could expose connected roots that reward choosing a cut. Cobalt could use resonant mineral clusters. Amber could reward carefully exposing a fossil structure. Mirrorstone could favor readable ricochet chambers. Magma could offer a vent that can be opened for safety or left sealed while pursuing a richer seam. These are proposed mechanics, not current biome behavior.

   Pair each rule with an unmistakable silhouette, a restrained sound identity, and a useful discovery. Existing Flight, digging, and cover must remain viable; a room should not unexpectedly require an unowned ability. Mix authored opportunities into exploration rather than forcing every player through an identical checklist.

   Source: [biome field](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/levelOneBiomeField.js), [cave entry and destination config](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/caveSceneConfig.js).

6. **Make progression prove its value in the world.**

   The current shop cost arrays contain 121 ranks, before counting one-time purchases. A long ladder can support a satisfying persistent game, but rank count does not establish hours of worthwhile progression.

   Use the existing projected-upgrade and hits-to-break authorities to show practical comparisons: how many contacts a familiar material needs, how far Flight can carry the player, or which seam becomes accessible. The retention system already has before/after payoff fields; confirm the complete player-facing route instead of adding another progression owner.

   The three celestial powers already differ in geometry, and current talents include returning Stars, dig-steered holes, overkill Lance behavior, and passive Apex echoes. Give those mechanics terrain where the difference matters. Evaluate an upgrade by the new action or route it enables, alongside damage efficiency.

   Sources: [121 rank arrays](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/upgradeRankBalance.js), [unlock gates](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/upgradeUnlockProgression.js), [payoff state](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/progression/RetentionProgressSystem.js:331), [current celestial behavior](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/celestial/readme.md).

7. **Give spectacle a rhythm and make threats teachable.**

   Mining impact feedback, material audio, contextual music, Star ambience, panic, weather, earthquakes, and the Wurm all have dedicated systems. The audit does not establish that their combined mix is too busy. It establishes that their interaction needs a listening and playtest pass before more layers are added.

   Design a few repeated contrasts: ordinary mining, a promising discovery, a brief threat, recovery at a refuge, and return to town. Let the reward break sound larger than the preceding hits. Preserve clear positional hazard cues when music becomes urgent. Let a Star refuge sound and look like relief. Protect a major Titan reveal from unrelated UI or musical interruptions.

   In Hardcore, GP supports survival as well as movement, torch use, and abilities. A death needs an understandable cause and an opportunity to react. Test combined pressures with normal equipment, including retreat and return costs; individual hazard tests cannot prove the combined experience is fair.

   Sources: [contextual music](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/musicDirector.js), [material and spatial audio](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/freesoundAudio.js), [earthquakes](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/earthquakes.js), [Wurm](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/graveborerWurm.js).

8. **Treat the Steam input experience as product work.**

   Searches of the active JavaScript found keyboard/pointer routes, but no `gamepad`, `navigator.getGamepads`, Steam Input, or Steamworks integration. A separately packaged client or Steam Input mapping could exist outside this checkout; neither was verified. The current store has a Controller tag and lists 103 interface languages. The reviewed runtime exposes English strings, and I did not locate a localization layer in the searched code. Verify the actual package and language coverage before relying on those declarations. [Current UNDERSTAR store page](https://store.steampowered.com/app/4982520/).

   Build and test the full controller route: new run, mining and aiming, Flight, ability selection, shops, maps, talents, typed confirmations, death, saving, and resuming. Controller support includes the menus. Keep action mapping shared with existing gameplay input rather than creating a second controller-only movement implementation.

   Valve requires access to all content through the default controller configuration and appropriate controller glyphs. Required text entry needs controller-usable input. Deck guidance specifies a 9-pixel minimum character height at 1280×800 and recommends aiming for 12 pixels. CSS/Phaser font size alone does not prove rendered character height. [Valve compatibility criteria](https://partner.steamgames.com/doc/steamhardware/compat?l=english).

   There is also a positioning decision: the new-run overlay initially selects Hardcore, while the store presents it as an optional higher-risk experience. I would lead the persistent adventure with the non-permadeath mode and make Hardcore a deliberate commitment. That is a proposed product change, not a bug fix or an assertion that Hardcore cannot be the lead experience.

   Sources: [input](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/player/PlayerInput.js), [initial mode selection](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/ui/scenes/NewRunSetupOverlay.js:24).

9. **Make returning home prepare the next interesting trip.**

   Campfire already has visible growth, replenishable charges, and two blessings: mining speed and XP. Worldroot, the map, Journey, and Titan display systems already provide places to show consequence. Build on those surfaces.

   Measure preparation and travel time against the first Campfire tier's 60-second blessing. If much of its useful window disappears before mining resumes, prototype arming it on departure or the first underground action, with a clear ready state. Show the value of a sale and one attainable next purchase without opening a succession of automatic dialogs.

   Give a major discovery one consequence the player can use on the next expedition: a route insight, a temporary preparation choice, or a visible landmark that helps navigation. Keep the existing currencies and persistent authorities.

   Sources: [Campfire](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/campfireConfig.js), [Journey connections](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/progressionGraph.js), [Titan encounter](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/titanDiscoveryExperience.js).

**Three larger experiments worth prototyping.** These are speculative and should remain isolated until they demonstrate better decisions and enjoyable input.

| Experiment | What the player does | Why it fits UNDERSTAR | Smallest useful prototype | Main failure risk |
|---|---|---|---|---|
| Connect the Stars you keep | Excavate a route between two intact refuges; the connection makes that route useful, while sacrificing an endpoint removes its benefit | Joins mining, preservation, Flight, GP, map, and scars | Two Stars and one bounded route; no network editor or new currency | A mandatory connection grind, or preservation becoming universally optimal |
| Break rock along a fault | Read an authored fracture and choose a strike that releases a short connected seam | Turns geology into skill and makes a clip understandable without UI | One marked material family and a capped chain resolved through DigSystem | Unbounded chain destruction, or a compulsory rhythm minigame |
| Excavate a sleeping Titan | Expose recognizable parts that change a chamber and reveal a route or preparation benefit | Turns existing huge artwork, clues, and coverage into a playable discovery | One Titan with three exposure beats and one existing-system reward | Expanding into a large boss/combat project or hiding interaction rules |

The most ambitious direction is a mine that gradually reveals it is part of something alive. A distant movement, a breathing chamber, or a newly exposed eye could make the world memorable. One convincing encounter is enough to test that fantasy before committing to a whole new campaign.

The current Titan threshold is 50% of authored coverage with automatic clearing of the remainder. The proposed encounter would extend that existing progression with intermediate beats; it should not be described as already implemented.

**A focused next slice.** Keep the current Phaser architecture and make one excellent opening expedition:

1. Find and follow the player easily, dig satisfying starter material, and learn Flight through the existing route.
2. Activate the protected 15 m return, sell, and buy an upgrade with an obvious practical benefit.
3. Reach an authored power trial and immediately use it on suitable terrain.
4. Encounter one understandable Star decision and one biome-specific opportunity.
5. Return to a visibly changed home with a clear reason to go out again.

Suggested acceptance targets, to adjust after baseline testing: four of five new testers complete the first sell/upgrade loop without coaching; most notice the first upgrade's effect; the power trial occurs within the first ten minutes for a normal explorer; players can identify the player and target terrain quickly at 1280×720/800; and testers can explain both sides of the Star choice. Record actual action-to-contact timing, clear time by build/material, time in menus/travel, special-block payoff, and reasons for stopping. These are evaluation criteria, not present results.

For release work, use the current asset scheduler, culling, pooling, and quality presets. High already uses a 1920×1080 backing canvas for a logical 1280×720 layout. The runtime has 704/640 MiB estimated texture watermarks. Those are configuration budgets, not measured total GPU memory. Profile a real packaged build with full ability effects, transitions, repeated menus, and a long save session. Headless development FPS does not validate minimum hardware or Deck performance. Preserve approved source assets and tune residency/effect density before assuming an engine change is needed.

The active production profile still gates Level Two, Arc Core, and Heavenblocks. Keep the current adventure and its ending coherent while those routes receive their own economy, save, input, and runtime acceptance. Their existence in source is useful future capacity, not evidence of a completed player journey. [Capability gates](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/gameplayCapabilities.js), [demo ending](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/understarEnding.js), [render quality](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/gameConfig.js), [asset budgets](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/runtimeAssetLoading.js:223).
