import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  STARLIGHT_TALENT_RESOURCE_ORDER,
  STARLIGHT_TALENT_TREE_CONFIG,
} from "../../values/starlightTalentTree.js";
import { buildStarlightEngineSummary } from "./starlightEngineDetailPresentation.js";
import { buildStarlightEnginePage } from "./starlightEnginePagePresentation.js";
import { resolveStarlightContentBounds } from "./starlightTalentLayout.js";
import { buildStarlightTalentSummary } from "./starlightTalentDetailPresentation.js";
import { createStarlightTalentPageNavigation } from "./starlightTalentPageNavigation.js";
import { buildStarlightTalentStatuses } from "./starlightTalentStatus.js";
import { buildStarlightTalentBranchPage } from "./starlightTalentTreePresentation.js";

function pageIndexForControl(controlIndex) {
  const pages = STARLIGHT_TALENT_TREE_CONFIG.pages;
  return Math.max(
    0,
    pages.findIndex(page => (
      controlIndex >= page.startIndex
      && controlIndex < page.startIndex + page.itemCount
    )),
  );
}

function pageIndexForResource(resourceType) {
  const branchIndex = STARLIGHT_TALENT_TREE_CONFIG.branches.findIndex(
    branch => branch.resourceTypes.includes(resourceType),
  );
  return Math.max(0, branchIndex);
}

export class StarlightTalentTreeView {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.parent = options.parent;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 900;
    this.height = options.height || 480;
    this.fts = options.floatingTextSystem;
    this.progression = options.progression;
    this.abilities = options.abilities;
    this.mode = options.mode || "pause";
    this.firstRevealResource = options.firstRevealResource || null;
    this.onFocus = options.onFocus || null;
    this.onEngineAction = options.onEngineAction || null;
    this.root = scene.add.container(0, 0);
    this.parent?.add?.(this.root);
    this.controls = [];
    this.nodeControls = [];
    this.engineControls = [];
    this.pageRoots = [];
    this.branchPageStates = [];
    this.summaryAnimatedObjects = [];
    this.selectionRendered = false;

