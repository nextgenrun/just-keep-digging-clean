# Surface Hero Landmarks V4

Production-ready, high-resolution transparent landmark cutouts implementing one
clear hero silhouette in every Level 2 surface chapter.

- `arrival-forge-shelter-v4.png` replaces the smaller forge anchor and its two
  overlapping workface props.
- `caravan-waystation-v4.png` unifies the former kitchen, wagon, and three
  overlapping camp props into one readable landmark.
- `starwell-portal-frame-v4.png` surrounds the existing Level 2 ground portal;
  gameplay portal rendering and interaction remain authoritative.
- `timberwright-yard-v4.png` replaces the smaller gantry plus duplicate bench
  and rope-spool silhouettes.
- `observatory-telescope-v4.png` replaces the undersized Observatory hero and
  its duplicate instrument court.
- `frontier-survey-pavilion-v4.png` replaces the survey stand and three
  overlapping survey props while retaining the garden edges.
- `three-kings-overlook-v4.png` remains one unified rear-depth architectural
  landmark rather than three independently scattered props.

The `sources/` files retain the flat chroma-key ImageGen generations. Runtime
uses only the cropped alpha-cleaned files at this directory root. Exact
physical scale, dimensions, alpha checks, and hashes live in the dated
manifest. All seven landmarks are static and presentation-only. The global
rollback is `?surfaceHeroLandmarksV4=0`; each chapter also has an independent
query switch in `values/worldVisualSurfaceHeroLandmarks.js`.