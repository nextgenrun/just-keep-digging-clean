# Worldroot runtime art v3

This is the active Town Worldroot art package. The living and consumed PNGs
share one 1536 x 1024 RGBA canvas, so a consumed biome can rot the exact same
silhouette without shifting branches, platforms, the hearth, or the Crown.

The composition is deliberately asymmetrical. A compact heavy base occupies
the lower-left and contains the real Campfire hearth plus a separate Celestial
Talent shrine. The rest cantilevers upward and right into broad inspectable
branch roads, ending at the giant blue Crown Star. The lower-right is transparent
so the existing Titan promenade remains open. At the live placement, the base
ends at tile 26.82, Titan #1 begins at tile 27.90, the lowest canopy detail is
1.49 tiles above the tallest surfaced statue, and the Titan depth stays in front.

`source/imagegen-living-checker-source.png` and
`source/imagegen-consumed-checker-source.png` preserve the untouched ImageGen
outputs. The living prompt direction requested a transparent, wide 2D game
asset: one immense ancient cosmic tree, compact rooted sanctuary at lower-left,
large irregular horizontal branch districts, distinct biome architecture, a
clear lower-right Titan corridor, and one huge blue endgame star. The consumed
direction retained the exact composition while blackening, withering, and
extinguishing that living mini-world. The generator painted a neutral checker,
so those source files are not loaded by the game.

Rebuild the runtime pair with:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools\buildWorldrootV2RuntimeAssets.mjs worldroot-v3
```

The builder removes only connected checker components, applies one shared alpha
to both states, and validates the outputs. `worldroot-contact-grid-v3.png`
records the normalized placement used by the thirteen authored one-way contacts
in `values/worldroot.js`; contacts must remain on thick visible branch tops.
