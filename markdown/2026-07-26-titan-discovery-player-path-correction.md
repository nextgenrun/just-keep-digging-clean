# Titan Discovery Player-Path Correction

**Status:** production  
**Date:** 2026-07-26  
**Cause:** a normal descent could pass every Titan without a readable encounter

## Player-Reported Failure

A playthrough reached 700 m without finding a Titan even though seven authored
chambers exist above that depth. The assets, renderer lifecycle, archive,
retention state, and surface trophies were live. The discovery contract was not
player-reliable:

- early chambers are distributed across the complete 280-tile world width;
- a narrow descent could miss their horizontal ranges;
- discovery required every originally diggable cell in a 15-22 by 8-13 tile
  chamber to be removed;
- the mostly buried art was too restrained to function as navigation.

## Correction

`TitanDiscoveryGuidance` now keeps one approved-HUD `ANCIENT RESONANCE` cue
active whenever an undiscovered chamber is within 72 vertical metres. It reports
the remaining horizontal and vertical direction without revealing the locked
Titan's identity.

An encounter now completes after the player:

1. exposes the larger of four tiles or 2.5% of the chamber's tracked cells; and
2. enters the chamber rectangle or its one-tile boundary.

Remote digging cannot award a Titan. Entering a chamber after it has already
been exposed works without requiring another tile mutation. The existing
high-resolution reveal, unlock FX, retention write, save request, archive entry,
and surface Titan Walk trophy remain unchanged.

## Authority and Rollback

- `values/titanDiscoveryExperience.js` owns reveal thresholds, guidance range,
  cadence, copy, and query names.
- `systems/visual/titanDiscoveryEncounter.js` owns entry/full-clear admission.
- `systems/visual/TitanDiscoveryGuidance.js` owns the approved notification
  lifecycle.
- `?titanGuidance=0` disables only the resonance cue.
- `?titanEncounter=legacy` restores the former full-clear trigger.
- Neither switch changes terrain, rewards, assets, collision, or saved Titan
  ids.

## Regression Coverage

`testing/2026-07-26-titan-discovery-experience-contract.mjs` instantiates the
production world and proves:

- all first seven Titans emit guidance during a descent through their depths;
- the live 700 m position points toward the next chamber;
- a partial entry reveal can unlock;
- remote reveal cannot unlock;
- locked guidance does not reveal Titan names;
- both rollback queries work.

`testing/2026-07-26-titan-discovery-contract.mjs` additionally exercises the
partial-reveal and subsequent player-entry sequence through the complete
runtime system, including retention, save request, archive, and trophy state.
