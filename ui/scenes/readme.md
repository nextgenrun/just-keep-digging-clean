# Scenes

UI module — scenes.

`BootScene.js` preloads the ten approved Milestone/Star Pillar stage sprites,
the constellation Star Heart used inside Star Pillar sockets, and only the Level
1 facade recognition atlas and start chunk;
`LevelOneGroundFacadeSystem` streams the remaining eight chunks from their pure
values manifest as the surface camera moves.

In scenic mode it also preloads the 25 compact alpha titan silhouettes declared
by `values/titanDiscoveries.js`; the source chroma and intermediate atlas files
remain tooling-only and are never queued.
