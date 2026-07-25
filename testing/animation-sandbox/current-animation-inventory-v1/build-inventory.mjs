import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const sandboxDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(sandboxDir, "../../..");
const toUrl = (relativePath) => `${pathToFileURL(path.join(repoRoot, relativePath)).href}?inventory=20260722`;

const profilesModule = await import(toUrl("values/playerAssetProfiles.js"));
const charactersModule = await import(toUrl("values/playerCharacters.js"));
const assetKeysModule = await import(toUrl("values/assetKeys.js"));

const { PLAYER_ASSET_PROFILES } = profilesModule;
const { DEFAULT_PLAYER_CHARACTER_ID } = charactersModule;
const { ASSET_KEYS } = assetKeysModule;

const REGISTRATIONS = [
  ["idle", "idleAnimationFps", -1], ["walkStart", "walkAnimationFps", 0],
  ["walkLoop", "walkAnimationFps", -1], ["walkRun", "walkRunAnimationFps", -1],
  ["walkStop", "walkAnimationFps", 0], ["airborne", "airborneAnimationFps", 0],
  ["falling", "fallingAnimationFps", -1], ["climb", "climbAnimationFps", -1],
  ["fly", "flyAnimationFps", -1], ["flyClimb", "flyClimbAnimationFps", -1],
  ["flightEnter", "flightEnterAnimationFps", 0], ["flightTravelEnter", "flightTravelEnterAnimationFps", 0],
  ["flightTravelLoop", "flightTravelLoopAnimationFps", -1], ["flightHover", "flightHoverAnimationFps", -1],
  ["flightExit", "flightExitAnimationFps", 0], ["landing", "airborneAnimationFps", 0],
  ["duck", "duckAnimationFps", -1], ["digDown", "digDownAnimationFps", 0],
  ["digUpLook", "idleAnimationFps", -1], ["wallPush", "wallPushAnimationFps", -1],
  ["leanAgainstWall", "leanAgainstWallAnimationFps", -1],
  ["combatIdleRecover", "combatIdleRecoverAnimationFps", -1],
  ["combatIdleToNormalIdle", "combatIdleToNormalIdleAnimationFps", 0],
  ["quickslash", "quickslashAnimationFps", 0], ["teleportIn", "teleportInAnimationFps", 0],
  ["thunderStrikeCharge", "thunderStrikeChargeAnimationFps", 0],
  ["thunderStrikeStrike", "thunderStrikeStrikeAnimationFps", 0],
  ["attackDown", "digDownAnimationFps", 0], ["earthquakeReact", "earthquakeReactAnimationFps", 0],
  ["death", "deathAnimationFps", 0],
];

const ROBOT_FILES = {
  idleSheet: "idle-sheet.webp", walkStartSheet: "walk-start-sheet.webp", walkLoopSheet: "walk-loop-sheet.webp",
  walkRunSheet: "walk-run-sheet.webp", walkStopSheet: "walk-stop-sheet.webp", airborneSheet: "jump-sheet.webp",
  fallingSheet: "falling-sheet.webp", duckSheet: "duck-sheet.webp", digDownSheet: "dig-down-sheet.webp",
  digSidewaysSheet: "dig-sideways-sheet.webp", digUpSheet: "dig-up-sheet.webp",
  digUpSidewaysSheet: "dig-up-sideways-sheet.webp", digUpLookSheet: "dig-up-look-sheet.webp",
  wallPushSheet: "wall-push-sheet.webp", combatIdleRecoverSheet: "combat-idle-recover-sheet.webp",
  climbSheet: "climb-sheet.webp", flySheet: "fly-sheet.webp", quickslashSheet: "quickslash-sheet.webp",
  thunderStrikeChargeSheet: "thunder-charge-sheet.webp", thunderStrikeStrikeSheet: "thunder-strike-sheet.webp",
  attackDownSheet: "attack-down-sheet.webp", earthquakeReactSheet: "earthquake-react-sheet.webp",
};

