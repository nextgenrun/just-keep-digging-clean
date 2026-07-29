# ImageGen prompt manifest

## Output

- File: `2026-07-28-esc-starlight-talent-tree-mockup-v1.png`
- Dimensions: `1672x941`
- SHA-256:
  `F84D026F9C7E90607C181CFDAAC8FC5D1363958672BD1502A79AE1F1DA471841`
- Review state: `reviewOnly: true`
- Runtime state: `productionChanged: false`

## Edit references

1. `2026-07-28-current-esc-shell-reference.png`
   - Exact pause-shell geometry, palette, type hierarchy, and selected-tab
     treatment from the current Phaser review harness.
2. `2026-07-28-project-art-reference-board.png`
   - Exact visual identities for all ten constellation signs, the Star Heart,
     and the three Celestial Engine cores.

## Prompt

Create one polished 16:9 in-game UI mockup for the Phaser mining game
UNDERSTAR. Edit target / image 1: preserve the exact current ESC pause-menu
framing, proportions, dark navy-black surfaces, thin cyan inner edge,
brass-gold outer line, condensed cream headings, monospace supporting text,
close button, and restrained premium industrial-celestial style. Reference art
/ image 2: use the exact visual identities of the ten constellation signs and
the Star Heart plus three Celestial Engine cores; do not replace them with
generic fantasy icons.

The result must look like a real 1280x720 gameplay screenshot with the existing
pause panel centered on a nearly black dimmed game backdrop. Keep the `PAUSED`
header and its current subtitle. Show six outer tabs in one row: `GENERAL`,
`SAVES`, `STATS`, `TALENTS`, `TITANS`, `SETTINGS`. Select `TALENTS` with the
same brass outline and subtle gold glow as the current selected tab.

Replace settings content with a readable `STARLIGHT TALENT TREE`. Show
`7 / 10 MASTERED` and split the ten signs into two linked branches:

- `QUICKSLASH`: The Shovel, The Anvil, The Sword, The Shield, The Crescent.
- `THUNDERSTRIKE`: The Mountain, The Cave, The Hammer, The Fortress, The Crown.

Demonstrate mastered, partial (`3 / 5`), and locked states. Keep locked signs
visible. Converge both branches on `STAR HEART 7 / 10` with the requirement to
master all constellations before attuning one Engine.

Use a right inspection rail for the selected Anvil node with exact effect copy:
`ANVIL EFFICIENCY` and `Quickslash costs 2 less GP`.

Below it, show three exclusive high-impact capstones under
`ONE PERMANENT ATTUNEMENT`:

- `WAYWARD STAR` — `10 BOUNCES`
- `HOLLOW SUN` — `3 PULSES`
- `COMET ENGINE` — `10 TILES`

These are not shop purchases. Do not add prices, coins, buy buttons, generic
skill points, a fourth Engine, or Fortress Smash as an Engine option.

Use crisp authored game-UI quality, restrained bloom, fine engraved metal and
glass details, compact readable text, generous spacing, and no watermark,
cursor, duplicate tab, or concept-art caption.

## Approval boundary

This image settles visual direction and information hierarchy only. Approval is
required before changing `PlaySceneUI`, preload/animation paths, save data, or
Star Pillar interaction behavior.
