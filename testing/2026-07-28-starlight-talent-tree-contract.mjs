import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

import { StarTalentRevealState } from "../systems/visual/StarTalentRevealState.js";
import { evaluateRuntimeCanaries } from "../systems/health/runtimeCanaryChecks.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { RUNTIME_CANARY_CONFIG } from "../values/runtimeCanaryConfig.js";
import { STARLIGHT_TALENT_SIGN_ART } from "../values/starlightTalentSignArt.js";
import {
  STARLIGHT_TALENT_RESOURCE_ORDER,
  STARLIGHT_TALENT_TREE_CONFIG,
} from "../values/starlightTalentTree.js";
import { PAUSE_MENU_LAYOUT } from "../values/uiLayout.js";
import { fitUiModal } from "../ui/UiModalShell.js";
import { resolveVisibleArtPlacement } from "../ui/overlays/starlightImagePlacement.js";
import { resolveStarlightContentBounds } from "../ui/overlays/starlightTalentLayout.js";

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
const layout = STARLIGHT_TALENT_TREE_CONFIG.layout;
assert.equal(
  PAUSE_MENU_LAYOUT.maxWidth,
  layout.pillarMaxWidthPx,
  "ESC and Star Pillar must give the talent tree the same authored width",
);
assert.ok(
  layout.referenceWidthPx
    <= PAUSE_MENU_LAYOUT.maxWidth - layout.immersiveInsetPx * 2,
  "the full-screen ESC host must contain the authored V4 composition width",
);
assert.ok(
  layout.referenceHeightPx
    <= PAUSE_MENU_LAYOUT.maxHeight - layout.immersiveInsetPx * 2,
  "the full-screen ESC host must contain the authored V4 composition height",
);
function pauseTalentGeometry(viewportWidth, viewportHeight) {
  const shell = fitUiModal(
    { scale: { width: viewportWidth, height: viewportHeight } },
    PAUSE_MENU_LAYOUT.maxWidth,
    PAUSE_MENU_LAYOUT.maxHeight,
  );
  const page = {
    x: 0,
    y: 0,
    width: shell.width - layout.immersiveInsetPx * 2,
    height: shell.height - layout.immersiveInsetPx * 2,
  };
  const content = resolveStarlightContentBounds(page, layout);
  return {
    shell,
    page,
    content,
    scale: Math.max(
      layout.minimumLayoutScale,
      Math.min(
        1,
        content.width / layout.referenceWidthPx,
        content.height / layout.referenceHeightPx,
      ),
    ),
  };
}
const wideEsc = pauseTalentGeometry(1280, 720);
assert.deepEqual([wideEsc.page.width, wideEsc.page.height], [1144, 656]);
assert.equal(wideEsc.scale, 1);
const compactEsc = pauseTalentGeometry(960, 640);
assert.ok(compactEsc.scale >= layout.minimumLayoutScale);
assert.ok(compactEsc.content.width <= compactEsc.page.width);
assert.ok(compactEsc.content.height <= compactEsc.page.height);
assert.deepEqual(
  layout.carouselSlotXFractions,
  [0.25, 0.5, 0.75],
  "live card centers must align to the measured foundation alcoves",
);
assert.deepEqual(
  Object.keys(STARLIGHT_TALENT_SIGN_ART).sort(),
  [...STARLIGHT_TALENT_RESOURCE_ORDER].sort(),
);
let hasMaterialCenterCorrection = false;
for (const resourceType of STARLIGHT_TALENT_RESOURCE_ORDER) {
  const art = STARLIGHT_TALENT_SIGN_ART[resourceType];
  const placement = resolveVisibleArtPlacement(
    art.sourceWidth,
    art.sourceHeight,
    art,
    layout.nodeArtMaxWidthPx,
    layout.nodeArtMaxHeightPx,
  );
  const centeredX = (
    art.x + art.width / 2 - art.sourceWidth / 2
  ) * placement.scale + placement.offsetX;
  const centeredY = (
    art.y + art.height / 2 - art.sourceHeight / 2
  ) * placement.scale + placement.offsetY;
  assert.ok(Math.abs(centeredX) < 1e-9 && Math.abs(centeredY) < 1e-9);
  hasMaterialCenterCorrection ||= Math.max(
    Math.abs(placement.offsetX),
    Math.abs(placement.offsetY),
  ) >= 8;
}
assert.equal(hasMaterialCenterCorrection, true);
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
  STARLIGHT_TALENT_TREE_CONFIG.layout.foundationAspectRatio > 1.75
    && STARLIGHT_TALENT_TREE_CONFIG.layout.foundationAspectRatio < 1.8,
  "the runtime foundation must retain the approved tall 16:9-like composition",
);
assert.ok(
  STARLIGHT_TALENT_TREE_CONFIG.layout.nodeWidthPx >= 240,
  "carousel cards must retain their large authored treatment",
);
assert.ok(
  layout.carouselFlankScale <= 0.85
    && layout.carouselFlankAlpha <= 0.75,
  "side choices must read as quiet previews instead of competing focal cards",
);
assert.ok(
  layout.detailTitleMinimumFontSizePx >= 22
    && layout.detailBodyMinimumFontSizePx >= 12
    && layout.detailMetaMinimumFontSizePx >= 10,
  "the detail dossier must retain readable minimum typography",
);
assert.ok(
  layout.nodeArtMaxWidthPx >= 200 && layout.engineArtMaxPx >= 200,
  "the dedicated Engine page must not regress to footer-sized medallions",
);
assert.ok(
  layout.detailProgressOffsetYPx
    + layout.detailXpBarOffsetYPx
    + layout.detailXpBarHeightPx / 2
    <= layout.referenceHeightPx,
  "the simplified dossier must stay inside the authored lower panel",
);
const starlightTextureKeys = ASSET_KEYS.ui.starlightTalentTree;
assert.equal(Object.keys(starlightTextureKeys).length, 29);
assert.deepEqual(
  Object.keys(starlightTextureKeys).sort(),
  Object.keys(STARLIGHT_TALENT_TREE_CONFIG.assets.files).sort(),
);
const starlightManifest = JSON.parse(await readFile(
  new URL(
    "../sprites/UI/starlight-talent-tree-v4/manifest-v4.json",
    import.meta.url,
  ),
  "utf8",
));
assert.equal(starlightManifest.runtimeAssetCount, 29);
const v4RuntimeFiles = (await readdir(new URL(
  "../sprites/UI/starlight-talent-tree-v4/",
  import.meta.url,
))).filter(fileName => fileName.endsWith(".png"));
assert.deepEqual(
  Object.values(STARLIGHT_TALENT_TREE_CONFIG.assets.files).sort(),
  v4RuntimeFiles.sort(),
  "Boot preload names and the hash-pinned ImageGen inventory must stay exact",
);
assert.equal(
  starlightManifest.foundation.file,
  "starlight-mockup-foundation-v4.png",
);
assert.equal(starlightManifest.foundation.width, 1672);
assert.equal(starlightManifest.foundation.height, 941);
assert.equal(
  starlightManifest.foundation.sha256,
  "55d30c1ff7f7ff86f20c3a5ae08d9c534eeff7d2941b0e7350a5816a2dbc519d",
);
const inheritedManifest = JSON.parse(await readFile(
  new URL(
    "../sprites/UI/starlight-talent-tree-v3/manifest-v3.json",
    import.meta.url,
  ),
  "utf8",
));
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
  assert.equal(inheritedManifest.assets[alphaAssetName].mode, "RGBA");
  assert.deepEqual(
    inheritedManifest.assets[alphaAssetName].alphaExtrema,
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
  healthSource,
  placementSource,
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
  readFile(
    new URL(
      "../ui/overlays/starlightTalentTreeHealth.js",
      import.meta.url,
    ),
    "utf8",
  ),
  readFile(
    new URL(
      "../ui/overlays/starlightImagePlacement.js",
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
assert.match(pauseSource, /setTalentImmersive\(true\)/);
assert.match(pauseSource, /width:\s*shell\.width\s*-\s*inset\s*\*\s*2/);
assert.match(pillarSource, /width:\s*this\._starShell\.width\s*-\s*inset\s*\*\s*2/);
assert.match(setupSource, /starPillarSystem\?\.onCollectedSkyStar\?\.\(detail\)/);
assert.match(pillarSource, /queueFirstStar\(detail\)/);
assert.match(pillarSource, /initialTabKey:\s*"talents"/);
assert.match(pillarSource, /firstReveal:\s*true/);
assert.match(pillarSource, /createStarlightTalentTreeView/);
assert.match(pillarSource, /skinTexture:\s*ASSET_KEYS\.ui\.starlightTalentTree\.modalShell/);
assert.match(pillarSource, /iconTexture:\s*ASSET_KEYS\.ui\.starlightTalentTree\.modalCrest/);
assert.match(pillarSource, /closeTexture:\s*ASSET_KEYS\.ui\.starlightTalentTree\.modalClose/);
assert.match(treeSource, /buildStarlightTalentTreeHealth/);
assert.match(healthSource, /Object\.values\(ASSET_KEYS\.ui\.starlightTalentTree\)/);
assert.match(healthSource, /visiblePageCount\s*===\s*1/);
assert.match(healthSource, /visibleBranchCardCounts/);
assert.match(treeSource, /pageIndexForResource/);
assert.doesNotMatch(treeSource, /createPanel/);
assert.doesNotMatch(healthSource, /\.add\.graphics/);
assert.doesNotMatch(presentationSource, /\.add\.graphics/);
assert.doesNotMatch(navigationSource, /\.add\.graphics/);
assert.doesNotMatch(enginePageSource, /\.add\.graphics/);
assert.doesNotMatch(carouselSource, /\.add\.graphics/);
assert.doesNotMatch(engineDetailSource, /\.add\.graphics/);
assert.doesNotMatch(nodeSource, /createUiIcon/);
assert.doesNotMatch(detailSource, /createUiIcon/);
assert.match(nodeSource, /fitStarlightSign/);
assert.match(detailSource, /fitStarlightSign/);
assert.match(placementSource, /resolveVisibleArtPlacement/);
assert.doesNotMatch(nodeSource, /textures\.nodeQuickslash/);
assert.doesNotMatch(detailSource, /detailPassiveOffsetYPx/);
assert.match(nodeSource, /visibleChrome:\s*false/);
assert.match(engineCardSource, /visibleChrome:\s*false/);
assert.match(navigationSource, /visibleChrome:\s*false/);
assert.match(nodeSource, /carouselCenterRibbonEmbedded/);
assert.match(engineCardSource, /carouselCenterRibbonEmbedded/);
assert.match(navigationSource, /setVisible\(selected\)/);
assert.doesNotMatch(navigationSource, /navigationPlaqueIdle/);
assert.doesNotMatch(navigationSource, /underline/);
assert.match(carouselSource, /starlightTalentTree\.ultrawideFoundation/);
assert.match(carouselSource, /carouselArrowHoverTravelPx/);
assert.doesNotMatch(carouselSource, /carouselStepActive/);
assert.doesNotMatch(presentationSource, /onFocus:/);
assert.doesNotMatch(enginePageSource, /onFocus:/);
assert.doesNotMatch(navigationSource, /onFocus:/);
assert.doesNotMatch(nodeSource, /repeat:\s*-1/);
assert.doesNotMatch(engineCardSource, /repeat:\s*-1/);
assert.match(healthSource, /steadyMotionLoopCount/);
assert.match(treeSource, /clearSummary/);
assert.match(enginePageSource, /const wasCentered/);
assert.match(enginePageSource, /if \(wasCentered\) view\.onEngineAction/);
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
  /params\.get\("shell"\) === "pause"/,
  "the visual harness must reproduce both the Star Pillar and ESC shells",
);
assert.match(
  harnessSource,
  /layout\.immersiveInsetPx/,
  "ESC visual QA must use the same full-shell inset as the live pause menu",
);
assert.match(
  harnessSource,
  /mode:\s*shellMode/,
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

const pauseChromeSource = await readFile(
  new URL("../ui/overlays/starlightPauseTalentChrome.js", import.meta.url),
  "utf8",
);
assert.match(pauseChromeSource, /"PAUSED"/);
assert.match(pauseChromeSource, /Run controls, progression, and settings/);

console.log("starlight talent tree contract: mockup-ratio V4 ESC parity, large measured card and visible-art centering, authored ImageGen chrome, readable dossier, click-only carousel, Engine caps, Bobo seal, first-reveal routing, and worker health alerts passed");
