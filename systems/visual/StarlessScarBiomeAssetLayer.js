import { STARLESS_SCAR_BIOME_PALETTES } from
  "../../values/starlessScarBiomePalettes.js";
import { resolveStarScarBoundaryEdges } from
  "../environment/starScarTerritory.js";
import { StarlessScarPaletteView } from "./StarlessScarPaletteView.js";

function groupByPalette(items) {
  const groups = new Map();
  for (const item of items) {
    if (!item?.paletteId) continue;
    const group = groups.get(item.paletteId) || [];
    group.push(item);
    groups.set(item.paletteId, group);
  }
  return groups;
}

export class StarlessScarBiomeAssetLayer {
  constructor(scene, assetCache, visual) {
    this.scene = scene;
    this.assetCache = assetCache;
    this.visual = visual;
    this.views = new Map();
  }

  _getView(paletteId) {
    let view = this.views.get(paletteId);
    if (view) return view;
    const palette = STARLESS_SCAR_BIOME_PALETTES.paletteById[paletteId];
    if (!palette) return null;
    view = new StarlessScarPaletteView(
      this.scene,
      this.assetCache,
      palette,
      this.visual,
      STARLESS_SCAR_BIOME_PALETTES.propAtlas,
    );
    this.views.set(paletteId, view);
    return view;
  }

  _prune(activeIds) {
    for (const [paletteId, view] of this.views) {
      if (activeIds.has(paletteId)) continue;
      view.destroy();
      this.views.delete(paletteId);
    }
  }

  update({
    view,
    tileSize,
    cells,
    solidCells,
    scars,
    visible,
    boundaryEdges = null,
  }) {
    const cellGroups = groupByPalette(cells);
    const solidCellGroups = groupByPalette(solidCells);
    const scarGroups = groupByPalette(scars);
    const paletteByCell = new Map(cells.map(cell => [
      `${cell.tx},${cell.ty}`,
      cell.paletteId,
    ]));
    const edges = (Array.isArray(boundaryEdges)
      ? boundaryEdges
      : resolveStarScarBoundaryEdges(cells))
      .filter(edge => edge.kind === "outer")
      .map(edge => ({
        ...edge,
        paletteId: paletteByCell.get(`${edge.cellTx},${edge.cellTy}`) || "",
      }));
    const edgeGroups = groupByPalette(edges);
    const activeIds = new Set([
      ...cellGroups.keys(),
      ...solidCellGroups.keys(),
      ...scarGroups.keys(),
      ...edgeGroups.keys(),
    ]);
    for (const paletteId of activeIds) {
      this._getView(paletteId)?.update({
        view,
        tileSize,
        cells: cellGroups.get(paletteId) || [],
        solidCells: solidCellGroups.get(paletteId) || [],
        scars: scarGroups.get(paletteId) || [],
        edges: edgeGroups.get(paletteId) || [],
        visible,
      });
    }
    this._prune(activeIds);
  }

  hasReadyRole(paletteId, role) {
    return this.views.get(paletteId)?.hasReadyRole(role) === true;
  }

  getSnapshot() {
    const palettes = [...this.views.values()].map(view => view.getSnapshot());
    return {
      paletteLibraryCount: STARLESS_SCAR_BIOME_PALETTES.paletteCount,
      visiblePaletteCount: palettes.length,
      visiblePaletteIds: palettes.map(entry => entry.paletteId),
      readyPaletteCount: palettes.filter(entry => entry.readyRoleCount === 4).length,
      visiblePaletteCenterCount: palettes.reduce(
        (total, entry) => total + entry.visibleCenterCount,
        0,
      ),
      visiblePaletteFrontierCount: palettes.reduce(
        (total, entry) => total + entry.visibleFrontierCount,
        0,
      ),
      visiblePalettePropCount: palettes.reduce(
        (total, entry) => total + entry.visiblePropCount,
        0,
      ),
      palettes,
    };
  }

  destroy() {
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
    this.scene = null;
    this.assetCache = null;
  }
}
