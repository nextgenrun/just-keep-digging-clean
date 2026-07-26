# Character sprites

Player-character sprite sources, processed sheets, and runtime animation assets grouped by character and version.

`ual-native-player-v1/` is the production CC0 UAL mannequin library. Its manifest retains 21 weapon-free review actions / 943 frames, while gameplay loads only the 18 approved sheets / 867 frames. SIDE, UP, and UP-SIDE are punch-only; Hook, the authored kick, and the `Sword_Regular_C` up strike remain rejected review/rollback assets. Idle/actions use a 109px display size and locomotion uses 123px to preserve the approximately 0.8-tile silhouette.

`survival-ual-player-v1/` remains the compatible UAL-motion fallback for the approved higher-detail Survivor route. The selectable `survivalUal` profile promotes Blender v2 idle, idle-talk, walk, run, and flight sheets first, while unreviewed combat/directional actions continue to use this compatible 18-sheet fallback with the same collider, action-start cooldown, visual-contact damage, and diagnostic-only rig-marker rules.

`survival-character-blender-v2/` is the approved high-quality PBR Survivor core. Its idle, locomotion, and flight sheets are game-routed for `?character=survivalUal`; its unarmed `MINER_attack` and `MINER_dig_side` sheets remain review candidates until a side-combo choice is explicitly promoted.

Arc Core v3 moved to `sprites/vehicles/arc-core-v3/` when approved for
production. Its ten gameplay roles use fixed 512px canvases, recorded hashes,
and zero-drift center anchors. `arc-core-review-v2/` remains source evidence
only.
