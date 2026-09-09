# Approved player HUD V2

`player-core-shell-v2.png` is the 456x112 RGBA player HUD bitmap, displayed at
the compact 336x82 logical footprint used by the active HUD.
It replaces the faint V1 core with a fully opaque charcoal shell and four
protected live-content areas: pickaxe badge, Depth, GP, and torch control.

Runtime ownership remains unchanged:

- `UpgradeSystem.ownedPickaxe` selects the authored icon and tier label.
- player-level and upgrade prerequisites remain in progression authority.
- Phaser supplies Depth, the GP fill/value, torch percentage, hit target, and
  overdrive state; none of these are baked into the bitmap.
- V1 torch ON/OFF crops remain authored state art inside the new right socket.

The unmodified built-in ImageGen alpha master is retained under `sources/`.
The runtime PNG is an alpha-bounds crop resized with Lanczos; its four corners
remain transparent while its usable panel interiors remain opaque.

Generation mode: OpenAI built-in ImageGen, followed by one targeted
background-extraction edit. The final edit requested genuine transparent alpha
outside the shell while preserving the generated geometry and opaque interior
exactly.
