# Worldroot Campfire runtime sprites

campfire-tier-01.png through campfire-tier-10.png are the transparent,
full-resolution runtime derivatives of the immutable RGB sources in
../sources/.

tools/2026-09-04-build-campfire-worldroot-v2-runtime.mjs removes only
border-connected and large enclosed neutral backdrop regions, decontaminates
the neutral edge fringe, preserves the authored 1254 x 1254 canvas, and writes
manifest.json with source/output hashes and measured alpha bounds.

Runtime code must use the versioned campfire-worldroot-v2-tier-* texture keys
from values/campfireConfig.js; the original metal-brazier family remains in
../../generated/ only as rollback art.
