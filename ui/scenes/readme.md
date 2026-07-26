# Scenes

UI module — scenes.

`BootScene.js` preloads only the Level 1 facade recognition atlas and start chunk;
`LevelOneGroundFacadeSystem` streams the remaining eight chunks from their pure
values manifest as the surface camera moves.

In scenic mode it also preloads the 25 compact alpha titan silhouettes declared
by `values/titanDiscoveries.js`; the source chroma and intermediate atlas files
remain tooling-only and are never queued.
