# Earthquake Event Cohesion V2

## Outcome

Earthquakes now introduce themselves sooner, communicate aftershocks as one
continuous event, and finish only after every warned collapse has resolved.
Repeat events retain their restrained six-to-ten-minute base cadence.

## Player-facing flow

- The first eligible event uses a two-to-three-minute base discovery window.
  Existing world and depth multipliers still apply, and later events return to
  the existing repeat interval.
- A pending aftershock stays attached to the current aftermath. Its compact card
  switches to `AFTERSHOCK / LEAVE MARKED GROUND` when the new FallZones are
  queued, while the marked ground and urgent offscreen signal remain authoritative.
- An already-falling boulder owns the edge indicator before warning zones;
  warning zones then sort by time to collapse.
- A real boulder contact now requests the existing authored earthquake reaction
  after Gem Power drain and knockback. Warning proximity primes its deferred
  animation asset before impact.
- The warning voice receives first/repeat, intensity, and deep-context tags but
  remains under the shared non-interrupting voice director.

## Authority and persistence

`values/earthquakes.js` remains the timing and hazard authority.
`values/cameraShake.js` remains the single camera-shake authority; duplicate
unused intensity shake values were removed. No save schema or world-generation
authority changed. Seismic Suppression still cancels the event immediately.

## Validation

- `testing/2026-08-30-earthquake-event-cohesion-contract.mjs` covers first-event
  scheduling, timer preservation, aftershock lifecycle, intensity width, player
  reaction, HUD presentation, edge-signal urgency, and shake authority.
- Existing feedback, world-epicenter, lifecycle, dodge-window, suppression, and
  event-voice contracts remain required.
- `testing/animation-sandbox/earthquake-feedback-ui-v1/?phase=aftershock` renders
  the production feedback and hazard classes at the live 1280x720 viewport.

## Rollback

Remove the first-event interval and resume scheduling branch to restore the old
discovery cadence. Remove the aftershock card activation and pending-hazard finish
guard to restore the previous aftermath behavior. The changes are independent of
Seismic Suppression, world mutation, and save persistence.
