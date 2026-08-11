# Player journey

Status: canonical journey; each beat carries its runtime status below

## Journey hierarchy

The design priority is:

**first five minutes > first two hours > long-term mastery**

Later systems may not make the opening noisier or delay the first complete loop.
The opening teaches through a playable authored route, not through a manual.

## New expedition setup

For an empty save slot, the player chooses two independent rules before the
world loads:

1. **Casual or Hardcore.** Hardcore is highlighted as the primary experience,
   but Casual is a first-class complete game.
2. **Guided Opening or Skip Tutorial.** Skip requires typing `YES` before Start
   is accepted.

One-Life Hardcore is hidden. The current discovery path is the `ONELIFE` input
sequence while Hardcore and Guided Opening are selected; QA can also use
`?runMode=one-life-hardcore`. The chosen mode and tutorial state belong to the
save slot and are shown again on its save card.

Status: **SHIPPED structurally; browser interaction review required.**

## First five minutes

### Beat 1 — Move and read the town

The player appears in town beside the authored starter shaft. Horizontal
movement uses A/D or Left/Right. W/S or Up/Down aims. Town shows useful places,
but does not force merchant dialogs before the player has acted.

Guided runs are contained by a three-cell Bedrock exit barrier at the far side
of town. The barrier is a temporary gameplay gate, not a decorative prop. It
self-heals if a world mutation overwrites it.

Status: **SHIPPED.** A separate ghost demonstrator remains **TARGET** and may be
added only if playtests show that bitmap arrows, live prompts, and the authored
shaft do not teach the route. It must reuse approved player art and cannot become
a second autonomous player system.

### Beat 2 — First dig

The player aims down and holds F or Space. The Golden Five shaft owns a
deterministic 14-cell path from the surface through the Flight Artifact at 13 m,
with dirt, copper, stone, XP, and GP beats. The authored marker, artifact, rings,
cache, objective HUD, sound, mining feedback, and live control labels teach the
action without a blocking dialog.

Status: **SHIPPED.** The old idea of spawning only two/three loose town blocks is
**RETIRED**; the existing Golden Five descent is a clearer, richer version of
that intent.

### Beat 3 — Unlock and prove Flight

Breaking the artifact shell permanently grants Flight. The three-wide ascent
opens, Flight is protected, and the player follows three rings to the surface.
The 30-second free-flight bank starts only after surface return and ticks only
while actively flying. After the bank, Flight consumes GP and GP refills while
grounded according to runtime ability values.

The guided town barrier releases only after `surfaceReturnCelebrated` is true.
Merely loading the save, owning the upgrade, or pressing a key outside the route
is not sufficient proof.

Status: **SHIPPED.** The opening runtime and barrier state persist independently.

### Beat 4 — First ascent cache

The guided player flies to the grounded First Ascent Cache. The current cache
grants +40 GP capacity, 125 M, 40 Dirt, 25 Stone, 12 Copper, and guarantees at
least player Level 2. The centered reward reveal must remain readable and the
reward transaction must be idempotent across interrupted saves.

Status: **SHIPPED.** These exact numbers are runtime values, not immutable
product promises; update `values/openingFlightArtifact.js` and this document
together if balance changes.

### Beat 5 — Guaranteed portal at 15 m

Every run has a `TELEPORT_TILE` at x=12 and exactly 15 m below the surface,
regardless of mode, weather, tutorial choice, or procedural cave generation.
The system repairs the tile after save restoration or world mutation and removes
conflicting dug-source state. Activation uses the normal persistent portal
pairing system and unlocks a return route through the authored sky gates.

Status: **SHIPPED structurally; full activation/return browser playthrough
required.**

### Beat 6 — Sell and upgrade

The lightweight first-run objective continues after the Golden Five: mine one
tile, sell cargo in town, buy one upgrade, then mark the core loop learned. The
next-promise HUD should show only the current step and its next payoff.

Status: **SHIPPED**, but its timing relative to the cache and portal remains a
**PARTIAL** pacing pass. The target route is:

**Move → Dig → Flight → Portal → Sell → Upgrade → Resume**

## Tutorial skip contract

Skipping is an informed route, not a broken tutorial state:

