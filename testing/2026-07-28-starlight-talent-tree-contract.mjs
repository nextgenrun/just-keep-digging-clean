import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { StarTalentRevealState } from "../systems/visual/StarTalentRevealState.js";
import { evaluateRuntimeCanaries } from "../systems/health/runtimeCanaryChecks.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  STARLIGHT_TALENT_RESOURCE_ORDER,
  STARLIGHT_TALENT_TREE_CONFIG,
} from "../values/starlightTalentTree.js";
import { RUNTIME_CANARY_CONFIG } from "../values/runtimeCanaryConfig.js";

assert.equal(STARLIGHT_TALENT_TREE_CONFIG.branches.length, 2);
assert.equal(STARLIGHT_TALENT_TREE_CONFIG.pages.length, 3);
assert.deepEqual(
  STARLIGHT_TALENT_TREE_CONFIG.pages.map(page => page.itemCount),
  [5, 5, 3],
);
assert.equal(STARLIGHT_TALENT_TREE_CONFIG.health.expectedPages, 3);
assert.equal(STARLIGHT_TALENT_RESOURCE_ORDER.length, 10);
assert.equal(new Set(STARLIGHT_TALENT_RESOURCE_ORDER).size, 10);
assert.equal(STARLIGHT_TALENT_TREE_CONFIG.health.expectedEngineOptions, 3);
assert.equal(
  STARLIGHT_TALENT_TREE_CONFIG.health.maximumSteadyMotionLoops,
  1,
  "the open tree must keep a one-loop steady-motion budget",
);
assert.equal(
  STARLIGHT_TALENT_TREE_CONFIG.branches
    .flatMap(branch => branch.resourceTypes)
    .length,
  STARLIGHT_TALENT_RESOURCE_ORDER.length,
);
for (const resourceType of STARLIGHT_TALENT_RESOURCE_ORDER) {
  assert.ok(ASSET_KEYS.constellations.signs[resourceType]);
}
assert.ok(
  STARLIGHT_TALENT_TREE_CONFIG.layout.nodeHeightPx >= 210,
  "the five-card branch page must retain the large approved card treatment",
);
assert.equal(
  STARLIGHT_TALENT_TREE_CONFIG.layout.carouselVisibleCards,
  3,
  "each branch must show only three widely separated cards at once",
);
assert.ok(
  STARLIGHT_TALENT_TREE_CONFIG.layout.foundationAspectRatio > 2.3,
  "the runtime foundation must be authored for the ultra-wide host ratio",
);
assert.ok(
  STARLIGHT_TALENT_TREE_CONFIG.layout.nodeWidthPx >= 150,
  "carousel cards must retain their large authored treatment",
);
assert.ok(
  STARLIGHT_TALENT_TREE_CONFIG.layout.engineArtMaxPx >= 110,
  "the dedicated Engine page must not regress to footer-sized medallions",
);
const starlightTextureKeys = ASSET_KEYS.ui.starlightTalentTree;
assert.equal(Object.keys(starlightTextureKeys).length, 29);
assert.deepEqual(
  Object.keys(starlightTextureKeys).sort(),
  Object.keys(STARLIGHT_TALENT_TREE_CONFIG.assets.files).sort(),
);
const starlightManifest = JSON.parse(await readFile(
  new URL(
    "../sprites/UI/starlight-talent-tree-v3/manifest-v3.json",
    import.meta.url,
  ),
  "utf8",
));
assert.equal(Object.keys(starlightManifest.assets).length, 29);
assert.deepEqual(
  Object.values(STARLIGHT_TALENT_TREE_CONFIG.assets.files).sort(),
  Object.keys(starlightManifest.assets).sort(),
  "Boot preload names and the hash-pinned ImageGen inventory must stay exact",
);
assert.equal(
  starlightManifest.assets["starlight-ultrawide-foundation-v3.png"].mode,
  "RGB",
);
assert.equal(
  starlightManifest.assets["starlight-ultrawide-foundation-v3.png"].width,
  1939,
);
assert.equal(
  starlightManifest.assets["starlight-ultrawide-foundation-v3.png"].height,
  811,
);
for (const alphaAssetName of [
  "star-heart-ui-v2.png",
  "wayward-star-ui-v2.png",
  "hollow-sun-ui-v2.png",
  "comet-engine-ui-v2.png",
  "constellation-crest-v2.png",
  "celestial-close-v2.png",
  "navigation-plaque-idle-v3.png",
  "navigation-plaque-selected-v3.png",
  "talent-ribbon-idle-v3.png",
  "talent-ribbon-selected-v3.png",
  "status-seal-v3.png",
  "progress-plaque-v3.png",
  "carousel-left-v3.png",
  "carousel-right-v3.png",
  "carousel-step-idle-v3.png",
  "carousel-step-active-v3.png",
]) {
  assert.equal(starlightManifest.assets[alphaAssetName].mode, "RGBA");
  assert.deepEqual(
    starlightManifest.assets[alphaAssetName].alphaExtrema,
    [0, 255],
  );
}

