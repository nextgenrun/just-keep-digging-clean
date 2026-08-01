# V7 enhancer sources

`chroma/` preserves the native 1536 x 1024 ImageGen outputs. `alpha/` contains
the review PNGs after supported soft-matte chroma removal, despill, and the
additional frame-edge falloff.

Runtime does not load either source folder. It loads the compressed alpha WebP
files under the scenic world depth asset library.
