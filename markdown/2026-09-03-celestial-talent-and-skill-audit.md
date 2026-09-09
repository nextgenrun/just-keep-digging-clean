# Celestial Talent and Skill Audit

## Outcome

The 33-node tree keeps its Level 3 entry, one Talent Point per level, and
Star-funded ranks 2-3. The audit makes the graph easier to read, gives every
paid rank a live effect, and reduces the late-rank ability spikes.

Future nodes no longer repeat `LOCKED` across the tree. The remaining labels
have one clear meaning:

- `1 TP` — can be bought now.
- `NEXT LEVEL` — path is open, but another Talent Point is needed.
- `FINISH PATH` — another starting power opens after the current capstone.
- `1/3` to `3/3` — owned-node rank.

Locked, ready, owned, and selected connectors now use separate alpha and width
levels. Selecting a node lights its immediate routes, while unrelated future
routes stay quiet. Compact layouts retain readable node status and detail text.

## Ability envelopes

The counts below are deterministic safety envelopes, not direct damage
equivalence. Hollow Sun is still the area-control option; Stellar Lance trades
raw target count for precise repeated digs.

| Power | All nodes rank 1 | All nodes rank 3 | Maximum-rank identity |
| --- | ---: | ---: | --- |
| Wayward Star | 265 targets | 355 targets | 5 stars, 16 bounces, 7-tile final blast, 10 seconds |
| Hollow Sun | 440 targets | 600 targets | 4 holes, 6 pulses, 10-tile radius cap, 12.5 seconds |
| Stellar Lance | 12.5 sec, 8 tiles, 3 lanes, 1.5x first hit | 15 sec, 10 tiles, 3 lanes, 1.94x first hit | Only exact overkill continues; far-state first hits reach 2.33x |

All 33 node descriptions and all rank descriptions now use short player-facing
language. Every rank 2 and rank 3 purchase changes the resolved live power even
when all other nodes are already at maximum rank.

Stellar Lance no longer repeats full damage across every block. Each lane owns
one damage budget: the first block takes the calculated hit, a broken block
passes only its overkill, and the first surviving block stops the wave. Shots
cycle blue, purple, and red, fade along their route, and show their own impact
sprite only when they reach each damaged tile.

## Hollow Sun control

Each pulse travels through the cluster from top to bottom. The next pulse
returns from bottom to top, with 125 ms between holes. This makes the attack
read as one wave instead of four simultaneous flashes.

Every successful player dig gently pushes the active cluster in the dig
direction. One action queues 0.24 tile of movement, the cluster follows at 0.75
tile per second, and at most 1.25 tiles can be queued. World bounds reject an
unsafe push. Area mining signals one push for the action rather than one push
per affected block.

## Existing skills

Quick Slash remains the bilateral sustained GP spender: 3.6x maximum damage,
150 ms minimum cooldown, and 9 GP at full supporting progression. Thunder
Strike remains the expensive precision burst: 200 GP at full supporting
progression, 8-tile range, and its existing three-slam timing. Neither received
another damage increase during this audit.

## Verification

The production tree was reviewed at compact Level 3, mid-progression Level 5,
and fully owned Level 35 states. The ability harness confirmed alternating
Hollow Sun event order, accepted directional drift, and the maximum-rank
Stellar Lance's 15-second duration, slow fade, blue-purple-red cycle, and
per-tile impact moments with no missing textures or runtime errors.

Focused contracts cover tree state hierarchy, all 33 descriptions, all 66 paid
ranks, ability envelopes, alternating Hollow pulses, one-push-per-dig routing,
Quick Slash, Thunder Strike, shared GP efficiency, save compatibility, and shop
progression.