const values = new Map();
const storage = {
  getItem(key) {
    return values.get(key) ?? null;
  },
  setItem(key, value) {
    values.set(key, String(value));
  },
};
const reveal = new StarTalentRevealState({ storage, saveSlot: 2 });
assert.equal(reveal.queueFirstStar({ resourceType: "dirt", count: 1 }), true);
assert.equal(reveal.queueFirstStar({ resourceType: "dirt", count: 1 }), false);
assert.equal(reveal.queueFirstStar({ resourceType: "stone", count: 2 }), false);
assert.equal(reveal.peekPending(), "dirt");
assert.equal(reveal.markShown("dirt"), true);
assert.deepEqual(reveal.getSnapshot(), { seen: ["dirt"], pending: [] });

const reloadedReveal = new StarTalentRevealState({ storage, saveSlot: 2 });
assert.equal(
  reloadedReveal.queueFirstStar({ resourceType: "dirt", count: 1 }),
  false,
  "a material section must only auto-open once for a save slot",
);
assert.equal(
  reloadedReveal.queueFirstStar({ resourceType: "stone", count: 1 }),
  true,
  "the first star of another material section must still reveal",
);
assert.equal(
  new StarTalentRevealState({ storage, saveSlot: 3 })
    .queueFirstStar({ resourceType: "dirt", count: 1 }),
  true,
  "first-star reveal history must stay isolated per save slot",
);

function evaluateTalentHealth(ready) {
  const scene = {
    sys: { settings: { key: "PlayScene" }, isActive: () => true },
    scene: { isActive: () => true },
    starPillarSystem: {
      getTalentTreeHealthSnapshot: () => ({
        ready,
        nodeAssetCount: ready ? 10 : 9,
        engineOptionCount: 3,
        missingTextures: ready ? [] : ["constellation-sign-dirt"],
      }),
    },
  };
  return evaluateRuntimeCanaries(
    {
      canvas: { isConnected: true },
      loop: { frame: 2, actualFps: 60, running: true, inFocus: true },
      scene: { getScenes: () => [scene], scenes: [scene] },
    },
    {
      noActiveSinceMs: null,
      lastFrame: 1,
      lastFrameChangedAtMs: 0,
      activeSinceByScene: new Map([["PlayScene", 0]]),
    },
    RUNTIME_CANARY_CONFIG.scenes.PlayScene.settleMs + 1,
    false,
  );
}

assert.equal(
  evaluateTalentHealth(true).findings.some(
    finding => finding.code === RUNTIME_CANARY_CONFIG.events.talentTreeInvariant,
  ),
  false,
);
assert.equal(
  evaluateTalentHealth(false).findings.some(
    finding => finding.code === RUNTIME_CANARY_CONFIG.events.talentTreeInvariant,
  ),
  true,
  "the runtime canary must alert when the shared tree or one of its assets breaks",
);

