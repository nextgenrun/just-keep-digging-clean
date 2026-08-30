# Game vision

Status: canonical final-game direction

## One-sentence promise

Dig Game is a side-view expedition game where every descent creates a readable
risk-versus-reward decision, every return to town converts a haul into visible
power, and Flight plus permanent portal routes turn a growing mine into a place
the player learns, masters, and revisits.

## Player fantasy

The player begins as a vulnerable surface miner and becomes a mobile deep-world
engineer: reading material layers, choosing when to push or return, unlocking
Flight, building safe routes, mastering abilities, surviving hazards, and
eventually linking earth, sky islands, celestial power, and Heavenblocks.

Power must change what the player can do and where they can safely go. A larger
number without a new decision, route, rhythm, or visual consequence is not
enough.

## Product pillars

### 1. The mine remembers

Dug cells, rubble, discoveries, portals, upgrades, milestones, mode state, and
major progression persist. A route becomes personal because the player made it.
Return travel should become faster and more deliberate as portal coverage grows.

### 2. Descent is a decision

Deeper strata offer rarer resources and stronger progression, but also longer
return paths, darkness, cave hazards, earthquakes, and—in Hardcore—the
Graveborer Wurm. The player should regularly decide between one more dig and a
safe return.

### 3. Flight changes the map

Flight is the first transformational unlock, not a late convenience. It turns a
vertical trap into a route-planning problem, consumes/refills GP after the free
opening bank, and connects mines, town, portals, sky islands, and later content.

### 4. Town converts effort into possibility

Town is the readable home base: sell cargo, compare upgrades, buy abilities,
review milestones, inspect discoveries, and choose the next expedition. It must
feel useful without becoming a sequence of forced dialogs.

### 5. Authored spectacle rests on deterministic rules

World art, character animation, weather, lighting, effects, and cinematic beats
may be rich, but collision, mining, rewards, portals, saves, and hazards remain
deterministic and testable. Presentation cannot mutate gameplay authority.

### 6. One current action, one next promise

The interface teaches the immediate action and previews the next meaningful
reward. It does not stack tutorial cards, routine popups, and competing calls to
action. Player-requested detail belongs in inventory, map, settings, journal,
merchant, or pause surfaces.

## Priority of polish

1. **First five minutes:** run choice, movement, first dig, Flight, first ascent,
   starter portal, sell, first upgrade.
2. **First two hours:** repeated expedition loop, cave/hazard literacy, upgrade
   decisions, portal network, milestones, abilities, and clear mode stakes.
3. **Long game:** Level One mastery, celestial collections, Level Two, Arc Core,
   Heavenblocks, Omega/Zenith progression, and replay mastery.

This order exists to make the opening genuinely excellent, not to obstruct
refunds or use dark patterns. The player should keep playing because the game
earns trust quickly.

## Primary game mode and alternatives

- **Hardcore is the intended primary experience.** Risk events are active once
  their progression gates are met. The player has two lives; the first death is
  a free revive and does not consume either life.
- **Casual is the complete low-pressure experience.** It keeps progression,
  hazards that are not explicitly Hardcore-only, exploration, and rewards, but
  never consumes lives and never activates the Hardcore Wurm.
- **One-Life Hardcore is hidden.** It has one life, no free revive, and the same
  readable risk rules as Hardcore. Hidden means discoverable, not undocumented
  or technically inaccessible.

All modes use the same economy and authored world. Mode may change failure and
hazard pressure; it must not secretly reduce basic content value.

## Core loop

1. Choose an objective and safe-return threshold in town.
2. Move, aim, and dig through readable material.
3. Collect resources, XP, GP opportunities, relics, stars, and discoveries.
4. Decide whether to push deeper, enter a cave, activate a portal, or return.
5. Use Flight and the portal network to reach safety.
6. Sell cargo and spend money/resources on a meaningful upgrade or ability.
7. Resume through the deepest useful route and encounter a new decision.

The loop fails when optimal play becomes holding Dig without route, resource,
hazard, or return decisions.

## Final-game content shape

- A polished Level One from the surface through 2,000 m.
- A distinct separated Level Two continuation through 5,000 m with its own
  resources, town/economy layer, and return network.
- Integrated caves with authored mouths, real seams, darkness rhythms, and
  bounded hazards.
- Surface and sky destinations that are functional places, not decorative
  menu rooms.
- Star collection feeding a three-branch Celestial talent tree, ten Sign
  masteries, and three GP-powered abilities: the Wayward swarm, Hollow Sun
  black-hole cluster, and Stellar Lance piercing mining volley.
- Ancient Relics and Heavenblocks progression leading through three sky regions,
  component attunement, Arc/Omega vaults, and the Zenith Keystone.
- Casual, Hardcore, and hidden One-Life Hardcore sharing one honest world and
  one durable save model per slot.

## Explicit exclusions

- No mandatory tutorial.
- No jump button added as a substitute for Flight or climbing design.
- No automatic save deletion on a death or exhausted run.
- No routine lore or status modal that interrupts mining.
- No gameplay mutation from visual-only background, lighting, shader, or FX
  systems.
- No placeholder/emoji/primitives promoted as final production UI art.
- No Level Two or Arc Core promotion merely because modules compile; their
  complete route and browser acceptance must pass first.

## Product-level definition of done

The final result is ready only when a fresh player can complete the primary
route without developer knowledge; mode and skip choices persist; the 15 m
portal survives reload and world mutation; every claimed content tier is
reachable in the active release profile; failure consequences are readable and
recoverable; saves round-trip; and the visible result passes real browser
playthrough review at the supported viewport and input methods.