function profileSheetPaths(profile) {
  const map = new Map();
  (profile.sheetFiles || []).forEach(([field, fileName, , sourceBasePath]) => {
    map.set(profile[field], `${sourceBasePath || profile.basePath}/${fileName}`);
  });
  if (profile.characterId === "robot") {
    Object.entries(ROBOT_FILES).forEach(([field, fileName]) => map.set(profile[field], `${profile.basePath}/${fileName}`));
  }
  if (profile.characterId === "drillHead") {
    map.set(profile.idleSheet, `${profile.basePath}/living-drill-idle-sheet.png`);
    map.set(profile.digSheet, `${profile.basePath}/living-drill-dig-sheet.png`);
    map.set(profile.flySheet, `${profile.basePath}/living-drill-fly-sheet.png`);
  }
  return map;
}

function addEntry(entries, seen, profile, profileLabel, status, spec, sheetPaths) {
  if (!spec.key || seen.has(spec.key)) return;
  seen.add(spec.key);
  const frameWidth = Number(spec.frameWidth || profile.frameWidth || (profile.characterId === "robot" ? 341 : 256));
  const frameHeight = Number(spec.frameHeight || profile.frameHeight || (profile.characterId === "robot" ? 341 : 256));
  entries.push({
    key: spec.key,
    profile: profileLabel,
    characterId: profile.characterId || "legacy",
    status,
    frames: spec.frames?.length || 0,
    frameSequence: Array.from(spec.frames || []),
    frameWidth,
    frameHeight,
    frameRate: Number(spec.frameRate) || 0,
    repeat: spec.repeat ?? 0,
    sheet: spec.sheet || "",
    assetPath: sheetPaths.get(spec.sheet) || "",
    sourceClip: spec.sourceClip || "",
    sourceFile: spec.sourceFile || "player/UalNativePlayerAnimations.js",
  });
}

function collectProfileAnimations(profile, profileLabel, status) {
  const entries = [];
  const seen = new Set();
  const sheetPaths = profileSheetPaths(profile);
  if (profile.characterId === "drillHead") {
    [
      [profile.idleAnim, profile.idleSheet, profile.idleFrames, profile.idleAnimationFps, -1],
      [profile.digDownAnim, profile.digSheet, profile.digFrames, profile.digAnimationFps, 0],
      [profile.flyAnim, profile.flySheet, profile.flyFrames, profile.flyAnimationFps, -1],
    ].forEach(([key, sheet, frames, frameRate, repeat]) => addEntry(entries, seen, profile, profileLabel, status, {
      key, sheet, frames, frameRate, repeat, sourceFile: "world/playScene/PlaySceneSetup.js",
    }, sheetPaths));
    return entries;
  }
  const sourceClipForStem = (stem) => ({
    walkRun: profile.sourceClips?.run,
    flyClimb: profile.sourceClips?.flyHover || profile.sourceClips?.fly,
    flightEnter: profile.sourceClips?.fly,
    flightTravelEnter: profile.sourceClips?.fly,
    flightTravelLoop: profile.sourceClips?.fly,
    flightHover: profile.sourceClips?.flyHover || profile.sourceClips?.fly,
    flightExit: profile.sourceClips?.fly,
    quickslash: profile.sourceClips?.punchJab,
  })[stem] || profile.sourceClips?.[stem];
  REGISTRATIONS.forEach(([stem, fpsField, repeat]) => addEntry(entries, seen, profile, profileLabel, status, {
    key: profile[`${stem}Anim`], sheet: profile[`${stem}Sheet`], frames: profile[`${stem}Frames`],
    frameRate: profile[fpsField] || profile.walkAnimation?.baseFps || profile.idleAnimationFps,
    repeat, sourceClip: sourceClipForStem(stem),
  }, sheetPaths));
  const sourceClipBySheet = new Map([
    [profile.punchJabSheet, profile.sourceClips?.punchJab],
    [profile.punchCrossSheet, profile.sourceClips?.punchCross],
    [profile.uppercutSheet, profile.sourceClips?.uppercut],
    [profile.groundStrikeSheet, profile.sourceClips?.groundStrike],
  ]);
  (profile.digAnimationVariants || []).forEach((variant) => addEntry(entries, seen, profile, profileLabel, status, {
    ...variant, sourceClip: sourceClipBySheet.get(variant.sheet) || "",
  }, sheetPaths));
  (profile.idleFidgets || []).forEach((fidget) => addEntry(entries, seen, profile, profileLabel, status, {
    key: fidget.key, sheet: profile[fidget.profileSheetKey], frames: fidget.frames,
    frameRate: fidget.frameRate, repeat: fidget.repeat ?? 0, sourceClip: "Blender idle fidget",
  }, sheetPaths));
  const hitFamilies = [
    ["digSidewaysHitAnims", "digSidewaysSheet", "digSidewaysHitFrames", "digSidewaysAnimationFps"],
    ["digUpHitAnims", "digUpSheet", "digUpHitFrames", "digUpAnimationFps"],
    ["digUpSidewaysHitAnims", "digUpSidewaysSheet", "digUpSidewaysHitFrames", "digUpAnimationFps"],
  ];
  hitFamilies.forEach(([keysField, sheetField, framesField, fpsField]) => {
    (profile[keysField] || []).forEach((key, index) => addEntry(entries, seen, profile, profileLabel, status, {
      key, sheet: profile[sheetField], frames: profile[framesField]?.[index] || profile[framesField],
      frameRate: profile[fpsField], repeat: 0,
    }, sheetPaths));
  });
  return entries;
}

