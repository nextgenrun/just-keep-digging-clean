# Random Event Review Plan V1

Status: the four completed event mockups were visually approved on 2026-07-30.
Sleeping Jackpot's approved direction includes the V2 risk wording below.
Nothing in this document is authorized for runtime wiring.

## Corrected event direction

The earlier list contained too many disguised errands, hazards, navigation
jobs, and system-heavy world events. The stronger direction is:

1. Put a visible toy or transformation in the player's current screen.
2. Give the player one immediately understandable interaction or choice.
3. Make the reward state physically visible before it is claimed.
4. Avoid new enemy AI, escorting, portals, survival simulations, daily jobs,
   and generic backtracking.
5. Prefer mining, reward, light, crystal, and merchant interactions that are
   satisfying even before balance numbers are added.

## Sleeping Jackpot

### Current-project constraint

The checkout currently has no `JACKPOT` tile or runtime entity. The safest
future implementation would decorate one rare eligible unopened `CHEST` with a
Sleeping Jackpot state. That reuses the existing one-time interaction and
opened-chest persistence without adding a second treasure authority.

### Player communication sequence

1. **World discovery**
   - The eligible chest breathes with slow blue-gold light.
   - Interaction prompt: `SLEEPING JACKPOT  •  CHOOSE ITS FATE`.
   - Nothing is committed until the player confirms inside the modal.

2. **Blocking choice modal**
   - Title: `SLEEPING JACKPOT`.
   - Subtitle: `GAMBLE NOW — OR RISK EVERYTHING AT MATURITY`.
   - The currently selected card receives the cyan focus border.
   - Left card: `GAMBLE NOW`.
     - `YOU WILL GAMBLE {wagerGp}`.
     - `YOU CAN GAIN +{possibleGainGp}`.
     - `OR LOSE {wagerGp}`.
   - Right card: `LET IT MATURE`.
     - `MATURITY: {targetDepth}M`.
     - `STAKE: ALL YOUR RESOURCES`.
     - `WIN: ×9 ALL RESOURCES`.
     - `LOSE: ALL RESOURCES`.
   - The actual win chance is printed before confirmation. The `50%` shown in
     V2 is a representative mockup value, not an approved balance constant.
   - The maturity selection adds the explicit warning
     `THIS CAN EMPTY YOUR ENTIRE RESOURCE INVENTORY`.
   - A resource breakdown must list every included stack and quantity before
     the player can confirm the maturity option.
   - Selecting a card changes the required phrase:
     - `TYPE GAMBLE THEN PRESS ENTER`
     - `TYPE RISKALL THEN PRESS ENTER`
   - `ESC` closes the modal and leaves the chest completely unchanged.

3. **After choosing GAMBLE**
   - Deduct the exact displayed GP wager and commit the outcome seed in the
     same save transaction.
   - Resolve the displayed possible gain or displayed loss exactly once.
   - Result card states the wager, outcome, and new GP total.

4. **After choosing RISKALL**
   - Snapshot every included resource stack at confirmation.
   - Move those exact quantities into sealed jackpot escrow in the same save
     transaction; they are no longer spendable or sellable while sleeping.
   - The chest receives a sealed blue-gold world state.
   - Its prompt becomes `SLEEPING  •  MATURES AT {depth}M`.
   - The single Next Promise HUD shows
     `SLEEPING JACKPOT  •  {remaining}M TO MATURE`.
   - The Journey records the chest depth, maturity target, escrow contents,
     displayed odds, and committed outcome seed.

5. **Maturity**
   - Crossing the target depth changes the seal to bright gold.
   - One exceptional card announces `THE JACKPOT WAKES`.
   - Next Promise becomes `JACKPOT AWAKE  •  RETURN TO {depth}M`.
   - World prompt becomes `AWAKENED JACKPOT  •  REVEAL FATE`.

6. **Maturity resolution**
   - The committed outcome is revealed; returning or reloading cannot reroll it.
   - A win returns nine times every escrowed resource quantity.
   - A loss destroys every escrowed resource quantity.
   - Escrow resolution, sealed-record removal, and the opened-chest key commit
     atomically.
   - The result card lists the exact per-resource change rather than only a
     combined value.

### Typed-choice recommendation

Do not reuse the red Hardcore visual treatment. Reuse its keyboard behavior,
blocking input rules, Escape behavior, and typed-character feedback through a
small shared controller, then present a dedicated approved blue-gold
`SleepingJackpotModalOverlay`.

The current `HardcoreModalOverlay.showConfirmation()` accepts one expected word,
so a future implementation needs a dedicated two-card overlay whose active card
sets the expected phrase. `RISKALL` is intentionally more explicit than
`SLEEP`: the player must acknowledge that the maturity branch can erase every
staked resource.

### Provisional gameplay rules

- Only one sleeping jackpot may exist at a time.
- Use the next canonical depth milestone above the current personal best as the
  maturity target.
- Every amount, odds value, multiplier, minimum balance, maximum balance, and
  maturity rule belongs in `/values/`; no sample figure from the mockup is a
  runtime constant.
- `GAMBLE` must show the exact GP wager, possible net gain, possible loss, and
  odds using the same authoritative calculation that resolves payment.
