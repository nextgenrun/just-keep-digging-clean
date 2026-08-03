# HUD controls interaction QA

The production approved-HUD composition was exercised in Phaser WebGL with hidden Microsoft Edge at 1280x720.

- Music hit target: 52x38; click changed the live state to muted.
- SFX hit target: 52x38; click changed the live state to muted.
- Inventory hit target: 109x116, matching the authored bag frame; click opened the canonical `UIInventoryPopup`.
- Opening inventory disabled player controls, set shop/modal state, and acquired UI input priority.
- No browser console errors, page errors, or scene-level pointer leakage were observed.

Artifacts:

- `hud-controls-inventory-open.png`
- `live-qa-report.json`
