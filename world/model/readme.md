# Model

World layer module — model.

`WorldModel.applyHeavenblocksLayout()` writes all three islands into the same
authoritative tile arrays as the mine. `#` cells resolve to native resource
types, `A` cells are indestructible arrival shelves, `R` cells are mineable
Ancient Relic caches, `C` cells are high-HP component hearts, and `.` remains
air. The masks follow the approved facade silhouettes, so collision, mining,
rendering, relics, and core locations describe the same world.

Save restore intentionally calls `restoreHeavenblockProtectedCells()` instead
of rebuilding the islands. Only authored `A` landing cells are restored; the
adjacent entry shaft remains open, while mined material, relic, and core cells
remain air through reloads. The model also tracks all live relic-cache
coordinates for the bounded locator without scanning the full world every
frame. The layout health snapshot verifies Level 1/2 distribution, cell counts,
safe floors, and the presence-or-mined state of every native cell.
