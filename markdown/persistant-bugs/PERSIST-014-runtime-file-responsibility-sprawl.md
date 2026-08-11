# PERSIST-014: Active runtime modules exceed the responsibility-size contract

- Status: confirmed
- Severity: P2
- Category: legacy spaghetti / oversized responsibility boundaries
- Evidence: the current scan found 252 active runtime JavaScript files, with 50 above the repository's approximately 300-line file rule and 22 above 600 lines. Examples include `systems/visual/FloatingTextSystem.js` (1726 lines), `systems/lighting/LightSystem.js` (1441), `ui/scenes/BootScene.js` (1360), `systems/mining/DigSystem.js` (1286), `world/playScene/PlaySceneGameplay.js` (1230), and `ui/overlays/ShopOverlay.js` (1155).
- Failure: large modules combine orchestration, persistence, rendering, input, catalogs, and presentation. This increases duplicated helpers and makes lifecycle ownership, error handling, and regression isolation difficult; the size itself is a repeatable structural violation rather than a style preference.
- Permanent solution: split each module by one responsibility, keep orchestration methods thin, inject collaborators, and move static catalogs to values modules. Prioritize the 22 files above 600 lines and preserve behavior with focused contract tests during each split.
- Verification contract: no active runtime module exceeds the agreed threshold without an explicit generated-data exemption; each exception must name its owner and responsibility in a manifest.
