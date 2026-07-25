# Legacy Miner V8 Runtime Audit

| Animation | Frames | Halo px removed | Center drift before -> after | Bottom drift before -> after | Anchor max shift |
|---|---:|---:|---:|---:|---:|
| idle | 34 | 13513 | 5.0 -> 1.0 | 0 -> 0 | x4 y0 |
| walk | 51 | 2 | 34.0 -> 1.0 | 0 -> 0 | x18 y0 |
| dig-sideways | 18 | 20883 | 30.0 -> 26.5 | 0 -> 0 | x17 y0 |
| dig-up | 9 | 24277 | 19.5 -> 1.0 | 0 -> 0 | x10 y0 |
| dig-up-sideways | 13 | 44617 | 28.0 -> 1.0 | 0 -> 0 | x22 y0 |
| fly-climb | 25 | 30106 | 7.5 -> 2.0 | 2 -> 0 | x4 y0 |
| dig-up-look | 1 | 750 | 0.0 -> 0.0 | 0 -> 0 | x0 y0 |
| dig-down | 5 | 10669 | 0.5 -> 0.0 | 0 -> 0 | x0 y0 |
| duck-downwards | 4 | 140 | 5.5 -> 0.5 | 0 -> 0 | x4 y0 |
| combat-idle-to-normal-idle | 46 | 14337 | 17.5 -> 1.0 | 0 -> 0 | x14 y0 |
| leans-against-wall | 4 | 122 | 18.0 -> 6.5 | 0 -> 0 | x0 y0 |
| falling-downward-through-sky | 7 | 0 | 13.5 -> 1.0 | 0 -> 0 | x8 y0 |
| quickslash | 2 | 1024 | 19.0 -> 0.5 | 0 -> 0 | x10 y0 |
| quickslash-v2 | 39 | 73412 | 39.0 -> 43.0 | 2 -> 5 | x0 y0 |
| teleport-in | 38 | 63518 | 45.5 -> 45.5 | 17 -> 26 | x0 y0 |
| thunder-charge | 1 | 238 | 0.0 -> 0.0 | 0 -> 0 | x0 y0 |
| thunder-strike | 1 | 0 | 0.0 -> 0.0 | 0 -> 0 | x0 y0 |
