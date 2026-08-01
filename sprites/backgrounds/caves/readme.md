# Cave Scene Backgrounds

Expanded production caves use one continuous authored panorama from
`expanded-v1/`. The approved entrance is a separate left-side sprite. Rejected
Meshy review renders are not loaded as cave interiors. Collision remains normal
diggable terrain with no hidden cave-wall foundation.

Fixed-size, single-screen backgrounds for `CaveScene`.

- `cave-amber-v1.png` and `cave-violet-v1.png` are normal cave presets.
- `treasure-room-v1.png` is the rare treasure-room preset.

The selected asset is configured in `values/caveSceneConfig.js`; do not tile or stretch it beyond the game viewport.
