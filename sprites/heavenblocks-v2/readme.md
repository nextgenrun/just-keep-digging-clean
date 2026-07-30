# Heavenblocks v2 modular runtime art

This package contains the production Cloud Reef, Halo Bastion, and Eclipse
Scar sprite families. Every gameplay-facing terrain cell is rendered from an
individual modular sprite. The package does not contain a baked island facade.

- `cloud-reef/`, `halo-bastion/`, and `eclipse-scar/` contain terrain,
  topology, resource, prop, portal, shrine, barrier, relic-vault, component,
  and capstone sprites.
- `sources/` retains the ImageGen chroma and alpha atlases.
- `manifest-v2.json` records dimensions and SHA-256 hashes.
- `2026-07-29-heavenblocks-runtime-contact-sheet-v2.png` is review evidence.

Build with `ai-tools/2026-07-29-build-heavenblocks-v2-assets.py`.
