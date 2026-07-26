# Source

ImageGen source files for Arc Core review v3.

- `*-chroma.png` files are untouched generated originals.
- `*-alpha.png` files are chroma-keyed intermediates.
- The stage background has no alpha requirement.

Runtime code must not load files from this directory.
