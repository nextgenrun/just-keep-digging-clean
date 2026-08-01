# Interactive World State Application Samples V1

These images explain where the generated interactive-object states belong in
the actual side-on game. They are review-only built-in ImageGen composites, not
runtime screenshots. No assets or new gameplay systems were wired.

The library contains 100 placeable objects. Each object has ten visual states;
the ten states are not ten separate props placed around the world.

## Existing gameplay hooks

| Family | Existing place it can visually upgrade | Example | Intended state use |
|---|---|---|---|
| Cache | Current treasure-chest tile/room | `2026-07-29-sample-01-blue-cache-ingame-v1.png` | Dormant until approached, opening frames on interaction, resolved or spent afterward |
| Transit aperture | Current underground portal site | `2026-07-29-sample-02-blue-transit-aperture-ingame-v1.png` | Physical frame opens while the current portal system keeps travel authority and energy effects |
| Depth gate | Current progression-gate corridor | `2026-07-29-sample-03-blue-depth-gate-ingame-v1.png` | Closed while locked, activation frames during acceptance, open/resolved after unlock |
| Choice apparatus | Current gamble-tile site | `2026-07-30-sample-04-blue-choice-apparatus-ingame-v1.png` | Ready sockets illuminate, activation frames present the gamble, then one resolved or spent result remains |

These four families can be attached to systems that already exist. The art
would expand a one-tile gameplay marker into a grounded multi-tile visual while
the existing tile remains the authoritative interaction anchor.

## Proposed authored rooms

The following six families have art and state coverage, but no confirmed
gameplay authority or placement yet. They should only be used after the room
behavior is approved and manually authored.

### Resource pocket: extraction rig plus refining machine

Example: `2026-07-30-sample-05-blue-resource-room-ingame-v1.png`

- The extraction rig is fixed directly into an exposed ore or crystal wall.
- The refiner sits on a neighboring flat ledge with a clear output tray.
- The player route stays open between them.
- Possible future use: start the rig, wait through its two active-loop frames,
  collect raw output, then process it at the refiner.
- This is a rare room composition, not random scenery and not a background
  overlay.

### Safe pocket: repair station plus checkpoint beacon

Example: `2026-07-30-sample-06-blue-rest-checkpoint-room-ingame-v1.png`

- The repair station belongs on the protected inside wall of a safe chamber.
- The beacon belongs at the chamber entrance or return point.
- Possible future use: repair or refill at the bench and activate the beacon
  once to record a checkpoint.
- The beacon may use a restrained two-frame active pulse after deployment; the
  bench should remain mostly static outside the short interaction sequence.

### Discovery landmark: memory reliquary plus freight lift

Example: `2026-07-30-sample-07-blue-discovery-lift-room-ingame-v1.png`

- The reliquary belongs in a quiet side alcove reached deliberately by the
  player.
- The lift belongs at a real vertical shaft edge, with its cable or track
  continuing outside the current camera.
- Possible future use: open the reliquary for a persistent discovery, then use
  the lift for authored depth-to-depth transport.
- The lift is multi-tile architecture, not a one-tile decoration.

## Remaining proposed single-object room

The checkpoint, repair, extraction, refining, reliquary, and lift families are
shown above in complementary pairs. The remaining proposed family is:

- Choice is already covered by the existing gamble hook.
- No other unshown family remains; all ten families now have an in-game
  placement example across samples 01 through 07.

## What would actually animate

Every object atlas uses the same ten-state order:

1. dormant;
2. proximity-ready;
3. activation-01;
4. activation-02;
5. activation-03;
6. active-loop-a;
7. active-loop-b;
8. resolved-success;
9. depleted-spent;
10. damaged-broken.

When wired, the short activation sequence can play once, the two active-loop
frames can alternate only while the machine is operating, and the final
resolved, spent, or damaged frame can persist in the save. Dormant props should
remain static. The current review library provides these pictures only; it does
not yet provide animation timing, gameplay rules, collision, save state, or
placement data.

## Placement contract

- Place large objects as authored multi-tile room structures.
- Keep their outer rock/crystal contact behind foreground terrain so they feel
  embedded rather than pasted over the cave.
- Keep player walking and Flight lanes clear.
- Match each object only to its named biome material set.
- Do not randomly populate the map with interactive machines.
- Use no object at all in ordinary caves; these rooms should remain rare and
  recognizable.

## Prompt set and mode

- Mode: built-in ImageGen compositing.
- Base: current Blue Caverns gameplay frame.
- Object references: exact Blue Caverns frames extracted from the generated
  `interactive-world-states-v1` atlases.
- Constraints: preserve side-on gameplay framing and HUD, match terrain
  contact and biome lighting, keep routes clear, add no labels or extra props.
