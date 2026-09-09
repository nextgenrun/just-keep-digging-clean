import { PLAYER_HINTS, PLAYER_HINT_CONFIG as CONFIG } from "../../values/playerHints.js";
import { GRAVEBORER_WURM_PHASES } from "../../values/graveborerWurm.js";
import { TOWN_TUTORIAL_STAGES } from "../../values/retentionConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { KEYBIND_ACTION_BY_ID } from "../../values/keybindActions.js";

export function interpolateHintKeys(text, keyLabel = action => USER_SETTINGS.getKeyLabel(action)) {
  return String(text || "").replace(/\{(\w+)\}/g, (_, action) => keyLabel(action) || action);
}

// Read current authority on opening the panel; never grant progress or acknowledge lessons.
export function getPlayerHintEntries(scene, keyLabel) {
  const tile = scene.playerController?.getPlayerTile?.();
  const underground = Number.isFinite(tile?.ty) && tile.ty > scene.config.topAirRows;
  const inTown = Number.isFinite(tile?.ty) && !underground;
  const progress = scene.systemIntroductionSystem?.getProgressSnapshot?.() || {};
  const gpMax = Number(scene.playerController?.getGemPowerMax?.()) || 0;
  const gp = Number(scene.playerController?.getGemPowerRaw?.()) || 0;
  const quake = scene.earthquakeSystem?.getStatus?.();
  const wurm = scene.graveborerWurmRuntime;
  const talents = scene.celestialTalentProgressionSystem?.getSnapshot?.();
  const light = scene.lightSystem?.getShaderSnapshot?.();
  const hardcore = scene._hardcoreRuntime?.system?.getSnapshot?.()?.armed === true;
  const scores = new Map();
  const rank = (id, score, reason) => scores.set(id, { score, reason });
  rank("mining", CONFIG.priority.mining, "");
  if (underground) rank("portals", CONFIG.priority.portals, CONFIG.copy.underground);
  const hasCargo = Object.values(scene.digSystem?.getResourceTotals?.() || {}).some(amount => Number(amount) > 0);
  if (inTown && hasCargo) rank("sell", CONFIG.priority.sell, CONFIG.copy.town);
  if (inTown && Number(scene.campfireSystem?.getEmberCharges?.()) > 0) rank("ember", CONFIG.priority.ember, CONFIG.copy.ember);
  if (talents?.accessUnlocked && talents.talentPoints > 0) rank("talents", CONFIG.priority.talents, CONFIG.copy.talent);
  if (underground && hardcore) rank("hardcore", CONFIG.priority.hardcore, CONFIG.copy.hardcore);
  if (underground && Number(light?.darknessAlpha) > 0) rank("torch", CONFIG.priority.torch, CONFIG.copy.darkness);
  if (underground && progress.flightReady !== false && gpMax > 0 && gp / gpMax <= CONFIG.lowGpRatio) {
    rank("low-gp", CONFIG.priority.lowGp, CONFIG.copy.lowGp);
  }
  if (quake?.state === "warning" && quake.playerAware !== false) rank("earthquake", CONFIG.priority.earthquake, CONFIG.copy.warning);
  if (wurm?.lastGate?.productionActive === true && wurm.system?.getSnapshot?.()?.phase === GRAVEBORER_WURM_PHASES.warning) {
    rank("wurm", CONFIG.priority.wurm, CONFIG.copy.warning);
  }
  const entries = PLAYER_HINTS.filter(hint => !hint.requiresAction || KEYBIND_ACTION_BY_ID[hint.requiresAction]).map(hint => ({ ...hint, ...(scores.get(hint.id) || { score: 0, reason: "" }),
    body: interpolateHintKeys(hint.body, keyLabel) }));
  const tutorial = scene.retentionProgressSystem?.getTutorialState?.();
  if (tutorial && ![TOWN_TUTORIAL_STAGES.COMPLETE, TOWN_TUTORIAL_STAGES.SKIPPED].includes(tutorial.stage)) {
    const step = scene.townSquareTutorialSystem?.getNextPromiseOverride?.();
    if (step?.promise) entries.push({ id: "current-step", title: CONFIG.copy.current, category: "Getting started",
      section: "quick-start", body: [step.promise, step.detail].filter(Boolean).join("\n\n"), score: CONFIG.priority.currentStep, reason: "" });
  }
  return entries.sort((a, b) => b.score - a.score);
}
