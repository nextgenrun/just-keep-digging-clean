# Source

Accepted ImageGen source files for Arc Core production v3.

- `*-chroma.png` files are untouched generated originals.
- `*-alpha.png` files are chroma-keyed intermediates.
- The stage background has no alpha requirement.
- The rejected four-tile atlas and ornamental frame are archived outside this
  production package.

Runtime code must not load files from this directory.