- typing `YES` is mandatory;
- the player begins with permanent Flight unlocked;
- no guided town barrier is installed;
- no Golden Five cache money, resources, tank level, or free-flight bank is
  granted;
- the universal 15 m portal remains guaranteed;
- normal contextual prompts, Controls, Inventory, Map, and Pause remain
  available;
- the skip choice persists and cannot replay the opening for duplicate rewards.

Status: **SHIPPED structurally; reward-negative browser/save verification
required.**

## First two hours

The first two hours should cycle through increasingly informed expeditions:

1. Build confidence with Dirt, Stone, Copper, selling, and first stat upgrades.
2. Learn GP budgeting, safe Flight, portal activation, and quick resume.
3. Encounter integrated cave mouths, resource seams, darkness, and bounded cave
   hazards with visible checkpoints.
4. See a meaningful depth milestone every 100 m through 2,000 m, with the 750 m
   cinematic beat as an additional authored moment.
5. Unlock and practice Quick Slash and Thunder Strike through merchant purchase,
   not a surprise key dump.
6. Discover richer material bands, Ancient Relic caches, Titans, sky stars, and
   constellation progress without showing all collection systems at once.
7. In Hardcore, meet the Graveborer Wurm only after Flight is unlocked and the
   player reaches 120 m; its committed path and GP consequence must be readable.
8. Return to town often enough that merchant, map, journal, milestone, and
   upgrade decisions become part of the rhythm.

Status: the individual systems are mostly **SHIPPED**; their two-hour pacing and
progressive reveal are **PARTIAL** and need an instrumented clean-save playtest.

## Long-term journey

### Level One mastery

Push through the 100-2,000 m milestone ladder, expand portal coverage, collect
rare and Ancient/Cosmic/Void sky stars, find Ancient Relics, complete Titan and
relic records, and build a strong Flight/mining/ability loadout.

### Celestial mastery

Unlock all ten constellations, forge one Star Heart, and permanently attune one
of three bounded Celestial Engines. The choice is permanent in normal play;
debug God Mode may switch without mutating the save.

### Level Two and Arc Core

The final game opens the far-right surface tunnel after the 1,000 m gate and the
required Bobo key, then continues through a separated 5,000 m resource world.
Arc Core and Omega Arc Core convert established player stats and abilities into
2x2 and 8x8 mining footprints.

Status: **GATED** by the current demo profile. It is not part of the reachable
release journey until the alignment register’s Level Two gate passes.

### Heavenblocks and Zenith

Three Ancient Relics awaken the Cloud Reef gate. Completing the Lower Sky Cloud
Reef unlocks the Angel and Devil regions; each region attunes one unique Arc
component. The complete component set enables the Arc Core blueprint. Arc/Omega
vault completion leads to the Zenith Keystone.

Status: runtime modules and art are present, but end-to-end reachability under
the current demo world bounds is **PARTIAL/GATED** and cannot be called shipped.

## Failure journey

- **Casual:** death pauses the run, consumes no lives, and revives at town.
- **Hardcore first death:** consumes the free revive; both lives remain.
- **Hardcore later deaths:** consume one life each. Zero lives marks the
  expedition exhausted and returns the player to the menu.
- **One-Life Hardcore:** the first death exhausts the expedition.
- Exhaustion disables Hardcore hazard admission for that save, but the save and
  backups remain available for inspection, export, or explicit player clearing.

The player must see mode, cause, remaining lives, and next action on the death
surface. A vague “permadeath” warning is not acceptable.

## Journey acceptance playthrough

A clean-save acceptance run must prove, in order:

1. both mode cards and both tutorial cards work with pointer and keyboard;
2. Skip cannot start without `YES`;
3. A/D and arrows both move; F and Space both dig;
4. Guided town exit is blocked before the first ascent and restored after it;
5. Flight unlock and cache reward survive reload without duplication;
6. the 15 m portal exists in all four mode/tutorial combinations;
7. portal activation, sky arrival, and dungeon return work;
8. sell and upgrade complete the first-run objective;
9. Casual death consumes nothing; the Hardcore death sequence is free, 2→1,
   1→0; One-Life is 1→0; and
10. Inventory and ESC Menu work by both keyboard and approved HUD controls.
