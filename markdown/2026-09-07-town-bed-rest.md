# Town bed rest, Ember and checkpoints

The town bed stands between the Money Monster and Campfire at surface tile 19.3. Approach and use the bound Interact key (E by default). A 1.6-second doze closes the eyes, then a sharp 4.2-second above-ground shot fast-forwards the authoritative clock and weather by eight game hours. A varied awakening follows, then the 0.7-second Ember flight. The illustrated panel says EMBER POUCH FILLED and offers Warmth or Inspiration. Click either card, or select with direction keys and confirm with E/Enter. TEND THE CAMPFIRE retains the existing gold-priced tier upgrades.

Sleep restores the pouch to its existing refill capacity without removing mined surplus. Choosing a blessing grants it without spending an Ember, so the player leaves with an active buff plus stored charges for action-bar slot 6. The first completed rest introduces the Campfire and clock through a saved hearthKnown flag; unrelated progression gates stay with their existing milestones.

The bed grants no extra GP or resources. Player controls, movement, mining, hazards and torch drain are suspended during rest. The camera uses the existing world view with a gentle pan, hides HUD art and restores both on completion/shutdown. Reduced-motion settings disable the camera pan. The sleeper and foreground quilt are composed from the actual player frame and bed texture. All new visible panels, cards, fixed labels and captions use the generated baked RGBA assets; changing stats and key bindings are Phaser text. Input zones are invisible Phaser objects.

## Time and persistence

DayNightCycle retains fractional overflow and counts every crossed day, updates seasons, and emits world-days-passed for future daily systems. Sleep advances exactly eight game hours from the current time. The clock accelerates during the fully visible outdoor shot, between its opening and closing fades. Weather uses the same director, phase durations, forecasts, wind, clouds and wetness simulation in bounded one-second steps. Particles, lighting and audio render once per frame. This avoids producing a day's worth of effects in one burst. Active player hazards do not run at accelerated speed.

The clock's existing dayNightData envelope now carries weather state: kind, forecast, remaining phase/gust/override times, precipitation, cloud time and wet columns. Existing saves without this extension remain readable. CampfireData retains the selected blessing, bounded remaining duration and the introduction flag.

Only a completed bed choice can admit a gameplay checkpoint. The save coordinator keeps expedition mutations and transaction rewards in memory until that checkpoint; manual, queued, visibility, page-hide, shutdown and underground forced flushes cannot write progress. A failed bed write keeps the choice open, restores the previous buff and permits retry. Concurrent confirmation cannot grant or save twice. Manual exports use the last committed bed checkpoint; explicit file import retains its existing validation and backup flow.

Hardcore expeditions no longer write partial position/GP resume checkpoints. The active store remembers armed-run authorization in memory, allowing the existing permanent-death tombstone/purge to work even before the next bed save. Death records remain durable; they are not playable checkpoints.

## Art and ownership

- values/townRest.js: art paths, placement, timing, layout and checkpoint policy values.
- systems/environment/TownRestSystem.js: sleep/refill/choice state machine.
- systems/visual/TownRestView.js: baked Phaser presentation and lifecycle cleanup.
- systems/environment/sleepWeatherSimulation.js: time advancement and weather persistence.
- world/playScene/TownRestBridge.js and TownRestSavePolicy.js: scene ports and town admission.
- sprites/environment/town-rest-v1/: untouched ImageGen outputs. prompts.json records the exact prompts, dimensions and hashes.

## Verification

The isolated live test runs the canonical serve.py and production PlayScene with actual E, movement, pointer, direction and confirmation input. It reconnects the save-free E2E fixture to the real save coordinator with an in-memory writer, so no player storage or server saves are modified. It checks the cinematic, stable position, real weather transitions, both blessing choices, refills, failed-save retry, restored controls, serialized buff/weather and underground save rejection. Screenshots and traces are in testing/2026-09-07-town-rest-evidence/.

Focused contracts passed for the new rest flow, save ordering/scheduling, v15 save integrity and Hardcore one-life/permadeath. The existing jump/flight contract passed all 33 traversal/input cases. These are focused feature checks, not a claim that the entire shared checkout is free of unrelated issues.

Final live evidence: the measured sleep lasted 4.1875 seconds, followed by the
700 ms wake beat. Day 3 advanced to day 4 at 07:12; 147 real weather phase
transitions were simulated, ending in rain. GP stayed exactly 110 throughout
sleep and saving. The second rest verified the two-charge capacity, injected
write failure and successful keyboard retry. Pressing 6 then spent one stored
Ember and reapplied Warmth without creating another checkpoint.

## Save UI directions

Save remains clickable in the Pause overview and Saves tab. It closes the menu
and resumes gameplay with the baked "RETURN TO YOUR TOWN BED / SLEEP TO SAVE"
instruction and a distinct bed/moon guidance arrow. An ignored arrow stays for
eight visible gameplay seconds, then fades over 650 ms. Moving 0.45 tile closer
keeps it active until the real grounded bed interaction range is reached;
small movement jitter does not accept it. Once followed, stopping or detouring
does not discard the destination. Paused/modally blocked gameplay hides the
guide and freezes its timer. Arrival removes the arrow; beginning sleep or
destroying the host releases every guidance image, mask and listener.

The pointer targets the actual bed when visible and uses an edge direction
when outside the viewport. The bed crest remains upright and layout adapts to
viewport dimensions and camera zoom. Copy and artwork are baked in Phaser,
with exact generated source pixels clipped to measured silhouettes through the
same masking approach as the baked save menus. Provenance and prompts are in
sprites/environment/town-rest-v1/guidance-prompts.json.

The guidance has no persistence authority or serialized state. The checkpoint
still requires completing sleep and choosing the blessing. Tests are
testing/2026-09-07-bed-guidance-contract.mjs and the adjacent live browser test;
screenshots and measured results are in testing/2026-09-07-bed-guidance-evidence/.

## Bed scale and UI admission

The bed is 1.6 tiles wide (150.4px at the current 94px tile size), reduced from 2.5 tiles. Its interaction range and prompt are reduced with it, and the sleeper position uses the bed dimensions to stay aligned with the pillow and quilt.

The shared UI input lock blocks bed admission and hides idle rest prompts/feedback while another menu is active. Inventory's direct I-key listener uses the same lock and gameplay-state admission. Sleep and the blessing choice consume pending Pause/Map input before handing control back, so blocked key presses do not open a menu after saving.

The adjacent testing/2026-09-07-bed-scale-ui-live.mjs exercises the actual inventory, map, Pause and Money Monster shop with guidance active, menu entry at the bed, and blocked keys through sleep, blessing selection and checkpoint completion. Its browser profile and save writer are isolated from player storage.

Rest acquires the shared UI input lock for the entire sleep/choice/save flow and releases it only on successful completion or teardown; a failed save keeps ownership for retry. Pause and World Map entry refuse active rest. A pending map asset load also postpones bed admission.

Final scale/UI validation passed in the production PlayScene: inventory, map, Pause and Money Monster shop hide bed guidance and prompts; closer bed priority hides the competing merchant sign. Inventory E input is discarded on close. Each I/M/Escape press was checked individually during sleep and blessing selection, with one resulting checkpoint, no queued menu on resume, restored controls, and no page errors or failed requests. Final captures and measurements are in testing/2026-09-07-bed-scale-ui-evidence/.
