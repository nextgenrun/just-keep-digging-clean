# Generation selection

Six selected original assets; two targeted regenerations corrected the first forest treetop cutoff and added cloud atlas margins. Built-in imagegen produced actual native2172x724 RGBA layers and1774x887 RGB sky despite wider requested dimensions. The originals remain in the generated-images provenance paths.

Ridges and forest were visually inspected as image outputs. Alpha-channel statistics confirm transparent sky regions rather than a painted matte. Some low-alpha near-zero noise exists in nominally transparent areas; do not infer mountain anchor height from raw bounding-box minima. Use halfAlphaBBox and row alpha values. All selected pixels and generated alpha were copied intact. Cloud quadrants are1086x362; manifest frame rectangles and alpha8BBox show internal padding.

East was regenerated once more to remove high-alpha saturated blue edge contamination. Its final saturated blue outliers have maximum alpha5 and mean alpha1.09/255; the source remains untouched. Final east silhouette top at half alpha is recorded in the manifest.

An additional original island-rocks.png generation replaces remaining Heavenblocks decorative background facades. Its exact native2171x724 size is preserved. No pixel editing or resampling.

## Rich mountain and Level 2 motion revision

The current ridges replace the pale/snowy selection above with darker detailed blue crags. Two new landmark paintings add seven flowing waterfall channels at three Level 2 locations. The tool returned RGB for these transparency requests; explicit magenta matte edits were selected for runtime compositing. Source PNGs remain byte-identical to tool outputs. The prior selection manifest is preserved separately. See 2026-09-06-level2-motion-prompts.json for all prompts and sources.
