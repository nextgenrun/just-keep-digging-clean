# Full PlayScene browser QA

All three V2 selectors were loaded through Boot and a real save into the full
1280 x 720 `PlayScene`. Runtime logs confirmed `natural-canopy`, `depth-breeze`,
and `quiet-stars` separately. The final Natural Canopy run reported zero page
errors; the ten warnings were existing unsafe Memory Reliquary anchor warnings
and did not involve the surface video.

Natural Canopy was sampled 25 times at 0.8-second cadence (19.2 seconds total),
so the capture crossed the 18-second playback boundary. Across the visible
upper world, the maximum sample-to-sample change was only 1.1619 times the
median interval; there was no reset spike. Four broad visible background zones
measured 0.2393 mean motion correlation with live weather included, consistent
with the independently timed canopy construction rather than one global sway.

The real scene preserved the authored player/NPC scale, slate floor, earth
facade, HUD, weather, and underground world. Those layers continue to animate
or tint under their own systems, so raw lower-screen pixel change is not used as
video ownership evidence. The runtime geometry, 1800 x 534 source dimensions,
`groundIncluded: false` manifests, and separate floor/ground draw paths remain
the authoritative boundary proof.
