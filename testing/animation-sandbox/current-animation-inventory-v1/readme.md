# Current Animation Inventory v1

Read-only inventory sandbox for the active Dig Game animation registry and every animation-related asset set found in the checkout.

The generated `inventory-data.js` separates the promoted Survival/UAL default, alternate runtime profiles, globally registered NPC animations, production animation assets, testing/review material, and archived experiments. It does not change runtime configuration or promote any asset.

The top viewer plays the exact spritesheet frames, frame order, and FPS for any runtime row. The project-assets panel visually cycles through every browser-viewable image in a selected directory. Playback is for review only; one-shot clips loop in the viewer without changing their real runtime behavior.

The current Superman flight row also shows the approved twin blue foot trails behind both feet. The same effect is wired in the main world and compact caves.

The ground-strike body-follow panel retains five Blender drafts as synchronized decision evidence with shared pause, restart, scrub, and speed controls. All five are marked complete reject in `values/groundStrikeReview.js`; none can register or replace a runtime animation. The existing `OverhandThrow` down strike remains active, while `Jog_Fwd_Loop` stays in the run slot.

Rebuild from the project root:

```powershell
node testing/animation-sandbox/current-animation-inventory-v1/build-inventory.mjs
```

Serve the repository over HTTP and open:

`/testing/animation-sandbox/current-animation-inventory-v1/`
