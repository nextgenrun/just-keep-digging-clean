# XP Gathering V2 Source

`xp-glyph-library-v2-source.png` was created with the Codex built-in image
generator on 2026-08-31, using the three V1 XP glyphs as style references. The
prompt requested an exact 3×3 emerald-and-gold XP atlas: three routine motes,
three grouped-reward glyphs, two premium seals, and one level-up crown.

The first generated atlas baked a neutral checkerboard and was rejected. A
background-extraction edit preserved the nine glyphs and replaced only that
background with genuine RGBA transparency. The runtime builder performs only
cell extraction, alpha-bounds validation, one high-quality downsample, centering,
hashing, and review-board composition. It applies the same bounded carrier build
to the three untouched V1 masters so runtime can use one consistent 256 px pack.
