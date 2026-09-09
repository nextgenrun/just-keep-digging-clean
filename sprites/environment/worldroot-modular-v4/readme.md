# Worldroot modular V4

Production Worldroot art is split into six native-pixel modules: Rootways,
Cobalt, Amber, Mirrorstone, Starfire, and the Crown. Each module has a paired
`living/` and `consumed/` texture with identical dimensions and alpha so Star
choices can crossfade the same branch without moving its collision surface.

- `source/` preserves the chroma-backed authored inputs.
- `living/` and `consumed/` are runtime RGBA outputs.
- `guides/` contains the side-elevation alignment reference.
- `worldroot-modular-v4.manifest.json` records dimensions, source crops, and
  SHA-256 hashes.

Every module locks its authored source crop, applies a green-purity alpha matte
before and after resizing, then neutralizes any remaining green-dominant edge
colour. This removes keyed-background alpha without changing dimensions or
intentional country lighting. Walkable segments are measured against the clean
runtime alpha rather than against leaked chroma pixels.

Rebuild the outputs from the repository root with:

```powershell
node tools/buildWorldrootModularV4Assets.mjs
```

`values/worldrootModularV4.js` owns paths, small whole-sprite alignment offsets,
and twenty-five walkable segments measured in each PNG's native pixels.
`WorldrootModularV4View` renders at scale 1 and transforms those segments into
world collision. The art contract rejects alpha drift between states,
low-resolution outputs, weak living/consumed separation, and collision over
transparent pixels. Normal play uses V4; `?worldrootArt=v3` restores the
previous composite art without changing progression or saves. The art and
builder own no Star, reward, or save authority.
