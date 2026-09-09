# Observatory Independently Authored Layers V3

Review-only Phaser/WebGL rebuild. The checked-in `sky13` composition is loaded
only in Reference and Split views. It is not a runtime pixel donor.

The runtime uses seven independent built-in ImageGen sources: one clean sky,
four dedicated atmosphere cards, unlit architecture, and a separately authored
lit architecture state. The pack builder chroma-keys only those new sources,
extracts warm apertures from the new lit state, and assigns stable light IDs.
It does not segment or sample the reference composition.

Four purpose-built cloud sources are cleaned of their residual chroma matte and
split into 54 actual feathered organic wisps. Each wisp includes transparent
travel padding and streams in the same wind direction at a slightly different
speed. V16 samples each wisp once so the authored cloud detail stays sharp; its
staggered resets use long independent fade envelopes instead of cross-blending two
soft copies. Weather multiplies stream speed and density. The sky is rebuilt
without its strongest detected stars, then 900 stable star IDs use hashed,
independently phased steady, deep-twinkle, and rare-sparkle behavior classes.
Cloud edges cannot enter the star shader.

Architecture is split into 14 connected floating-island sprites. Matching
emissive atlas frames follow each island exactly, while 87 detected windows use
stable per-window IDs. Their flame shimmer stays in the ambient loop, but room
occupancy follows persistent time-of-day plus a weekly phase and includes real
off states. Five smaller islands follow deterministic 28, 56, or 84 world-day
arrival schedules with multi-day fades; rain, storm, snow, and drizzle alter
their visibility/lift while also changing cloud flow. The page advances with
the production `TIME_CONFIG.dayDurationMs` value (two real hours per game day),
not an accelerated 48-second calendar.

Ten interior figures reuse optimized frames from the existing canonical talk,
pickaxe-mining, and walk sheets. They remain attached to their island modules.
V16 therefore exposes seven actual motion systems: cloud streams, island
buoyancy, long island lifecycles, daily/weekly window occupancy, flame shimmer,
independent star classes, and interior figures. The 48-second phase now governs
only seamless ambient motion; persistent world events use the world clock.

Build the pack with:

`C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe ai-tools/2026-08-30-build-observatory-authored-layers-pack.py`

Then serve the repository and open:

`/testing/animation-sandbox/2026-08-30-observatory-authored-layers-v3/?view=runtime&day=12&hour=22&weather=clear&rev=16`

The manifest records zero reference-pixel reuse and pins the unchanged Town
Square video SHA-256. No file in this folder is imported by production.
