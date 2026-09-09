# Hardcore death recovery — 7 September 2026

Hardcore death now completes through the current town-bed save policy, keeps failed saves recoverable, accepts mouse input at the visible buttons, and survives another expedition in the same PlayScene instance.

## Causes and fixes

- The production coordinator rejected the death snapshot because the player was not committing a town-bed rest. The exception now requires an active death save and an exhausted Hardcore state. Living-run checkpoints still require the bed. Recoverable write errors leave the existing death retry in charge; snapshot-integrity failures retain the authority block.
- The recap hid itself before its asynchronous retry completed. It now closes only when the callback succeeds. Escape cannot activate the hidden Main Menu action while saving has failed.
- Phaser had already destroyed grave images when memorial teardown called disableInteractive. That threw before the lifecycle could clear the old owner. Teardown now checks the image's scene before disabling input, so the following run receives a fresh memorial system.
- The interactive death-button images and backdrop used world-camera scroll factors while their artwork was fixed to the screen. Their input now uses the same fixed coordinates.

The existing one-life rule, exhausted/exportable save, and permanent memorial remain authoritative.

## Verification

The new production-coordinator regression failed before the save fix; the destroyed-grave case separately failed before its cleanup fix. Both pass now.

Passed:
- testing/2026-09-07-hardcore-death-bed-retry-contract.mjs
- testing/2026-09-07-town-rest-contract.mjs
- testing/2026-07-28-hardcore-permadeath-contract.mjs
- testing/2026-07-28-hardcore-memorial-contract.mjs
- testing/2026-08-26-hardcore-death-save-and-tutorial-pointer-contract.mjs
- testing/2026-08-26-hardcore-restart-lifecycle-contract.mjs
- JavaScript syntax and scoped git diff whitespace checks.

The local browser review depleted GP through the production player method, then used real keyboard and mouse input. It verified two failed writes with the recap still open, blocked Escape, success on attempt three, return to save slots, another death in the same game session, and a mouse exit to Main Menu. Each completed run had one consumed life and one memorial. The final browser trace contained only the two deliberately injected write failures.

The fixture uses an isolated local origin, memory-only save and memorial ports, and the existing E2E save guard. Durable save normalization/reload is covered separately with the real save store and in-memory storage. This is focused death-flow coverage, not a natural-progression playthrough.

## Reproduce and evidence

Run the checkout's serve.py and open /testing/2026-09-07-hardcore-death-live.html. Select the number of simulated failures, start a Hardcore run, and deplete GP. Exercise Retry Save and the final menu controls in the game canvas.

Scoped originals, the exact candidate files, screenshots, and runtime-evidence.json are retained at:
C:/xampp/htdocs/_codex_artifacts/hardcore-death-20260907/
