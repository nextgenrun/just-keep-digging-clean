# Compact startup assets

Derived WebP encodings of runtime images, preserving source pixel dimensions and alpha. Originals remain in their authored directories. The generated mapping in values/startupImageVariants.js controls use; rebuilding and size evidence are in testing/2026-09-08-startup.

`understar-logo-light.mp4` is the approved 21.667-second moving-light overlay, encoded at 960x284 / 30 fps / H.264 CRF 28 with faststart. It retains playbackRate 1 and the original loop timing. Its 152,691 bytes stream independently of the required asset queue.
