import {
  auditModularPlatformContacts,
  auditTitanClearance,
  closeWorldrootUi,
  dropThroughCrownTerrace,
  exerciseStarArrivals,
  landOnCrownTerrace,
  walkCrownTerrace,
} from "./2026-08-30-roboplaytest-worldroot-motion.mjs";
import { runWorldrootWhiteboxScenarios } from
  "./2026-08-30-roboplaytest-worldroot-whitebox.mjs";
import { runSanctuaryScenarios } from "./2026-09-03-roboplaytest-sanctuary.mjs";
import { exerciseInteraction } from "./2026-09-03-roboplaytest-worldroot-interactions.mjs";

const AUTHORISED_PLATFORM_COUNT = 13;

const STAGE_CASES = Object.freeze([
  { id: "rooted", stage: 0, stars: 0, titans: 0, campfire: 1, talents: 0, platforms: AUTHORISED_PLATFORM_COUNT, focus: "root" },
  { id: "rootways", stage: 1, stars: 5, titans: 0, campfire: 1, talents: 0, platforms: AUTHORISED_PLATFORM_COUNT },
  { id: "cobalt", stage: 2, stars: 10, titans: 0, campfire: 2, talents: 0, platforms: AUTHORISED_PLATFORM_COUNT },
  { id: "amber-mirror", stage: 3, stars: 20, titans: 2, campfire: 3, talents: 0, platforms: AUTHORISED_PLATFORM_COUNT },
  { id: "starfire", stage: 4, stars: 35, titans: 5, campfire: 6, talents: 0, platforms: AUTHORISED_PLATFORM_COUNT },
  { id: "full-memory", stage: 5, stars: 50, titans: 20, campfire: 10, talents: 3, platforms: AUTHORISED_PLATFORM_COUNT, focus: "star" },
  { id: "consumed-memory", stage: 5, stars: 50, titans: 20, campfire: 10, talents: 3, platforms: AUTHORISED_PLATFORM_COUNT, focus: "star", consumed: true },
  { id: "crown", stage: 6, stars: 50, titans: 25, campfire: 10, talents: 3, platforms: AUTHORISED_PLATFORM_COUNT, focus: "crown" },
]);

const INTERACTION_CASES = Object.freeze([
  { id: "hearth-talents", stage: 0, kind: "root", route: "talents" },
  { id: "biome-map", stage: 5, kind: "biome", route: "map" },
  { id: "intact-star-map", stage: 5, kind: "star", route: "map" },
  { id: "consumed-star-map", stage: 5, kind: "star", route: "map", consumed: true },
  { id: "titan-archive", stage: 5, kind: "titan", route: "titans" },
  { id: "dormant-crown", stage: 5, kind: "crown", route: "crown-dormant" },
  { id: "ready-crown", stage: 6, kind: "crown", route: "crown-ready" },
]);

