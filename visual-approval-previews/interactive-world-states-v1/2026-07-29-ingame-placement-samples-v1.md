# Interactive World State In-Game Placement Samples V1

These three images are review-only built-in ImageGen composites. They use the
same current Blue Caverns gameplay frame so scale and placement are easy to
compare. They are not runtime screenshots and nothing was wired into the game.

## Sample 1: proximity-ready cache

- Base: current Blue Caverns gameplay frame.
- Insert: `blue-caverns-cache`, state `proximity-ready`.
- Intended placement: grounded on a clear side ledge above the HUD and outside
  the player's central travel lane.
- Intended runtime behavior: static while untouched, brief opening sequence on
  interaction, then persistent resolved or spent state.

## Sample 2: resolved-open transit aperture

- Base: current Blue Caverns gameplay frame.
- Insert: `blue-caverns-transit-aperture`, state `resolved-success`.
- Intended placement: solid multi-tile architecture surrounding the existing
  portal effect.
- Intended runtime behavior: the atlas owns physical frame states; the existing
  portal system continues to own energy, glow, travel rules, and activation.

## Sample 3: dormant depth gate

- Base: current Blue Caverns gameplay frame.
- Insert: `blue-caverns-depth-gate`, state `dormant`.
- Intended placement: embedded across a side corridor with rock overlap at its
  outer frame, leaving the main player route clear.
- Intended runtime behavior: closed while authoritative progression is locked,
  three opening states during unlock, open/resolved afterward, with optional
  jammed or broken aftermath states.

## Prompt contract

All three edits required:

- exact 16:9 gameplay framing;
- one inserted object only;
- biome-matched scale, lighting, and contact occlusion;
- no new particles, labels, arrows, UI, characters, or scene redesign;
- existing gameplay authority unchanged.
