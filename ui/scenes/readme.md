# Scenes

UI module — scenes.

`StartMenuScene.js` opens `NewRunSetupPanel` only for empty slots, then passes
the versioned mode/tutorial seed through `WorldLoadScene` into PlayScene.
Existing slots bypass setup and keep their persisted rules. Save cards show the
normalized mode label.

`BootScene.js` preloads the ten approved Milestone/Star Pillar stage sprites,
the constellation Star Heart used inside Star Pillar sockets, and only the Level
1 facade recognition atlas and start chunk;
`LevelOneGroundFacadeSystem` streams the remaining eight chunks from their pure
values manifest as the surface camera moves.

When NPC activities are enabled, `BootScene.js` also preloads the 48 transparent
v10 Piskel-normalized planted-idle cutouts declared by
`values/npcActivityConfig.js`. It never loads a visual-approval board or any
rejected walking frame.

The archived Shadow Miner idle atlas is intentionally excluded from the live
boot queue. No production system consumes it; loading the 3840x3840 sheet only
adds texture pressure and can prevent PlayScene from starting on constrained
renderers. The smaller active Shadow Miner sheet remains available.

The shared UI preload now queues the 25 compact alpha Titan silhouettes and the
generated Titan Walk plinth declared by `values/titanDiscoveries.js` in both
scenic and legacy renderer modes. This keeps the persistent ESC archive
available during visual rollback; `?titans=0` de-queues all 26 assets. Source
chroma, alpha masters, and intermediate atlases remain tooling-only.

`BootScene.js` also queues exactly the 18 live modular surface-prop cutouts
returned by `getSurfacePropPreloadAssets()`. The review panoramas, chroma
masters, and retained Level 2 v1 tone sources are never loaded at runtime.
