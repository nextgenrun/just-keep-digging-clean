# Stellar Lance: selected Cinder variations

Open through the checkout's canonical `serve.py`: http://localhost:8080/testing/2026-09-05-lance-three-versions/index.html

The current preview develops selected direction 03 into violet, azure, ember and prismatic. It uses the actual measured jab and roundhouse contact frames; Punch / Kick and direction controls show the same extremity coordinates used in gameplay. Inspect contact freezes exactly at release. All bodies are 64 × 28 px at full opacity, with short matching echoes and straight travel at 225 px/s (85% below the original 1500 px/s study). The fourth row demonstrates the rare art; runtime rarity is 4% per shot.

Runtime integration uses `StellarLanceContactPresenter` at postupdate so the launch includes the final rendered player position. DigSystem forwards authored contact metadata. Early watchdog requests wait for the visible contact pose. The presenter temporarily protects that pose from frame catch-up and restores playback at the end of the same update; cancelled or replaced actions cannot emit a late shot. The finite mining range, damage, overkill carry, charge and lifetime rules remain authoritative. The core keeps a fixed silhouette; separate echoes retain the same shape and palette.

Current checks: `contact-contract.mjs`, `verify-contact.mjs`, and the existing `testing/2026-08-31-stellar-lance-vfx-hud-contract.mjs`. Browser evidence: `contact-browser-proof.json`, `cinder-variations.png`, and punch/kick left/right contact PNGs. `verify-gameplay.mjs` exercises real F-key mining in a fresh, save-disabled PlayScene; its results are in `gameplay-contact-proof.json` when complete.

The original three-direction artwork and `browser-proof.json` remain as historical comparison evidence. `verify.mjs` delegates to `verify-contact.mjs` for the selected design.

Artwork provenance and exact prompts: `2026-09-05-cinder-variant-prompts.md` and the original dated prompt record.

Current validation covers full opacity throughout flight, steady echoes, the visible contact frame in a save-disabled live mining strike, the four-palette punch/kick browser gallery, and VFX/HUD and contact contracts. The shared Celestial renderer and companion checks also pass.

## September 6 fist launch correction

The rear of the flame now anchors to the upper surface of the striking fist or foot, using a scale-aware offset from the measured contact marker. Previously its leading tip was anchored there, placing most of the art over the character. Runtime and gallery share the same origin resolver; the leading edge still controls subsequent impact timing and the route endpoint. Contact-frame release, fixed size, palettes and 225 px/s remain unchanged.

## September 6 crisp presentation

Celestial cores now retain full opacity and fixed size while visible. The strong flight fade, breathing distortion, mixed fire trails and impact burn residue are removed. Short echoes preserve their source palette and silhouette, sit behind the moving core, and fade smoothly on their own. Companion cores stay solid while their echoes remain quieter. Contact flashes are smaller, fixed in shape and brief. The Cinder contact gallery includes the same echo spacing and lifetime as gameplay.
