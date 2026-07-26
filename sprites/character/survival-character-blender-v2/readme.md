# Survival Character Blender V2

Persistent Blender authoring package for the production Survival character.

- `blender/` contains the editable master scene.
- `previews/` contains exact 128 px truth renders, motion strips, and GIFs.
- `runtime/` contains the promoted eight-sheet production set and manifest.
- `piskel-polish/` contains editable, non-destructive post-render sources.
- `reports/piskel-polish/` contains generated anchor and drift evidence.

The shipped variant uses the clean high-resolution PBR base, fixed camera, and bounded full-body UE motions. Optional procedural identity gear and pickaxe are disabled because they reduced visual quality.

The Blender master remains the mesh and motion authority. The dedicated
`MINER_dig_up` render additionally passes through the shared Piskel body-anchor
and baseline normalizer; its protected raw sheet is never overwritten.
