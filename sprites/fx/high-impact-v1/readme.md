# High-impact FX v1

This runtime pilot is intentionally limited to three corrected transparent
ImageGen sources for Thunder Strike:

- `thunder-ground-slam-flare-v1.png`
- `thunder-chain-echo-ring-v1.png`
- `thunder-lingering-crackles-v1.png`

The three files are activated atomically through the shared PlayScene runtime
asset coordinator. Until every texture is resident, or whenever
`?highImpactFx=0`, `off`, `false`, or `procedural` is supplied, the existing
procedural rings and sparks remain exact fallback. The bolt, branches, flash,
label, shake, damage, timing, and save behavior are never replaced.

The promoted files come only from the adaptively re-sliced v2 review library:

| Runtime file | Dimensions | Bytes | SHA-256 |
|---|---:|---:|---|
| `thunder-ground-slam-flare-v1.png` | 320×256 | 55,708 | `16a4d25546d4e9d0f50e6f73c39d91f9cddae620b073599742dce7cc3e0caa2a` |
| `thunder-chain-echo-ring-v1.png` | 320×256 | 70,064 | `4f2c1664a5b0ae32d89465d79f46ba275ff5fb6c68cd4ab1ce853046c11556e2` |
| `thunder-lingering-crackles-v1.png` | 320×256 | 31,058 | `68364b7d5dd71c7e6a3a9586beb14bc27130a599b5495283370461514f5509d0` |

`provenance.json` pins the same source identities and runtime bytes. Missing or
failed assets are safe: they cannot partially render.
