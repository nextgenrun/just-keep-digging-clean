# Pickaxe Icons v1

Seven unique ImageGen-authored upgrade icons for the Gear Merchant:

- Bronze: hand-forged hammered head and oak/leather handle.
- Iron: industrial squared poll and forged dark-iron head.
- Steel: precision swept spike, adze, and reinforced handle spine.
- Mithril: moon-silver openwork crescents and contained cyan runes.
- Adamant: blocky black-green armor and emerald seams.
- Rune: ancient runestone hub, hooked beak, split crescent, violet grooves.
- Dragon: dragon-skull hub, horn spike, wing adze, scales, and ember seams.

Each `2026-07-28-*-chroma-source.png` is the selected built-in ImageGen output.
The matching `*-transparent-master.png` was produced with the installed
ImageGen chroma-removal helper. Runtime consumes only the normalized
`*-pickaxe-v1.png` files through `ASSET_KEYS.ui.pickaxeIcons`.

Rebuild the 256 px runtime icons, manifest, and exact-asset review sheet with:

```powershell
python ai-tools/2026-07-28-build-pickaxe-icons-v1.py
```

`pickaxe-progression-contact-sheet-v1.png` includes a 64 px readability sample
for every tier. The Phaser shop displays these assets at 34 px in list rows and
64 px in the selected-upgrade detail. If a texture is unavailable, the UI
falls back to the original generic pickaxe atlas frame.

`runtime-gear-forge-page-1-v1.png` and
`runtime-gear-forge-page-2-v1.png` are browser-captured proof from the live
Gear Forge overlay, covering all seven upgrades at their real UI sizes.

The complete prompt set is recorded in
`2026-07-28-pickaxe-imagegen-prompts.md`. These assets change presentation only;
upgrade costs, requirements, damage, ownership, and save data remain unchanged.
