# Treasure Chest Opening and Reward Repair

## Problem

Authored treasure chests paid their money, optional Star, and temporary
Treasure Fury buff through the gameplay authority, but the player received no
explicit payout confirmation. The configured `reward` SFX key was not loaded.
The streamed cache visual could also start its timer before its atlas became
ready, skipping opening frames, then settled on the broken closed `spent`
frame.

## Repair

- Reject chest consumption when the wallet authority is unavailable or does
  not accept the computed money payout.
- Confirm the exact money, optional Star, and active Treasure Fury reward in
  the existing world-space status text and authored HUD status lane.
- Use the already-loaded UI confirm sound instead of the missing `reward` key.
- Start the opening timeline only after the streamed atlas is ready.
- Keep an opened chest on the atlas's open resolved frame instead of closing
  it into the broken spent frame.
- Add the save-safe `Ctrl+Alt+K` local E2E preview, which places the player next
  to an unopened chest with a zero wallet for a real Interact-key check.

## Validation

Run:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-25-treasure-chest-reward-contract.mjs
```

For live QA, open the local game with `?jkd_e2e=1`, enter a save slot, press
`Ctrl+Alt+K`, then press the configured Interact key. Confirm the wallet rises
from zero, the reward text names every granted component, the full opening
sequence plays, and the chest remains open.

## Rollback

Revert the chest-specific changes in:

- `systems/mining/SpecialTileSystem.js`
- `systems/visual/AnimatedCacheVisualSystem.js`
- `values/treasureChestConfig.js`
- `testing/JkdE2EHarness.js`
