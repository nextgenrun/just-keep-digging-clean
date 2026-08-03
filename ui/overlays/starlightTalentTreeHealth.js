import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  STARLIGHT_TALENT_RESOURCE_ORDER,
  STARLIGHT_TALENT_TREE_CONFIG,
} from "../../values/starlightTalentTree.js";

export function buildStarlightTalentTreeHealth(view) {
  const expected = STARLIGHT_TALENT_TREE_CONFIG.health;
  const textureKeys = [
    ...STARLIGHT_TALENT_RESOURCE_ORDER.map(
      resourceType => ASSET_KEYS.constellations.signs[resourceType],
    ),
    ...Object.values(ASSET_KEYS.ui.starlightTalentTree),
  ];
  const missingTextures = textureKeys.filter(
    textureKey => !textureKey || !view.scene.textures?.exists?.(textureKey),
  );
  const nodeCount = view.nodeControls.filter(Boolean).length;
  const engineOptionCount = view.engineControls.filter(Boolean).length;
  const pageCount = view.pageRoots.filter(Boolean).length;
  const visiblePageCount = view.pageRoots.filter(page => page.visible).length;
  const pageNavigationCount = view.pageNavigation?.entries?.length || 0;
  const visibleBranchCardCounts = view.branchPageStates.map(
    state => state?.visibleCardCount ?? 0,
  );
  const abilityProviderReady = view.abilityAccess?.providerReady === true;
  const lockedBranchCount = STARLIGHT_TALENT_TREE_CONFIG.branches.filter(
    branch => view.abilityAccess?.[branch.id]?.unlocked !== true,
  ).length;
  const steadyMotionLoopCount = view.summaryAnimatedObjects.length;
  return {
    ready: nodeCount === expected.expectedConstellations
      && engineOptionCount === expected.expectedEngineOptions
      && pageCount === expected.expectedPages
      && visiblePageCount === 1
      && pageNavigationCount === expected.expectedPages
      && visibleBranchCardCounts.every(
        count => count === expected.expectedVisibleBranchCards,
      )
      && abilityProviderReady
      && steadyMotionLoopCount <= expected.maximumSteadyMotionLoops
      && missingTextures.length === 0,
    nodeCount,
    engineOptionCount,
    pageCount,
    visiblePageCount,
    pageNavigationCount,
    visibleBranchCardCounts,
    activePageId: STARLIGHT_TALENT_TREE_CONFIG.pages[view.pageIndex]?.id || null,
    abilityProviderReady,
    lockedBranchCount,
    steadyMotionLoopCount,
    missingTextures,
  };
}
