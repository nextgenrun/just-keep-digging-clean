# PERSIST-009: Audio manifest type validation is missing outside the guarded loader

Severity: `P2 risk / P3 current`
Status: confirmed active conditional input defect
Area: boot-time audio loading

## Evidence

- `ui/scenes/BootScene.js:1167-1182` catches fetch and JSON parse failures, but then calls `playlistFiles.map(...)` outside the `try` block without checking that the parsed value is an array of strings.
- `ui/scenes/BootScene.js:1184-1194` assigns any successfully parsed JSON to `playerRandomFiles` without validation.
- `ui/scenes/BootScene.js:1218-1224` later calls `playerRandomFiles.forEach(...)`, outside the manifest `try` block.
- A valid JSON object, `null`, or an array containing non-string entries therefore bypasses the fallback and can throw during boot or enqueue invalid paths.
- An empty playlist array is also accepted and leaves `SoundSystem.startBackgroundMusic()` with an undefined track key.

## Impact

The deployed manifests are currently valid, but a content-only edit that produces valid malformed JSON can abort audio preload after the fetch succeeded. Because the failure is outside the guarded block, the intended fallback tracks are not used. This creates a production break from a data-shape error rather than a syntax error.

## Permanent solution setup

- Validate `response.ok` and parse into a schema requiring non-empty arrays of safe relative string filenames.
- Keep validation and fallback inside the same error boundary as fetch and JSON parsing.
- Reject path traversal, absolute URLs, empty filenames, and unsupported extensions.
- Require at least one playlist track or explicitly disable music with a typed empty-state result.
- Validate every manifest entry before calling `queueAudio`, and add fixture cases for `null`, objects, empty arrays, wrong element types, traversal strings, and valid manifests.