    const requestedIndex = STARLIGHT_TALENT_RESOURCE_ORDER.indexOf(
      options.focusResource,
    );
    this.selectedControlIndex = requestedIndex >= 0 ? requestedIndex : 0;
    this.pageIndex = options.focusResource
      ? pageIndexForResource(options.focusResource)
      : pageIndexForControl(this.selectedControlIndex);
    this.pageSelections = STARLIGHT_TALENT_TREE_CONFIG.pages.map(
      page => page.startIndex,
    );
    this.pageSelections[this.pageIndex] = this.selectedControlIndex;
    this._build();
    this.selectControl(this.selectedControlIndex);
  }

  _build() {
    const layout = STARLIGHT_TALENT_TREE_CONFIG.layout;
    this.pageBounds = {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
    this.contentBounds = resolveStarlightContentBounds(this.pageBounds, layout);
    this.layoutScale = Math.max(
      layout.minimumLayoutScale,
      Math.min(
        1,
        this.contentBounds.width / layout.referenceWidthPx,
        this.contentBounds.height / layout.referenceHeightPx,
      ),
    );
    this._readProgress();

    STARLIGHT_TALENT_TREE_CONFIG.pages.forEach(() => {
      const pageRoot = this.scene.add.container(0, 0);
      this.root.add(pageRoot);
      this.pageRoots.push(pageRoot);
    });
    STARLIGHT_TALENT_TREE_CONFIG.branches.forEach((branch, pageIndex) => {
      buildStarlightTalentBranchPage(
        this,
        branch,
        pageIndex,
        this.pageRoots[pageIndex],
      );
    });
    buildStarlightEnginePage(this, this.pageRoots[2]);
    this.summaryRoot = this.scene.add.container(0, 0);
    this.root.add(this.summaryRoot);
    this.pageNavigation = createStarlightTalentPageNavigation(this);
    this.branchPageStates.forEach((state, pageIndex) => {
      const page = STARLIGHT_TALENT_TREE_CONFIG.pages[pageIndex];
      state?.setSelected?.(
        this.pageSelections[pageIndex] - page.startIndex,
        { immediate: true },
      );
    });
    const enginePage = STARLIGHT_TALENT_TREE_CONFIG.pages[2];
    this.enginePageState?.setSelected?.(
      this.pageSelections[2] - enginePage.startIndex,
      { immediate: true },
    );
  }

  _readProgress() {
    const data = this.fts?.getConstellationData?.() || {};
    const counts = this.fts?.getConstellationCounts?.() || {};
    const unlockedResources = this.fts?.getUnlockedConstellations?.() || [];
    const relicCount = this.fts?.getAncientRelicCount?.()
      ?? this.scene.ancientRelicSystem?.getCount?.()
      ?? 0;
    this.data = data;
    const talentState = buildStarlightTalentStatuses({
      data,
      counts,
      unlockedResources,
      relicCount,
      abilities: this.abilities,
    });
    this.statuses = talentState.statuses;
    this.abilityAccess = talentState.abilityAccess;
    this.snapshot = this.progression?.getSnapshot?.() || {
      unlockedEngines: [],
      selectedEngine: null,
      availableHearts: 0,
      constellationCount: unlockedResources.length,
      requiredConstellations: STARLIGHT_TALENT_RESOURCE_ORDER.length,
      engineCount: 0,
      allEnginesUnlocked: false,
      godMode: false,
    };
  }

  _applyPageVisibility() {
    this.pageRoots.forEach((pageRoot, pageIndex) => {
      const visible = pageIndex === this.pageIndex;
      this.scene.tweens?.killTweensOf?.(pageRoot);
      pageRoot.setVisible(visible).setAlpha(1);
    });
    this.nodeControls.forEach((control, index) => {
      control?.setPageVisible?.(pageIndexForControl(index) === this.pageIndex);
    });
    this.engineControls.forEach((control, index) => {
      control?.setPageVisible?.(
        pageIndexForControl(STARLIGHT_TALENT_RESOURCE_ORDER.length + index)
          === this.pageIndex,
      );
    });
    this.summaryRoot?.setVisible?.(true);
    this.pageNavigation?.setActive?.(this.pageIndex);
  }

  _updateActivePagePresentation() {
    const page = STARLIGHT_TALENT_TREE_CONFIG.pages[this.pageIndex];
    const selectedOffset = this.selectedControlIndex - page.startIndex;
    if (this.pageIndex < 2) {
      this.branchPageStates[this.pageIndex]?.setSelected?.(selectedOffset);
    } else {
      this.enginePageState?.setSelected?.(selectedOffset);
    }
  }

  selectControl(index) {
    const safeIndex = Math.max(0, Math.min(this.controls.length - 1, index));
    if (this.selectionRendered && safeIndex === this.selectedControlIndex) {
      return safeIndex;
    }
    const nextPageIndex = pageIndexForControl(safeIndex);
    this.pageIndex = nextPageIndex;
    this.pageSelections[this.pageIndex] = safeIndex;
    this.selectedControlIndex = safeIndex;
    this.nodeControls.forEach((control, controlIndex) => {
      control?.setSelected?.(controlIndex === safeIndex);
    });
    this.engineControls.forEach((control, controlIndex) => {
      control?.setSelected?.(
        STARLIGHT_TALENT_RESOURCE_ORDER.length + controlIndex === safeIndex,
      );
    });
    this._applyPageVisibility();
    this._updateActivePagePresentation();

    if (safeIndex < STARLIGHT_TALENT_RESOURCE_ORDER.length) {
      this.selectedResource = STARLIGHT_TALENT_RESOURCE_ORDER[safeIndex];
      buildStarlightTalentSummary(this);
    } else {
      this.selectedResource = null;
      buildStarlightEngineSummary(this, safeIndex - STARLIGHT_TALENT_RESOURCE_ORDER.length);
    }
    this.selectionRendered = true;
    return safeIndex;
  }

  setPage(index, options = {}) {
    const safePageIndex = Math.max(
      0,
      Math.min(STARLIGHT_TALENT_TREE_CONFIG.pages.length - 1, index),
    );
    const controlIndex = this.pageSelections[safePageIndex]
      ?? STARLIGHT_TALENT_TREE_CONFIG.pages[safePageIndex].startIndex;
    const selectedIndex = this.selectControl(controlIndex);
    if (options.notify) this.onFocus?.(selectedIndex);
    return selectedIndex;
  }

  moveSelection(dx, dy) {
    if (dy) {
      const nextPage = Math.max(
        0,
        Math.min(
          STARLIGHT_TALENT_TREE_CONFIG.pages.length - 1,
          this.pageIndex + Math.sign(dy),
        ),
      );
      return this.setPage(nextPage);
    }
    const page = STARLIGHT_TALENT_TREE_CONFIG.pages[this.pageIndex];
    const offset = this.selectedControlIndex - page.startIndex;
    const direction = Math.sign(dx || 0);
    const nextOffset = direction
      ? (offset + direction + page.itemCount) % page.itemCount
      : offset;
    return this.selectControl(page.startIndex + nextOffset);
  }

  activateSelected() {
    return this.controls[this.selectedControlIndex]?.activate?.() || false;
  }

  addSummaryText(x, y, value, style, originX = 0, originY = 0) {
    const text = this.scene.add.text(x, y, value, style).setOrigin(originX, originY);
    this.summaryRoot.add(text);
    return text;
  }

  clearSummary() {
    this.summaryAnimatedObjects.forEach(
      object => this.scene.tweens?.killTweensOf?.(object),
    );
    this.summaryAnimatedObjects = [];
    this.summaryRoot?.removeAll?.(true);
  }

  trackSummaryAnimation(object) {
    if (object) this.summaryAnimatedObjects.push(object);
    return object;
  }

  getControls() {
    return [...this.controls];
  }

  getHealthSnapshot() {
    const expected = STARLIGHT_TALENT_TREE_CONFIG.health;
    const textureKeys = [
      ...STARLIGHT_TALENT_RESOURCE_ORDER.map(
        resourceType => ASSET_KEYS.constellations.signs[resourceType],
      ),
      ...Object.values(ASSET_KEYS.ui.starlightTalentTree),
    ];
    const missingTextures = textureKeys.filter(
      textureKey => !textureKey || !this.scene.textures?.exists?.(textureKey),
    );
    const nodeCount = this.nodeControls.filter(Boolean).length;
    const engineOptionCount = this.engineControls.filter(Boolean).length;
    const pageCount = this.pageRoots.filter(Boolean).length;
    const visiblePageCount = this.pageRoots.filter(page => page.visible).length;
    const pageNavigationCount = this.pageNavigation?.entries?.length || 0;
    const visibleBranchCardCounts = this.branchPageStates.map(
      state => state?.visibleCardCount ?? 0,
    );
    const abilityProviderReady = this.abilityAccess?.providerReady === true;
    const lockedBranchCount = STARLIGHT_TALENT_TREE_CONFIG.branches.filter(
      branch => this.abilityAccess?.[branch.id]?.unlocked !== true,
    ).length;
    const steadyMotionLoopCount = this.summaryAnimatedObjects.length;
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
      activePageId: STARLIGHT_TALENT_TREE_CONFIG.pages[this.pageIndex]?.id || null,
      abilityProviderReady,
      lockedBranchCount,
      steadyMotionLoopCount,
      missingTextures,
    };
  }

  destroy() {
    this.clearSummary();
    this.pageRoots.forEach(page => this.scene.tweens?.killTweensOf?.(page));
    this.pageNavigation?.destroy?.();
    this.branchPageStates.forEach(state => state?.destroy?.());
    this.enginePageState?.destroy?.();
    this.controls.forEach(control => control?.destroy?.());
    this.root?.destroy?.(true);
    this.controls = [];
    this.nodeControls = [];
    this.engineControls = [];
    this.pageRoots = [];
  }
}