- For `RISKALL`, "resources" means ordinary resource-inventory material stacks.
  GP, stars, permanent upgrades, unlocked abilities, unique items, and
  progression records are not silently included.
- `RISKALL` is unavailable when there is no eligible resource stack to escrow.
- The ×9 reward applies per escrowed resource type, preserving its identity; it
  is not converted to one approximate GP total.
- Validate inventory capacity and numeric bounds before confirmation. A result
  must never overflow, truncate, or silently discard a winning stack.
- Reloading cannot reroll the choice, wager, escrow, odds, outcome seed, or
  target depth.
- If old save data points to an already-opened or invalid chest, repair the
  sleeping record and restore unresolved escrow before creating another reward.

## Crystal Choir

### Communication

- Entry sting plays the complete sequence once while all five crystals are
  visible.
- Compact top strip mirrors the five crystal silhouettes:
  completed, current/pulsing, and waiting.
- The active crystal emits circular rock-space resonance rings.
- Prompt: `STRIKE THE SINGING CRYSTAL`.
- A wrong strike dims the set and replays the sequence; it does not damage the
  player or introduce another cave hazard.

### Future implementation shape

- Eligible only when five safe, visible crystal anchors can be resolved in the
  same cave chamber.
- Sequence length begins at three and grows to five on deeper variants.
- Input uses the normal mining/contact path.
- Completion awards one clearly previewed cache and permanently records that
  choir as completed.

## Blackout Bloom

### Communication

- Event starts with a short audio vacuum and a one-second light contraction.
- Compact top ribbon shows the remaining time and `1 / 3` bloom progress.
- Exactly three large blooms carry the interaction. Faint ore silhouettes are
  atmosphere and guidance, not additional objectives.
- The player's normal torch remains authoritative and the rock silhouette stays
  readable.
- Final five seconds restore ambient light gradually rather than snapping.

### Future implementation shape

- A temporary lighting profile changes presentation only.
- Three reachable bloom anchors are chosen inside the active render window.
- Each harvest uses normal adjacency and interact/mining rules.
- No event can begin during a Wurm warning, earthquake, cave failure recovery,
  blocking modal, or another major event.

## Money Monster Rush Order

### Communication stack

The Rush cannot rely only on the notification carousel because notifications
are hidden while a shop is open.

1. Start card:
   `MONEY MONSTER RUSH ORDER  •  GOLD PAYS 2× FOR 90S`.
2. Next Promise HUD:
   `RUSH ORDER  •  GOLD ×2  •  01:18`.
3. Merchant prompt:
   `RUSH BUYER  •  GOLD ×2  •  01:18`.
4. Sell-tab header:
   `RUSH ORDER ACTIVE  •  GOLD ×2  •  01:18 LEFT`.
5. Target resource moves to the first sell row with an approved `RUSH ×2`
   status and the exact adjusted price.
6. End summary:
   `RUSH CLOSED  •  +{bonus}M BONUS EARNED`.

### Future implementation rules

- Select only a Level One Money Monster material that is sellable and was
  recently mined or is currently carried.
- Apply the event multiplier after permanent market upgrades.
- Apply the existing Lucky Sale roll after the event-adjusted quote.
- UI price, Sell 1, Sell Stack, Sell All, cargo value, and paid result must share
  one quote authority.
- Pause the timer during blocking modals and while the correct shop is open so
  the displayed quote cannot expire mid-transaction.
- Persist target resource, remaining active play time, and cooldown.
- Version one excludes the Molten Money Monster and Level Two resources.
- No typed confirmation is needed because the event never lowers normal prices
  or consumes resources without the existing sell action.

## Fifty new candidate directions

These are concept candidates for review, not an implementation queue.

### Strongest ten

1. **Mirror Seam** — A crystal mirror slices through the current wall; every
   mined tile also breaks its outlined reflection, producing symmetrical
   excavation.
2. **Ore Magnet Cluster** — Visible ores tug toward one another; removing the
   intervening rock determines which ores collide and fuse into one swollen
   hybrid prize.
3. **Prism Fork** — Rotate one large prism between clearly pictured ore, GP,
   and light receivers; locking a beam crystallizes that reward path.
4. **Bubble Vault** — Three translucent mineral bubbles visibly contain their
   rewards. Inspect them and pop one with a heavy, elastic burst.
5. **Living Mosaic** — A compact wall becomes a bold illuminated image; mining
   its lit cells completes the mural and folds the panel open.
6. **Buried X-Ray** — A wall turns transparent briefly, exposing several
   embedded objects. Chalk-pin one before the wall becomes opaque.
7. **Gilded Loop** — Mine a closed loop of any shape; closing it flashes every
   enclosed tile gold and makes the chosen area brittle.
8. **The Big Nugget** — Ore flecks tear free from nearby rock and squeeze into
   one absurdly oversized nugget built for several crunchy hits.
9. **Glass Quarry** — One framed wall patch becomes mineral glass; cracks race
   across multiple cells before whole sections shatter together.
10. **Money Monster: Price Paint** — Assign three colored demand tokens to
    three carried materials; the Monster, sign, and live price rows recolor to
    advertise the player's chosen market.

