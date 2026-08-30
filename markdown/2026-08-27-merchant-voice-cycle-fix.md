# Merchant Voice Cycle Fix

## Symptom

Every surface merchant repeatedly played its first boot-loaded voice line instead
of advancing through the merchant's registered catalog.

## Cause

Runtime audio streaming intentionally loads one voice seed per library at Boot.
NPC selection preferred already-loaded entries, so the one seed could remain the
only selectable line when post-playback prefetch did not complete first.

## Resolution

- NPC libraries now advance in catalog order and wrap after their final entry.
- An unloaded next entry streams on demand instead of falling back to the seed.
- The playback cursor advances only after the selected sound starts.
- Post-playback prefetch prepares the next catalog entry in cycle order.
- Player random voice selection remains unchanged.

## Verification

- `testing/2026-08-27-merchant-voice-cycle-contract.mjs` exercises Money Monster,
  Gear Merchant, Player Upgrades, Gem Merchant, and Bobo across streaming,
  interrupted playback, and wraparound.
- `testing/2026-07-22-core-state-systems-contract.mjs` remains green.
- `testing/2026-08-12-npc-shop-interaction-contract.mjs` remains green.
- The production game cold-booted in the browser with runtime audio streaming
  enabled and reached Bobo's live interaction prompt without page errors.

## Rollback

Revert `sound/VoiceLineManager.js` and `sound/RuntimeAudioAssetManager.js`, then
remove the focused merchant-cycle contract.
