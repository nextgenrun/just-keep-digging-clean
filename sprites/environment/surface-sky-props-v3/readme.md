# Surface and Sky Props V3

Two hundred painterly prop frames forming the upper-world asset palette:

- 140 Level 2 surface props across Arrival Forge, Caravan Rest, Starwell Herb
  Court, Timberwright Yard, Heavenblocks Observatory, Frontier Survey Garden,
  and Far-East Expedition Overlook.
- 60 sky props across the two V11 portal islands, Cloud Reef, Angel
  Heavenblock, and Devil Eclipse Scar.

Runtime loads the lossless-alpha atlas WebPs and JSON frame maps in this folder,
then selects only the sparse hand-authored composition defined under `values/`.
The chroma-key ImageGen sheets and alpha-master PNGs live under `sources/` as
build provenance and are never preloaded.

All objects are presentation-only. The world grid continues to own collision,
portals, arrivals, Titan state, interaction anchors, saves, and progression.
Full rendered bounds must remain outside Titan, portal, arrival, altar, and
shrine clear zones. Props remain static after creation.

Use `?surfaceSkyPropsV3=0` for the complete additive rollback,
`?surfacePropsV3=0` for surface-only rollback, and `?skyPropsV3=0` for sky-only
rollback.
