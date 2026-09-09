# Campfire sprites

All ten active forms remain authoritative in `values/campfireConfig.js`.
`CampfireSystem` owns tier loading, bottom-centred ground placement, interaction,
blessings, Ember charges and upgrades. Worldroot art must never contain a copy
of the fire. The configured progression starts around 42 px high and ends at
171 px; tier 10 is both widest and tallest at the current 94 px tile size.

`worldroot-v2/sources/` contains ten new independently generated root-and-stone
hearth designs and `generation.json` records their prompts/provenance.
`worldroot-v2/runtime/` contains their verified 1254 x 1254 RGBA derivatives.
Production uses versioned `campfire-worldroot-v2-tier-*` texture keys so a
previous metal-brazier texture cannot survive under the same Phaser key.
The original transparent sprites in `generated/` remain rollback-only.
