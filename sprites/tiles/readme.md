# Tile sprites

Image-authored tile and ground-recognition assets live here.

- `resource-tiles-imagegen-v3/` contains the current isolated legacy-renderer
  resource textures. They remain rollback-only because that renderer has one
  terrain layer and cannot display a transparent overlay without a ground hole.
- `resource-overlays-imagegen-v4/` supplies the retained approved Bronze,
  Steel, Magma Crystal, and Stone source art.
- `resource-ground-veins-imagegen-v6-2d/` contains the current inspectable
  six-frame, transparent 188 px ImageGen references for every resource. The
  packed semantic and recognition atlases are the production render paths.
- `resource-overlays-imagegen-v5-2d/` is the immediate rollback for the
  superseded isolated-symbol treatment.
- `special-tiles-imagegen-v3/` and `special-tiles-imagegen-v4/` contain
  versioned special-tile candidates and approved derivatives.
- `base-tiles/`, `dynamic-soil/`, `second-world/`, `tiles-under-1000/`, and
  `approved-world/` retain their existing terrain responsibilities.

New image-generated runtime art must use a versioned sibling folder, document
its source and promotion state locally, and never replace gameplay authority.