async function auditStage(driver, testCase) {
  await closeWorldrootUi(driver);
  const result = await driver.page.evaluate(async expected => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    const system = scene?.starPillarSystem;
    const harness = globalThis.__jkdE2E;
    const { WORLDROOT_CONFIG } = await import("/values/worldroot.js");
    const { WORLDROOT_MODULAR_V4_CONFIG } = await import("/values/worldrootModularV4.js");
    if (!scene || !system || !harness) throw new Error("Worldroot runtime or E2E harness is unavailable.");
    const debug = system.previewWorldrootProgress(expected.stage, { consumed: expected.consumed === true });
    const visual = system._townWorldVisual;
    const snapshot = system._worldrootSnapshot;
    const revealRight = WORLDROOT_CONFIG.reveal.rightByStage[expected.stage];
    const memoryHotspots = visual.hotspots.filter(hotspot => ["biome", "star", "titan"].includes(hotspot.kind));
    const isModularV4 = debug?.reviewMode === "worldroot-modular-v4";
    const modularEntries = visual.modularView?.entries || [];
    const visibleConsumedRegions = isModularV4
      ? modularEntries.filter(entry => entry.consumed?.active === true
        && entry.consumed.alpha > 0.01).length
      : visual.consumedRegions.filter(
        entry => entry.image?.active === true && entry.image.alpha > 0.01,
      ).length;
    const expectedPlatformCount = isModularV4
      ? WORLDROOT_MODULAR_V4_CONFIG.modules.reduce(
        (count, module) => count + module.platforms.length,
        0,
      )
      : expected.platforms;
    const expectedConsumedRegionCount = expected.consumed
      ? (isModularV4 ? WORLDROOT_MODULAR_V4_CONFIG.modules.length : 5)
      : 0;
    const livingArtReady = isModularV4
      ? modularEntries.length === WORLDROOT_MODULAR_V4_CONFIG.modules.length
        && modularEntries.every(entry => entry.living?.active === true)
      : visual.livingBody?.active === true && visual.livingCrown?.active === true;
    const texturesResident = isModularV4
      ? WORLDROOT_MODULAR_V4_CONFIG.modules.every(module => (
        scene.textures.exists(module.living.key) && scene.textures.exists(module.consumed.key)
      ))
      : scene.textures.exists(WORLDROOT_CONFIG.assets.living.key)
        && scene.textures.exists(WORLDROOT_CONFIG.assets.consumed.key);
    const hiddenHotspots = memoryHotspots.filter(hotspot => {
      const point = hotspot.source?.point || hotspot.source?.anchor;
      return Number.isFinite(point?.x) && point.x > revealRight + 0.0001;
    });
    const currentExpected = {
      "root-hearth": snapshot.campfireLevel >= WORLDROOT_CONFIG.endgame.requiredCampfireLevel,
      "world-memory": snapshot.awakeRegionCount >= WORLDROOT_CONFIG.endgame.requiredRegions,
      "star-memory": snapshot.knownStarCount >= WORLDROOT_CONFIG.endgame.requiredKnownStars,
      "celestial-mastery": snapshot.completedTalentBranchCount
        >= WORLDROOT_CONFIG.endgame.requiredCompletedTalentBranches,
      "titan-chorus": snapshot.titanCount >= WORLDROOT_CONFIG.endgame.requiredTitans
        && snapshot.titanMemories.some(memory => memory.worldrootKeystone && memory.discovered),
    };
    const currentMismatches = snapshot.currents.filter(current => (
      current.ready !== (currentExpected[current.id] === true)
    )).map(current => current.id);
    const errors = [];
    const checks = [
      [debug?.enabled === true, "Worldroot disabled"],
      [debug?.growthStage === expected.stage, "growth stage mismatch"],
      [debug?.knownStars === expected.stars, "known Star count mismatch"],
      [debug?.consumedStars === (expected.consumed ? expected.stars : 0), "consumed Star count mismatch"],
      [debug?.titanCount === expected.titans, "Titan count mismatch"],
      [debug?.campfireLevel === expected.campfire, "Campfire level mismatch"],
      [debug?.completedTalentBranches === expected.talents, "talent completion mismatch"],
      [debug?.platformCount === expectedPlatformCount, "terrace count mismatch"],
      [
        debug?.sourceScale > 0
          && debug.sourceScale <= WORLDROOT_CONFIG.placement.maximumSourceScale + 0.001,
        "tree exceeds its authored presentation scale",
      ],
      [debug?.hardCropEnabled === false, "tree body is still hard-cropped"],
      [Math.abs(debug?.gpRatio - expected.stage / 6) < 0.001, "GP pulse ratio mismatch"],
      [snapshot.profileMemories.length === 50, "not all 50 biome memories exist"],
      [snapshot.regionMemories.length === 5, "not all five biome countries exist"],
      [snapshot.titanMemories.length === 25, "not all 25 Titan memories exist"],
      [snapshot.talentMemories.length === 3, "not all three talent branches exist"],
      [new Set(snapshot.starMemories.map(memory => memory.id)).size === expected.stars, "Star memories are not unique"],
      [hiddenHotspots.length === 0, "an unborn memory exposed an interaction"],
      [currentMismatches.length === 0, "a convergence current disagrees with its authority"],
      [livingArtReady, "living tree art is missing"],
      [texturesResident, "Worldroot texture pair is not resident"],
      [visibleConsumedRegions === expectedConsumedRegionCount, "consumed biome masks mismatch"],
      [debug.endgameReady === (expected.stage === 6), "Crown readiness mismatch"],
    ];
    checks.forEach(([passed, message]) => { if (!passed) errors.push(message); });
    if (errors.length) throw new Error(`${expected.id}: ${errors.join("; ")}`);

    let target = null;
    if (expected.focus) {
      const hotspot = visual.hotspots.find(candidate => candidate.kind === expected.focus);
      if (hotspot) target = { tx: hotspot.world.x / scene.config.tileSize, ty: hotspot.world.y / scene.config.tileSize };
    }
    if (!target) {
      const platform = visual.getOneWayPlatforms().at(-1);
      if (platform) {
        target = {
          tx: ((platform.leftX + platform.rightX) / 2) / scene.config.tileSize,
          ty: platform.y / scene.config.tileSize - 1.1,
        };
      }
    }
    if (target) harness.forcePlayerState(target);
    return {
      ...debug,
      id: expected.id,
      revealRight,
      currentReady: Object.fromEntries(snapshot.currents.map(current => [current.id, current.ready])),
      hotspotCounts: Object.fromEntries(["root", "biome", "star", "titan", "crown"].map(kind => [
        kind, visual.hotspots.filter(hotspot => hotspot.kind === kind).length,
      ])),
      consumedRegionCount: visibleConsumedRegions,
      target,
    };
  }, testCase);
  await driver.page.waitForTimeout(320);
  return result;
}

