# PERSIST-010: Audio preload and runtime library catalogs drift

Severity: `P3`
Status: confirmed active metadata and duplication defect; playback currently key-based
Area: audio loading and library ownership

## Evidence

- `ui/scenes/BootScene.js:1202-1215` queues the sound effects as `.ogg` files with concrete names such as `dig-1.ogg`, `footstep-3.ogg`, and the long tile-break filename.
- `sound/SoundSystem.js:414-445` independently loops hardcoded counts and records `.wav` paths such as `dig-0.wav`, `footstep-0.wav`, `tileBreak-0.wav`, `tileHit-0.wav`, and a `.wav` star-dig path.
- The same method expects seven dig files and four footsteps even though BootScene currently queues two dig keys and three footstep keys. Cache checks prevent all nonexistent keys from entering the pool, but the catalog metadata remains false for every recorded entry.
- `ui/scenes/BootScene.js:1218-1365` and `sound/SoundSystem.js:456-570` separately repeat the voice-line filename lists and key-generation rules.
- `sound/SoundLibraryManager.js:78-108` currently plays by cache key, so the stale paths do not immediately break playback. Any exporter, admin panel, loader, or future path-based consumer will receive wrong references.

## Impact

The repository has multiple authorities for the same sound catalog. A new file can be preloaded but omitted from the runtime pool, or added to the runtime list without being preloaded. Logs and diagnostics report filenames and paths that do not exist, making real missing-audio failures harder to diagnose.

## Permanent solution setup

- Define one audio manifest containing cache key, relative path, category, and display filename.
- Make BootScene preload from that manifest and make SoundSystem populate libraries from the same records after cache completion.
- Remove hardcoded counts and duplicated voice-line arrays from SoundSystem.
- Validate every manifest path against the filesystem/build output and every manifest key against the Phaser cache before exposing the pool.
- Add a consistency gate that compares queued keys, runtime library keys, and recorded paths, including extension and basename checks.

