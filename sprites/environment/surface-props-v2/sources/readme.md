# Surface Props V2 Sources

This folder retains the approved surface benchmark, the existing production
scale reference, and one built-in ImageGen chroma source per additive prop.

Generation used only the references' prop craftsmanship, material finish,
orthographic side-view camera, and scale language. Every prompt explicitly
forbade copying the landscape, background, moon, sky, terrain, player, text,
or UI.

The opaque prop sources use a flat green key except the foliage-heavy herb
station, which uses a flat magenta key. Alpha masters are generated with the
installed ImageGen helper using border auto-key sampling, soft matte, despill,
transparent threshold 12, and opaque threshold 220.

`alpha-masters/` is source/provenance material. Runtime loads only the
lossless-alpha WebPs one directory above.
