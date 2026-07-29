const TITAN_PREVIEW_STAGES = Object.freeze([
  Object.freeze({ id: "sealed", clearedRatio: 0 }),
  Object.freeze({ id: "glowing-cover", clearedRatio: 0.25 }),
  Object.freeze({ id: "one-before-half", beforeThreshold: true }),
  Object.freeze({ id: "half-auto-clear", threshold: true }),
]);

function cellKey(cell) {
  return `${cell.tx},${cell.ty}`;
}

function getTitanDiscoverySystem(scene) {
  return scene.worldRenderer?.titanDiscoverySystem
    || scene.worldVisualRuntime?.titanDiscoverySystem
    || null;
}

function applyDugCells(scene, cells) {
  const applied = scene.worldModel?.applyDugTileKeys?.(
    cells.map(cellKey)
  ) || [];
  for (const cell of applied) {
    scene.worldRenderer?.applyTileUpdate?.(cell.tx, cell.ty);
  }
  getTitanDiscoverySystem(scene)?.refresh?.();
  return applied.length;
}

function findObserverCell(view) {
  const covering = new Set(view.coverageCells.map(cellKey));
  return view.zone.cells
    .filter(cell => !covering.has(cellKey(cell)))
    .sort((left, right) => {
      const leftDistance = Math.abs(left.tx - view.zone.centerXTile)
        + Math.abs(left.ty - view.zone.centerYTile);
      const rightDistance = Math.abs(right.tx - view.zone.centerXTile)
        + Math.abs(right.ty - view.zone.centerYTile);
      return leftDistance - rightDistance
        || left.ty - right.ty
        || left.tx - right.tx;
    })[0] || null;
}

export function createTitanE2EPreviewController(
  scene,
  { closeUi = null, forcePlayer = null } = {}
) {
  let stageIndex = -1;
  let targetId = "";

  const advance = () => {
    const system = getTitanDiscoverySystem(scene);
    const view = system?.zoneViews?.find(candidate => (
      candidate.definition.id === targetId
    )) || system?.zoneViews?.find(candidate => (
      candidate.coverageValid && !candidate.discovered
    ));
    if (!view) {
      console.warn("[JkdE2EHarness] No undiscovered Titan preview is available");
      return null;
    }

    targetId = view.definition.id;
    stageIndex = Math.min(
      stageIndex + 1,
      TITAN_PREVIEW_STAGES.length - 1
    );
    const stage = TITAN_PREVIEW_STAGES[stageIndex];
    const total = view.coverageCells.length;
    const required = view.coverageRequired || Math.ceil(total / 2);
    const clearTarget = stage.threshold
      ? required
      : stage.beforeThreshold
        ? Math.max(0, required - 1)
        : Math.floor(total * stage.clearedRatio);
    const observer = findObserverCell(view);

    closeUi?.();
    if (observer) applyDugCells(scene, [observer]);
    applyDugCells(scene, view.coverageCells.slice(0, clearTarget));
    forcePlayer?.(observer || {
      tx: view.zone.centerXTile,
      ty: view.zone.centerYTile,
    });
    system.refresh?.();

    const expectedRemaining = stage.threshold
      ? 0
      : Math.max(0, total - clearTarget);
    console.info(
      `[JkdE2EHarness] Titan preview ${view.definition.index}/25 `
      + `${stage.id}: expected covering tiles=${expectedRemaining}`
    );
    scene.time?.delayedCall?.(180, () => {
      const snapshot = system.getSnapshot?.();
      const zone = snapshot?.zones?.find(entry => entry.id === targetId);
      console.info(
        `[JkdE2EHarness] Titan runtime ${stage.id}: `
        + `covering=${zone?.coverageRemaining ?? "unavailable"} `
        + `glowing=${snapshot?.coverGlow?.visibleTiles ?? "unavailable"} `
        + `discovered=${zone?.discovered === true}`
      );
    });
    return {
      titanId: targetId,
      titanIndex: view.definition.index,
      stage: stage.id,
      total,
      expectedRemaining,
    };
  };

  return Object.freeze({ advance });
}