const [
  pauseSource,
  setupSource,
  pillarSource,
  treeSource,
  engineCardSource,
  nodeSource,
  presentationSource,
  detailSource,
  bootSource,
  modalSource,
  harnessSource,
  navigationSource,
  enginePageSource,
  carouselSource,
  engineDetailSource,
  layoutSource,
  uiKitSource,
] = await Promise.all([
  readFile(new URL("../world/playScene/PlaySceneUI.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/StarPillarSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/StarlightTalentTreeView.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/StarlightEngineOptionCard.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/StarlightTalentNode.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/starlightTalentTreePresentation.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/starlightTalentDetailPresentation.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/UiModalShell.js", import.meta.url), "utf8"),
  readFile(
    new URL(
      "./2026-07-28-starlight-talent-tree-visual-harness.js",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../ui/overlays/starlightTalentPageNavigation.js",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../ui/overlays/starlightEnginePagePresentation.js",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../ui/overlays/starlightCarouselPresentation.js",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../ui/overlays/starlightEngineDetailPresentation.js",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../ui/overlays/starlightTalentLayout.js",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(new URL("../ui/PhaserUiKit.js", import.meta.url), "utf8"),
]);
assert.match(pauseSource, /\{\s*key:\s*"talents",\s*label:\s*"TALENTS"/);
assert.match(pauseSource, /new StarlightTalentTreeView/);
assert.match(pauseSource, /initialTabKey/);
assert.match(pauseSource, /onVertical:\s*direction/);
assert.match(setupSource, /createStarlightTalentTreeView/);
assert.match(setupSource, /starPillarSystem\?\.onCollectedSkyStar\?\.\(detail\)/);
assert.match(pillarSource, /queueFirstStar\(detail\)/);
assert.match(pillarSource, /initialTabKey:\s*"talents"/);
assert.match(pillarSource, /firstReveal:\s*true/);
assert.match(pillarSource, /createStarlightTalentTreeView/);
assert.match(pillarSource, /skinTexture:\s*ASSET_KEYS\.ui\.starlightTalentTree\.modalShell/);
assert.match(pillarSource, /iconTexture:\s*ASSET_KEYS\.ui\.starlightTalentTree\.modalCrest/);
assert.match(pillarSource, /closeTexture:\s*ASSET_KEYS\.ui\.starlightTalentTree\.modalClose/);
assert.match(treeSource, /Object\.values\(ASSET_KEYS\.ui\.starlightTalentTree\)/);
assert.match(treeSource, /visiblePageCount\s*===\s*1/);
assert.match(treeSource, /visibleBranchCardCounts/);
assert.match(treeSource, /pageIndexForResource/);
assert.doesNotMatch(treeSource, /createPanel/);
assert.doesNotMatch(presentationSource, /\.add\.graphics/);
assert.doesNotMatch(navigationSource, /\.add\.graphics/);
assert.doesNotMatch(enginePageSource, /\.add\.graphics/);
assert.doesNotMatch(carouselSource, /\.add\.graphics/);
assert.doesNotMatch(engineDetailSource, /\.add\.graphics/);
assert.doesNotMatch(nodeSource, /createUiIcon/);
assert.doesNotMatch(detailSource, /createUiIcon/);
assert.match(nodeSource, /visibleChrome:\s*false/);
assert.match(engineCardSource, /visibleChrome:\s*false/);
assert.match(navigationSource, /visibleChrome:\s*false/);
assert.doesNotMatch(navigationSource, /underline/);
assert.match(carouselSource, /starlightTalentTree\.ultrawideFoundation/);
assert.match(carouselSource, /carouselArrowHoverTravelPx/);
assert.doesNotMatch(carouselSource, /carouselStepActive/);
assert.doesNotMatch(presentationSource, /onFocus:/);
assert.doesNotMatch(enginePageSource, /onFocus:/);
assert.doesNotMatch(navigationSource, /onFocus:/);
assert.doesNotMatch(nodeSource, /repeat:\s*-1/);
assert.doesNotMatch(engineCardSource, /repeat:\s*-1/);
assert.match(treeSource, /steadyMotionLoopCount/);
assert.match(treeSource, /clearSummary/);
assert.match(engineDetailSource, /definition\.description/);
assert.match(engineDetailSource, /definition\.capLabel/);
assert.match(layoutSource, /foundationAspectRatio/);
assert.match(nodeSource, /textures\.boboLock/);
assert.match(uiKitSource, /options\.onVertical/);
assert.match(bootSource, /starlightAssets\.basePath/);
assert.match(modalSource, /shell\.iconTexture/);
assert.match(modalSource, /shell\.closeTexture/);
assert.match(
  harnessSource,
  /params\.get\("god"\) === "1"/,
  "the visual harness must expose the production God Mode presentation state",
);
assert.match(
  harnessSource,
  /isGodModeActive:\s*\(\) => godMode/,
  "God Mode browser QA must drive the same ability-status contract as production",
);
assert.doesNotMatch(harnessSource, /UI_ICON_ATLAS/);
assert.doesNotMatch(
  `${treeSource}\n${engineCardSource}\n${presentationSource}`,
  /ASSET_KEYS\.celestialEngines/,
);
assert.match(engineCardSource, /onPress/);

console.log("starlight talent tree contract: click-only horizontal carousel, one-loop motion budget, native-ultrawide spacing, readable live-copy plaques, Engine caps, Bobo seal, first-reveal routing, and worker-backed health alerts passed");
