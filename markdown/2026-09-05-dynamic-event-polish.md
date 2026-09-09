# Dynamic event polish - 2026-09-05

## What was going wrong

A successful trigger did not guarantee a readable encounter. The earthquake
phase card expired before its phase ended; a moving player could leave the
initial epicenter/ceiling selection, and minor quakes could choose zero rocks.
A rock also relied on a previously calculated landing row even when mining
changed its floor. Wurm body lag used curve progress rather than equal world
distance, stretching the gaps. Shadowminer replayed the player's history too
quickly, observed briefly, used a visual-only block, and could be dismissed by
a distant torch before the player understood it.

The legacy page at https://nextgen.run/diggame-2/ was opened and reached gameplay.
An earthquake-specific comparison was not completed, so this report does not
claim an exact old-versus-new visual comparison. The diagnosed current-code
causes above were independently exercised in the local controller and browser
checks.

## Result

- Persistent, zoom-stable phase instructions explain what is active and what
  to do. Notices sit below the seismic card, clear of wallet/menu controls.
- Earthquake: nearby epicenter, stronger existing flash, minimum one initial
  fall for minor events, repeated nearby ceiling searches while moving,
  bounded fall budgets, 2.1-second committed warnings, current-floor collision,
  actual impact/knockback and solid-cover counterplay.
- Wurm: overlapping body geometry along real curve distance; five sizes and
  five behaviors; slower Drifter/Ancient, faster Hunter, longer Ancient hunts,
  and Broodmother with two smaller independently warned Wurms. Save/reload
  preserves variants and cannot duplicate the brood. Every pass retains at
  least 1.8 seconds of warning. Developer picks last for one hunt.
- Shadowminer: slower bounded travel, at least 6.5 seconds of observation,
  resident work/idle frames, up to three real ordinary terrain removals,
  distant-torch immunity and a slower readable retreat. No ore/special blocks,
  reward, inventory, GP or Stress authority was added.
- Local developer EVENTS / F2 controls include all three triggers, independent
  Wurm size/behavior choices, cancel and Open sandbox. They show actual phase,
  admission reason, latest outcome and start/completion counts. Shadow requests
  can queue while a safe visible history trail is formed. Production builds use
  the same production marker that disables God Mode: no EVENTS button/panel,
  no F2 registration, no global manual-trigger API, and manual requests rejected.
  This also applies when a production build is served from localhost; review
  query parameters do not re-enable the controls. Normal events and monitoring
  remain active under their ordinary gameplay gates.
- Event health detects missing/stalled controllers, missing artwork/work
  animation and phase/lifetime overruns. Existing runtime canaries also read
  this health. Late Wurm art retries; the monitor does not forcibly reset the
  world. Cancelled encounters do not count as passed.
- Money Monster Rush, Blackout Bloom and the Lumen Bloom alias remain retired,
  including force-query, direct start and old-save admission.

## Wurm selection

| Behavior | Natural unlock | Default size | Character |
| --- | ---: | --- | --- |
| Drifter | 120m | Hatchling | Slow, light damage, two passes |
| Raider | 280m | Small | Moderate speed, three passes |
| Hunter | 550m | Mature | Fast, three passes |
| Ancient | 900m | Giant | Slow, heavy, five passes |
| Broodmother | 1300m | Large | Four passes, two smaller Wurms |

The lab and developer panel allow all five sizes with all five behaviors.
Natural encounters cycle through profiles unlocked at the current hunt depth.
Ordinary admission still requires armed Hardcore, Flight and depth 120m for
Wurm; Shadowminer retains depth/chance/history gates; earthquakes retain hazard
introduction, suppression and normal timer rules. Timing/chance are visible in
the lab so a blocked or unlucky attempt can be distinguished from a failure.

## Review and evidence

Serve this checkout using root `serve.py`; open
`/testing/dynamic-event-sandbox/index.html`. The scene imports the production
controllers and views but replaces world/player/save authority with an
in-memory chamber and an instrumented body. Use A/D, Auto patrol, Auto mining
noise, Torch, depth and 1x/4x/10x controls. Run six sequences all three encounters
twice and waits for earthquake settlement.

`node testing/2026-09-05-dynamic-event-polish-suite.mjs` passed 13/13 focused
checks, including 25 Wurm combinations, active-brood reload, real Shadowminer
work, earthquake hits/dodging/removed floor/cover, health faults and feedback.
The required player jump/Flight regression also passed. This is not a clean
full-repository test result: older earthquake contracts identified in the
admission report have stale fixture/upgrade expectations.

Browser evidence is separate in
`testing/dynamic-event-sandbox/2026-09-05-polish-browser-proof.json`:
Shadowminer animated and removed an ordinary block; Giant Ancient segments
were visibly connected mid-burrow; Broodmother completed with two bounded
smaller children; a parked body suffered two hits from three minor-quake rocks;
a six-encounter run with patrol/mining noise completed and remained healthy.
The isolated lab recorded zero persistent storage reads/writes and no console
errors. In normal PlayScene under the existing save-disabled harness, EVENTS
opened by pointer and F2, showed all three real admission reasons, and the Wurm
button ran a Mature Drifter through warning/burrowing/completion. The panel
reported STARTED then PASSED with counts 1/1; GP remained 110/110. This caught
and fixed a camera-scroll mismatch in the child button hit targets. The prior
Wurm medallion now yields while the persistent encounter card is visible; a fresh full-game warning capture confirmed the single-card handoff.
Long-session full-game balance and subjective audio/visual acceptance
remain user review, not claims made by the fixture.

## Fourth event proposal - Pressure Vent

A nearby opened pocket starts hissing and exposes an authored glowing crack.
A persistent direction cue and a visible expanding pressure tell precede a
fixed, short jet. The player can walk out of its marked lane, dig a side vent,
or use solid cover. Successful venting ends the event early and opens a small
passage; no automatic money shower or pursuit reward loop is needed.

This would add a terrain-reading encounter alongside the Wurm hunt, ambient
Shadowminer and falling-rock quake. Reuse the existing cave vent family and
health/admission contracts. Cap it at one vent, never put it on a protected
block or the only exit, and commit its geometry before the warning starts.
It remains a proposal; no fourth event has been enabled.
