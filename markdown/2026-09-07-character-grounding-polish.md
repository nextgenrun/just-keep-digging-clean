# Character grounding and definition polish — 7 September 2026

Wired into the approved Survival V2 profile. Main-world presentation only; cave work is discontinued.

## Appearance and rendering

- Eight native traversal atlases (326 frames) rendered at 1024px with the approved V2 materials and fixed camera, then premultiplied-alpha downsampled to 512px.

- Power-of-two pages and eight-pixel gutters support trilinear minification without bleeding adjacent poses. Other action atlases retain the approved V2 assets.

- The main character receives a small neutral vertex-shading response to the day/night cycle. There are no outline, glow, sharpen-edge or cloth effects.

- Default render density accounts for the initial display size and pixel ratio, capped at the existing 2x Ultra budget. Explicit quality selections and density rollback retain their values.

## Grounding and motion

- Walking uses the native Standard Walk; running uses Standard Run. Both retain a fixed 101px cell display and origin (0.5, 0.890625). Apparent running compression comes from the authored pose, not sprite scaling.

- Native shoe-sole measurements replace ankle-bone grounding for these traversal exports. The supporting sole reaches 454.5 in the 512px cell, about 0.30 world pixels above the collision floor.

- Measured cycle travel is 62.328px for walking and 119.6435px for running. Cadence uses actual frame displacement, including low-speed braking and slow render frames. Gameplay velocity and collision are unchanged.

- Start and stop handoffs retain all 12 phase variants. Their presentation lasts about 122ms and 91ms respectively, alongside the existing 120ms acceleration / 90ms braking.

- Walk/run switching selects the closest outgoing foot pose. Reversal presentation follows travel through braking, then turns as velocity changes sign. Input-facing authority for combat is unchanged.

- Torch walking/running and handoffs use corresponding native clips and the same timing. Footstep sounds and material scuffs use the new sole-contact frames.

- Soft floor occlusion and individual sole contacts read custom physics and supporting world tiles after the final pose update. Takeoff leaves the fading shadow on the last floor; landing briefly strengthens contact without scaling the character.

## Preserved behavior

The native source Blender files are unchanged. Cloth shape values remain zero. Running retains its 2.1 multiplier and dash FX. The fixed Space jump and Shift flight mechanics remain unchanged. The separate skeletal run renderer remains disabled. No save schema or gameplay balance changes.

## Evidence and reproducibility

- `testing/character-grounding-2026-09-07/` contains the before state, scoped backups, native shoe measurements, exports, contact contract and live captures.

- The focused contract checks all 214 registered animations / 3470 frame references across 57 available atlas sets, all 326 grounded traversal frames, slow-frame cadence, foot-phase transfer, shadow takeoff/void behavior, and HiDPI resolution.

- On the sampled steady left-stance window, the old run foot moved 21.31px along the ground while the body moved 36.43px. The new native source window has 0.05px residual foot travel while the body moves 29.91px. These source-window measurements do not describe every transitional pose.

- The eight replacement/additional atlas sets total about 213.3MiB including mip levels when all are resident. They replace six previous traversal sets and add two torch run sets; deferred action loading remains in place.

- Main-world live verification covers bare-hand and torch walk/run, reversals, idle, jump, landing, flight and crouch; all frames remain 512px with fixed per-animation geometry and zero sprite/body offset. The observed WebGL error is zero, and all new pages use trilinear minification.

- Required traversal contract: 33 cases pass. Running, presentation continuity, deferred-animation loading and asset-load coordinator checks pass.

`?characterGrounding=0` restores the previous character setup for comparison. The dated native renderer and packer regenerate the new assets and contact tables. The visual review page uses matched-condition gameplay recordings.

The older world-texture native-density test stops on its missing cave-background fixture at line 61. Cave work is discontinued; the new focused display-density checks pass independently.

Cold-load repair: the deferred controller now registers animations after each complete atlas, while keeping the pack promise pending until all required atlases are ready. This prevents the first Cross from replaying the resident Jab while later SIDE clips are still loading. Atlas frame readiness remains atomic.

Final live verification: `comparison-after/` was refreshed with the final vertex shading and covers both bare-hand and torch traversal, jump, landing, flight and crouch. Appearance is active, the character has zero post pipelines, all ten loaded grounded atlas pages use trilinear minification, and WebGL reports no error. The 2x-density SIDE run completes all twelve stages and wraps in both directions, including the original moving Jab and Cross. Its assertions respect the existing 2000ms combo reset window and require the selected pose at every start. Repeated DOWN input produces five impacts, no intervening crouch frames and the retained finished-pose hold. All three live runs report zero page errors.

The before/after page was inspected in the in-app browser. Both 1920x1080 videos decode and play; close-up framing includes the feet, the end-of-playback label resets, and Restart and Pause operate on both videos. The review screenshot is `testing/character-grounding-2026-09-07/comparison-review.jpg`. Canonical local server: port 8196.
