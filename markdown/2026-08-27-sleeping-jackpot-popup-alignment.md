# Sleeping Jackpot popup alignment

## Scope

Presentation-only correction for `SleepingJackpotModalOverlay`. Jackpot odds,
wagers, maturity rewards, save transactions, timing, and input phrases are
unchanged.

## Audit findings

The 1280x720 production-layout capture exposed four alignment defects:

- both choice columns and their hit areas were displaced 54 px outward from
  the centers of the painted card wells;
- the complete maturity inventory ended at y=527 while the selected row began
  at y=498.5, causing visible overlap;
- the typed confirmation ended at y=638.5, below the authored lower input bay;
- both footer labels referenced the nonexistent `UI_COLORS.hint`, making the
  keyboard guidance effectively invisible.

A full fourteen-resource maturity result also exceeded the panel height and
collided with the close control.

## Correction

- The two cards now share the artwork's measured centers and 390x372 hit areas.
- Maturity copy uses the full safe well width with tighter line spacing.
- The selected row and icon remain inside their own card, with a 15.5 px gap
  below the longest normal maturity body.
- Instruction and typed confirmation copy now remain inside the lower bay.
- Footer copy uses the existing dim palette color.
- Long, line-based result lists fold into two exact-value monospace columns;
  short narrative results retain their original layout.

## Verification

- `testing/2026-07-30-random-world-events-contract.mjs`
- `testing/2026-08-27-sleeping-jackpot-alignment-harness.html`
- native 1280x720 browser check: zero title-to-hit-center drift, 54 px between
  hit areas, 15.5 px body-to-focus clearance, typed copy bottom y=614.5
- compact 960x540 browser check for both choice and fourteen-resource result
- no browser warnings or errors in either state

The repository-wide architecture ratchet still reports unrelated oversized
modules already present in the dirty checkout; no new architecture category was
introduced by this popup change.

## Rollback

Revert the popup/config/contract/harness changes associated with this document.
No save migration or asset rollback is required.
