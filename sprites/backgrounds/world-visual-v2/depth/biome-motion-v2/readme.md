# Biome moving-image runtime V2

These ten WebM files are finished underground background images with motion
encoded into their pixels. They are not effect textures and Phaser does not
draw procedural motion over them.

- 1536 × 1024
- VP9, `yuv420p`
- 24 fps
- four-second seamless loop
- silent
- one moving plate per underground biome

The builder validates the codec, dimensions, duration, byte size, exact output
inventory and unique SHA-256 hashes, then writes
`2026-07-26-baked-motion-runtime-manifest-v2.json`.

Runtime streams the active biome pool and places videos at backdrop depth
`-6.4`. It pauses them when `?biomeBackdropMotion=0` or runtime FPS falls below
the configured floor. Authoritative terrain and collision remain unchanged in
front of the video.
