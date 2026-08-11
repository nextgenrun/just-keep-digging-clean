# PERSIST-012: World gameplay modules import UI implementation directly

- Status: confirmed
- Severity: P2
- Category: architecture boundary violation / legacy coupling
- Evidence: `world/playScene/OverlayManager.js:4` imports `ui/UiModalShell.js`; `world/playScene/PlaySceneUI.js:15`, `:22-32` imports modal shells, `PhaserUiKit`, settings, Titan archive, map, mute, inventory, shop, XP, level-up, and notification UI; `world/playScene/PlaySceneSetup.js:49-51`, `:97` imports notification, button, modal, and star-heart UI. The repository import rule says `world/` may read values and systems, while UI is the upper composition layer.
- Failure: gameplay/world modules own direct knowledge of presentation classes. A UI replacement or UI-only import failure can break world initialization, and the same scene lifecycle now has two competing composition boundaries.
- Why it persists: `PlayScene` was split into modules without fully moving composition into the UI layer. `PLAY_SCENE_UI_FACTORIES` already exists, but several direct imports bypass that seam.
- Permanent solution: make world modules depend on injected UI factories or narrow view interfaces only. Keep UI class imports in the UI composition boundary, add an import-direction lint gate, and reject `world/** -> ui/**` imports in CI.
- Verification contract: the active import graph must contain no world-to-UI implementation imports; PlayScene startup must still construct all required views through the injected factory contract.