const profileLabels = { survivalUal: "Survival / UAL (default)", ualNative: "UAL Native", robot: "Robot", drillHead: "Living Drill" };
const runtimeAnimations = Object.entries(PLAYER_ASSET_PROFILES).flatMap(([id, profile]) => (
  collectProfileAnimations(profile, profileLabels[id] || id, id === DEFAULT_PLAYER_CHARACTER_ID ? "current-default" : "alternate-profile")
));

const globalAnimations = [
  {
    key: ASSET_KEYS.npcs.boboIdleAnim, profile: "Global NPC", characterId: "bobo", status: "global-runtime",
    frames: ASSET_KEYS.npcs.boboIdleFrames?.length || 0, frameRate: 5, repeat: -1,
    frameSequence: Array.from(ASSET_KEYS.npcs.boboIdleFrames || []), frameWidth: 1024, frameHeight: 1024,
    sheet: ASSET_KEYS.npcs.boboIdleSheet, assetPath: "sprites/npc/npc-v3/sheets/bobo-idle-sheet.webp", sourceClip: "", sourceFile: "ui/scenes/BootScene.js",
  },
  {
    key: ASSET_KEYS.shadowMiner.idleAnim, profile: "Global NPC", characterId: "shadowMiner", status: "global-runtime",
    frames: ASSET_KEYS.shadowMiner.idleFrames?.length || 0, frameRate: 5, repeat: -1,
    frameSequence: Array.from(ASSET_KEYS.shadowMiner.idleFrames || []), frameWidth: 1280, frameHeight: 1280,
    sheet: ASSET_KEYS.shadowMiner.idleSheet, assetPath: "sprites/npc/npc-v3/sheets/shadow-miner-idle-sheet.webp", sourceClip: "", sourceFile: "ui/scenes/BootScene.js",
  },
  {
    key: ASSET_KEYS.shadowMiner.runAnim, profile: "Global NPC", characterId: "shadowMiner", status: "global-runtime",
    frames: 1, frameSequence: [ASSET_KEYS.shadowMiner.runFrame], frameWidth: 1280, frameHeight: 1280,
    frameRate: 8, repeat: -1, sheet: ASSET_KEYS.shadowMiner.sheet,
    assetPath: "sprites/npc/npc-v3/sheets/shadow-miner-sheet.webp", sourceClip: "", sourceFile: "ui/scenes/BootScene.js",
  },
].filter((entry) => entry.key);

const SKIP_DIRS = new Set([".git", "node_modules", "Saved", "Intermediate", "DerivedDataCache", "Binaries", "_ssh-git", ".cache"]);
const MEDIA_EXTS = new Set([".png", ".webp", ".gif", ".jpg", ".jpeg", ".fbx", ".glb", ".gltf", ".blend", ".piskel", ".aseprite"]);
const ANIM_HINT = /(animation|anim|character|player|npc|merchant|monster|robot|miner|survival|idle|walk|run|jump|fall|dig|fly|climb|attack|punch|kick|strike|death|duck|crouch|wall|teleport|landing|hover|roll|hit|combat|motion|pose|rig)/i;

function walkFiles(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walkFiles(absolute, result);
    else result.push(absolute);
  }
  return result;
}

