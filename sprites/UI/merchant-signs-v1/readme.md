# Merchant signs v1

Six custom merchant signs authored through built-in image_gen on 2026-09-05, with each merchant name and normal shop action baked into the artwork. All six are enabled in the game. Exact prompts and original output paths are in prompts.json; manifest.json records source and runtime hashes, dimensions, transparency, and verification evidence.

The generated source PNGs remain unchanged. After explicit user approval, ai-tools/2026-09-05-build-merchant-sign-cutouts.py removed only pale background pixels connected to the outside, retaining enclosed lettering and highlights. The cropped alpha masters retain the original RGB pixels; the 768-pixel runtime PNGs use premultiplied resizing and clear transparent margins. Build settings live in values/merchantSignArtBuild.json.

values/merchantSignArt.js owns the enabled flag, texture paths and layout. BootScene preloads the six runtime PNGs; MerchantPromptView displays them without runtime name/action text overlays. A separate key badge follows control rebinding, and a separate row preserves timed merchant-rush messages. Missing artwork falls back to the existing approved prompt.

The focused contract verifies RGBA assets, unchanged source hashes, baked-only labels, rebinds, event countdowns, viewport bounds, modal hiding, fallback and cleanup. The canonical serve.py browser check visited all six merchants, opened every shop with E, verified menu hiding and renderer teardown, and recorded 59-60 fps with no warning/error logs. Molten uses the existing Level Two gate and was reached through the local review hotkey.

Open review.html for the complete family at detail and gameplay reference sizes.
