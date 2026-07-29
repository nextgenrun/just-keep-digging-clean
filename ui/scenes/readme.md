# Scenes

UI module — scenes.

`StartMenuScene.js` exposes visible, slot-aware Export Save and Import Save
buttons in the 1280x720 safe area. Empty slots can receive an import, while
export remains disabled until the selected slot contains save data.

Every empty slot now composes two explicit decisions before launch:
the illustrated `StartModeSelectionOverlay` Casual/Permadeath Hardcore rules,
then `StartTutorialChoiceOverlay` Yes/No. Keyboard listeners attach on the next
scene tick so the Space/Enter event that opens one decision cannot silently
accept it or skip the next decision. Existing saves bypass both prompts and use
their persisted settings and tutorial state. `WorldLoadScene` preserves both
new-save choices through loading and retry. The resulting explicit new-save
launch skips the later old/remote-save restore probe, preventing a failed
remote permadeath deletion from resurrecting the erased run.

The save-slot export and rotating-backup controls visibly show `OATH LOCKED`
for Hardcore. Backups remain counted for the death purge but cannot be restored
to rewind low GP, stress, position, or a committed Wurm warning.

`BootScene.js` preloads the ten approved Milestone/Star Pillar stage sprites,
the constellation Star Heart used inside Star Pillar sockets, and only the Level
1 facade recognition atlas and start chunk;
`LevelOneGroundFacadeSystem` streams the remaining eight chunks from their pure
values manifest as the surface camera moves.

Weather preload is values-driven: Boot queues only the approved cloud,
atmosphere, and lightning atlases plus the clean 32-frame ImageGen particle
sheet. The rejected broad rain/snow/water sheets are not part of the runtime
queue.

The FX preload also queues the single generated mining-target corner overlay
from `values/miningTargetFeedback.js`; the explicit rectangle rollback skips
that texture.

When NPC activities are enabled, `BootScene.js` also preloads the 48 transparent
v10 Piskel-normalized planted-idle cutouts declared by
`values/npcActivityConfig.js`. It never loads a visual-approval board or any
rejected walking frame.

The archived Shadow Miner idle atlas is intentionally excluded from the live
boot queue. No production system consumes it; loading the 3840x3840 sheet only
adds texture pressure and can prevent PlayScene from starting on constrained
renderers. The smaller active Shadow Miner sheet remains available.

The shared UI preload now queues the 25 compact alpha Titan silhouettes, 25
independent transparent surface stances, the compact basalt dais, resonance
overlay, guidance pointer, and retained legacy plinth declared by
`values/titanDiscoveries.js` in both scenic and legacy renderer modes. The live
surface gallery uses the newer basalt dais; retaining the older footing in the
bounded 54-asset package preserves provenance without routing it into the
scene. `?titans=0` de-queues the complete package. Source chroma, alpha masters,
contact sheets, and intermediate atlases remain tooling-only.

`BootScene.js` also queues exactly the 25 live modular surface-prop cutouts
returned by `getSurfacePropPreloadAssets()`: the retained 18-piece Level
1/Level 2 kit plus seven additive Level 2 chapter anchors. Review panoramas,
chroma sources, alpha masters, scale sheets, and retained Level 2 v1 tone
sources are never loaded at runtime.
