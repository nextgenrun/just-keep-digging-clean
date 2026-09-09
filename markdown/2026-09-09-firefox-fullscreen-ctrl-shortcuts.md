# Firefox fullscreen and Ctrl shortcut correction

The September 8 hotpatch incorrectly required Keyboard Lock before requesting native fullscreen. Firefox therefore got only the CSS viewport fallback. The entry page now requests native fullscreen independently and keeps it when optional Keyboard Lock is unavailable or denied.

Phaser deliberately does not prevent browser defaults for modified keys. PlayerInputHandler now cancels Ctrl shortcuts for registered keys while Run is held during active gameplay, after Phaser updates its key state. Main-world and cave controllers share this handler. The listener is removed on teardown and follows current key bindings. No movement values changed.

Validation: browser-controls-regression passes native-fullscreen cases with missing, successful and denied keyboard lock; shortcut modifiers, rebinds and teardown pass. Required jump/flight suite passes all 33 traversal regressions. Real Phaser browser fixture receives Ctrl+D and Ctrl+S with defaultPrevented=true, Run and corresponding direction down, followed by clean release.

Coverage limit: available browser is Codex's Chromium-based embedded browser. It does not reproduce Firefox's browser chrome/bookmark UI. Native fullscreen is covered by API-contract tests, not a verified Firefox desktop session. Full game local startup was still loading, so the browser input evidence uses a focused real-Phaser scene.

Changed runtime files: index.html and world/playScene/PlayerInputHandler.js. Local only; no live uploads made. A live hotpatch must preserve the deployed HTML's production bootstrap, regenerate any gzip sidecars and address existing browser caches.
