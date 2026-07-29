# Earthquake Dodge World Review v1

Test-only Phaser scene for reviewing a fair falling-rock warning, dodge, and
impact sequence inside the current cavern presentation.

## Open

Serve the project root and open:

`/testing/animation-sandbox/earthquake-dodge-world-v1/index.html?shot=warning`

Bookmarkable shots are `warning`, `dodge`, `impact`, `hit`, and `play`.

## Controls

- `A` / `D`: move laterally.
- Hold `Shift` with `W` / `S`: use Flight.
- `R`: reset the interactive sequence.
- `1`–`4`: switch between warning, dodge, impact, and hit review states.

There is no jump action. The mockup uses the live 94 px tile, 31 x 75 player
body, 200 px/s base movement, current Survival idle sheet, current earthquake
HUD skin, and an approved cavern background.

## Proposed layer contract

- Depth 18: predicted landing footprint, below the character.
- Depth 19: ceiling fracture warning.
- Depth 20: player.
- Depth 22: falling boulder.
- Depth 23–25: impact core and foreground fragments.
- Depth 3500: compact HUD.

The scene is a review harness only. It does not import, mutate, or promote
production earthquake timing, collision, damage, or spawn logic.

## Authored source

The four hazard sprites were generated with the built-in ImageGen tool as one
2 x 2 transparent-cutout atlas, chroma-keyed with the official image utility,
then split deterministically by
`ai-tools/2026-07-28-build-earthquake-dodge-review-assets.py`.