### Another forty

11. **Faultline Sketch** — A luminous line draws a short mining route; following
    it opens the seam like a zipper.
12. **Ghost Pickaxe** — Several swings leave spectral pickaxes that repeat the
    strike one tile farther into the wall.
13. **Crystal Lock** — Rotate four mineral rings until their gaps align and
    expose the bright center.
14. **Rock Scratch Card** — Scrape away a metallic stone veneer to reveal large
    reward symbols underneath.
15. **Vein Draft** — Preview three different vein layouts over one wall and
    choose which resource pattern becomes real.
16. **Compression Fold** — Geological bands squeeze inward; choose which band
    reaches the center and compresses into rich ore.
17. **Light Lens** — Move the player until torchlight focuses through a crystal
    lens and burns open a pictured cache.
18. **Echo Chamber** — Hit several marked wall spots and judge their different
    resonance rings before opening one hollow pocket.
19. **Alchemy Bloom** — Feed two materials into a crystal flower; its live petal
    colors preview the resulting ore or GP bundle.
20. **Ore Pachinko** — Mine one switch block to steer a glowing mineral bead
    toward one of several visibly labeled reward cups.
21. **Core Sample** — A cylindrical wall slice slides outward, exposing three
    geological bands; choose the band to break.
22. **Kaleidoscope Core** — Rotate three faceted layers until their center image
    aligns and the core releases its colored shards.
23. **Thermal Wall** — A wall patch becomes a heatmap; test taps reshape the
    contours and reveal the hottest reward pocket.
24. **Stone Pairs** — Six capped mineral cells hide visible material symbols;
    matching the pairs opens the complete panel.
25. **Ore Terrarium** — A transparent cavity grows a miniature crystal garden;
    trimming two colors lets the chosen third color fill it.
26. **Crystal Snowglobe** — Strike the sides of a round sealed cavity to shake
    loose gems into visible reward sockets.
27. **Crystal Fountain** — A floor bud opens into harmless colored mineral arcs
    that settle as collectible shards.
28. **Layered Gift** — Each shell reveals the current prize and an explicit
    choice to claim it or peel one layer deeper.
29. **Gem Elevator** — Remove supports inside a wall chamber to lower the chosen
    gem onto a collector platform.
30. **Vein Braiding** — Redirect two junctions so three luminous ore strands
    braid into a chosen final material.
31. **Stained-Glass Seam** — Break one colored pane; the remaining colors
    combine visibly and determine the reward.
32. **Shadow Vault** — Large reward silhouettes move behind frosted stone;
    freeze one silhouette and make that object real.
33. **Layer Peel** — Mine a visible corner tab and watch one translucent
    geological skin curl away from the whole wall.
34. **Mineral Cast** — Choose one embossed rock mold; liquid-looking light fills
    it and hardens into the pictured reward.
35. **Mineral Sand Table** — Mine columns to redirect colored grains until they
    fill one recognizable reward shape.
36. **Tile Shuffle** — A rare ore performs a clear shuffle beneath several
    capped rocks; choose and smash one cap.
37. **Triple-Shell Jackpot** — Every shell previews a different reward clue;
    choose when to claim and when to crack inward.
38. **Resource Fireworks** — Break one charged node and watch colored arcs turn
    their landing tiles into matching resources.
39. **Crystal Mitosis** — A crystal prize divides into two smaller branches
    after each hit; choose which branch continues splitting.
40. **Honeycomb Survey** — A compact wall shows adjacent bonus counts; spend a
    small number of reveals to select the richest cell.
41. **Branching Domino** — Choose one fracture junction and send a rapid chain
    of shattering tiles down that colored branch.
42. **Hologram Dig** — A ghost arrangement appears in open space; mining the
    matching wall positions gradually makes its reward tangible.
43. **Money Monster: Deal Board** — Choose between three simultaneous offers:
    safe, balanced, and greedy, each with exact inputs, time, and payout.
44. **Money Monster: Bundle Builder** — Arrange three inventory stacks on a
    tray while payout and the Monster's expression update live.
45. **Money Monster: Exact Weight** — Place resources on a large scale and stop
    when satisfied with the visible precision multiplier.
46. **Money Monster: Exchange Window** — Select one of three glass-tube material
    conversions and watch the input pump into the output.
47. **Money Monster: Demand Domino** — Selling one material visibly raises the
    next pictured price, turning sale order into the event.
48. **Sealed Appraisal** — Accept a guaranteed shown price or spend one sample
    to reveal another clue about the hidden higher price.
49. **Money Monster: Taste Test** — Feed one small sample; color, expression,
    and saliva reveal which material family is most valuable before the sale.
50. **Golden Receipt** — Reorder three planned sales; matching connected
    categories, colors, or rarities increases the combined payout.

## Recommended next visual review

If this corrected direction is approved, the most informative five-image batch
would be:

1. Mirror Seam
2. Ore Magnet Cluster
3. Prism Fork
4. Bubble Vault
5. Living Mosaic

They are visually different enough that rejection or approval would establish a
clearer rule for the next ideation pass.
