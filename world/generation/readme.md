# World generation

Deterministic builders in this directory mutate the authoritative `WorldModel`
during `generate()`. They may read `/values/` configuration but must not create
render objects or own save state.

`HeavenblocksWorldGenerator.js` builds the three upward-progression regions from
real tile cells. It deliberately runs after the imported Tiled surface authority
so legacy sky-platform cells cannot leak into the rebuilt geometry.