function assetScope(relativePath) {
  if (relativePath.startsWith("archive/")) return "archived";
  if (relativePath.startsWith("testing/")) return "testing-review";
  if (relativePath.startsWith("sprites/")) return relativePath.includes("/runtime/") ? "production-runtime-assets" : "production-source-assets";
  if (relativePath.startsWith("markdown/")) return "documentation-reference";
  return "supporting-assets";
}

const grouped = new Map();
for (const absolute of walkFiles(repoRoot)) {
  const relative = path.relative(repoRoot, absolute).replaceAll("\\", "/");
  const extension = path.extname(relative).toLowerCase();
  const manifestLike = extension === ".json" && /(manifest|motion|animation|pose|rig|profile)/i.test(relative);
  if ((!MEDIA_EXTS.has(extension) && !manifestLike) || !ANIM_HINT.test(relative)) continue;
  const directory = path.posix.dirname(relative);
  const stat = fs.statSync(absolute);
  if (!grouped.has(directory)) grouped.set(directory, []);
  grouped.get(directory).push({ name: path.posix.basename(relative), extension: extension.slice(1), bytes: stat.size });
}

const projectAssetSets = [...grouped.entries()].map(([directory, files]) => {
  const rasterFiles = files.filter((file) => ["png", "webp", "gif", "jpg", "jpeg"].includes(file.extension));
  const representative = rasterFiles.find((file) => /(preview|contact|sheet|atlas|idle|walk)/i.test(file.name)) || rasterFiles[0];
  return {
    directory, scope: assetScope(`${directory}/`), fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    sheetCount: files.filter((file) => /(sheet|atlas|strip)/i.test(file.name)).length,
    source3dCount: files.filter((file) => ["fbx", "glb", "gltf", "blend"].includes(file.extension)).length,
    manifestCount: files.filter((file) => file.extension === "json").length,
    representative: representative ? `${directory}/${representative.name}` : "",
    files: files.sort((a, b) => a.name.localeCompare(b.name)),
  };
}).sort((a, b) => a.directory.localeCompare(b.directory));

const sourceSites = [];
for (const absolute of walkFiles(repoRoot)) {
  const relative = path.relative(repoRoot, absolute).replaceAll("\\", "/");
  if (!relative.endsWith(".js") || relative.startsWith("archive/") || relative.startsWith("testing/") || relative.startsWith("libs/")) continue;
  const lines = fs.readFileSync(absolute, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/anims\.create|createUalNativePlayerAnimations|createAnimations\(\)/.test(line)) {
      sourceSites.push({ file: relative, line: index + 1, excerpt: line.trim().slice(0, 160) });
    }
  });
}

const statusOrder = { "current-default": 0, "global-runtime": 1, "alternate-profile": 2 };
const allRuntime = [...runtimeAnimations, ...globalAnimations].sort((a, b) => (
  statusOrder[a.status] - statusOrder[b.status]
  || a.profile.localeCompare(b.profile)
  || a.key.localeCompare(b.key)
));
const inventory = {
  generatedAt: new Date().toISOString(),
  defaultCharacterId: DEFAULT_PLAYER_CHARACTER_ID,
  defaultProfileLabel: profileLabels[DEFAULT_PLAYER_CHARACTER_ID],
  runtimeAnimations: allRuntime,
  projectAssetSets,
  sourceSites,
  summary: {
    currentDefaultAnimations: allRuntime.filter((entry) => entry.status === "current-default").length,
    globalRuntimeAnimations: allRuntime.filter((entry) => entry.status === "global-runtime").length,
    alternateProfileAnimations: allRuntime.filter((entry) => entry.status === "alternate-profile").length,
    runtimeProfiles: Object.keys(PLAYER_ASSET_PROFILES).length,
    projectAssetSets: projectAssetSets.length,
    projectAnimationFiles: projectAssetSets.reduce((sum, set) => sum + set.fileCount, 0),
    archivedAssetSets: projectAssetSets.filter((set) => set.scope === "archived").length,
  },
};

const output = `window.ANIMATION_INVENTORY = ${JSON.stringify(inventory)};\n`;
fs.writeFileSync(path.join(sandboxDir, "inventory-data.js"), output, "utf8");
console.log(`ANIMATION_INVENTORY_OK runtime=${allRuntime.length} sets=${projectAssetSets.length} files=${inventory.summary.projectAnimationFiles}`);