async function restoreWorldroot(driver) {
  await closeWorldrootUi(driver);
  return driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const system = scene.starPillarSystem;
    const restored = system.restoreWorldrootPreview();
    const debug = system.getWorldrootDebugSnapshot();
    if (!restored || system._worldrootPreviewBaseline || scene._worldrootEndgameStarted) {
      throw new Error("Worldroot preview or Crown guard did not restore.");
    }
    return { restored, debug };
  });
}

export async function runWorldrootScenarios(driver) {
  const reviewMode = await driver.page.evaluate(() => (
    globalThis.__phaserGame.scene.getScene("PlayScene")
      .starPillarSystem?.getWorldrootDebugSnapshot?.()?.reviewMode
  ));
  if (reviewMode === "root-sanctuary") {
    await runSanctuaryScenarios(driver);
    return;
  }
  if (["collision-whitebox", "gate-b-art-sample", "gate-c-art-sample"].includes(reviewMode)) {
    await runWorldrootWhiteboxScenarios(driver);
    return;
  }
  for (const testCase of STAGE_CASES) {
    await driver.runPhase({
      id: `worldroot-stage-${testCase.id}`,
      title: `Worldroot growth unlock: ${testCase.id}`,
      category: "worldroot",
      accelerated: true,
    }, () => auditStage(driver, testCase));
  }
  for (const testCase of INTERACTION_CASES) {
    await driver.runPhase({
      id: `worldroot-route-${testCase.id}`,
      title: `Worldroot interaction route: ${testCase.id}`,
      category: "worldroot",
      accelerated: true,
    }, () => exerciseInteraction(driver, testCase));
  }
  await driver.runPhase(
    {
      id: "worldroot-titan-clearance",
      title: "Elevated Worldroot clears the live Titan promenade",
      category: "worldroot",
      accelerated: true,
    },
    () => auditTitanClearance(driver),
  );
  await driver.runPhase(
    {
      id: "worldroot-platform-contacts",
      title: "Every V4 walkable segment receives a real falling-body contact",
      category: "worldroot",
      accelerated: true,
    },
    () => auditModularPlatformContacts(driver),
  );
  await driver.runPhase(
    { id: "worldroot-crown-land", title: "Land on the visible Crown approach branch", category: "worldroot" },
    () => landOnCrownTerrace(driver),
  );
  await driver.runPhase(
    { id: "worldroot-crown-walk", title: "Walk horizontally across the Crown approach branch", category: "worldroot" },
    () => walkCrownTerrace(driver),
  );
  await driver.runPhase(
    { id: "worldroot-crown-drop", title: "Drop through the Crown approach branch", category: "worldroot" },
    () => dropThroughCrownTerrace(driver),
  );
  await driver.runPhase(
    { id: "worldroot-star-arrivals", title: "Worldroot consecutive Star arrival lifecycle", category: "worldroot", accelerated: true },
    () => exerciseStarArrivals(driver),
  );
  await driver.runPhase(
    { id: "worldroot-restore", title: "Worldroot save-safe preview and Crown-guard restoration", category: "worldroot" },
    () => restoreWorldroot(driver),
  );
}
