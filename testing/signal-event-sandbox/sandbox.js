import { ensureHardcorePresentationRuntime } from "../../world/playScene/HardcorePresentationRuntime.js";
const frame = document.getElementById("game"), status = document.getElementById("status");
let message = "Loading game…", lastRuntime = null, failure = null;
const gameWindow = () => frame.contentWindow;
const scene = () => gameWindow().__phaserGame?.scene.getScene("PlayScene");
const signal = () => scene()?.randomEventBridge?.signal;
function report(text) { message = text; refresh(); }
function wirePractice(s) {
  if (!s?._sceneSetupReady || !s.randomEventBridge || !s.gameSaveCoordinator || s.randomEventBridge === lastRuntime) return;
  lastRuntime = s.randomEventBridge;
  if (!new URL(frame.src).searchParams.has("jkd_e2e")) throw new Error("Practice needs save isolation.");
  // This sandbox keeps the original save block enabled; transactions mutate disposable memory only.
  s._saveWritesBlocked = true;
  s.gameSaveCoordinator.transaction = async ({ mutate }) => ({ success: true, persisted: false, value: await mutate() });
  s.gameSaveCoordinator.flush = async () => true;
  s.flushDugTilesSave = async () => true;
  s.hardcoreMemorialStore = { append: record => ({ record, persisted: true }), getForSlot: () => [] };
  gameWindow().__jkdE2E?.closeAll?.();
  message = "Practice ready. Choose a Signal case, then Go to minicamp.";
}
function refresh() {
  const s = scene(); wirePractice(s);
  const event = signal()?.snapshot(), active = event?.event;
  const resources = s?.digSystem?.getResourceTotals?.();
  const snapshot = { message, failure, game: s?.gameState || "loading",
    signal: event?.phase || "idle", cinematic: event?.cinema || "closed",
    trapAudio: s?.soundSystem?.reviewedSfx?.history?.filter(h => h.group === "signal-trap").slice(-4),
    trap: { ready: signal()?.trap?.view?.ready, phase: active?.signal?.blastPhase, fuseMs: active?.signal?.fuseRemainingMs, fatal: active?.signal?.blastFatal, glow: signal()?.trap?.view?.glow?.visible, burst: signal()?.trap?.view?.burst?.visible },
    survivor: active?.signal?.survivorId, source: active?.anchors?.[0], real: active?.signal?.real,
    caption: signal()?.view?.root?.visible ? signal().view.caption.text : signal()?.cinema?.isVisible ? signal()?.cinema?.caption?.text : null,
    camp: event?.campVisible, survivorVisible: event?.survivorVisible,
    resources: resources ? Object.fromEntries(Object.entries(resources).filter(([,v]) => v > 0)) : {},
    gp: s?.playerController?.getGemPowerExact?.(), stars: s?.celestialTalentProgressionSystem?.getSnapshot?.()?.stars,
    hardcore: s?._hardcoreRuntime?.system?.getSnapshot?.(),
    input: { left: s?.playerController?.input?.keys?.left?.keyCode, right: s?.playerController?.input?.keys?.right?.keyCode, leftDown: s?.playerController?.input?.keys?.left?.isDown, enabled: s?.playerController?.input?.controlsEnabled },
    playerTile: s?.playerController?.getPlayerTile?.(),
    history: s?.randomEventBridge?.director?.state?.signalHistory || [],
    mia: { owned: s?.upgradeSystem?.getUpgradeLevel?.("mia"), visible: Boolean(s?.npcManager?.mia?.sprite?.visible), tile: s?.npcManager?.mia?.tile, purchase: s?.upgradeSystem?.canPurchaseUpgrade?.("mia") },
    interactionDistance: s?.playerController ? signal()?.getInteractionDistance?.(s.playerController.getPlayerTile()) : null,
    saveWritesBlocked: s?._saveWritesBlocked === true,
    voice: { loaded: signal()?.voice?.buffers?.size, playing: Boolean(signal()?.voice?.node), muted: signal()?.voice?.muted?.() },
    call: active?.signal, suspended: active?.suspended, remainingMs: active?.remainingMs,
    timer: { remaining: signal()?.cinema?.lineRemaining, pending: signal()?.cinema?.pendingSpeech?.kind, clockPaused: s?.time?.paused, scale: s?.time?.timeScale, scenePaused: s?.scene?.isPaused?.() },
    cinematicText: signal()?.cinema?.caption?.text, footer: signal()?.cinema?.footer?.text };
  if (active?.anchors?.[0] && s) {
    const a = active.anchors[0]; let solid = 0;
    for (let y = a.ty - 3; y <= a.ty; y++) for (let x = a.tx - 3; x <= a.tx + 3; x++) solid += s.worldModel.isSolid(x,y) ? 1 : 0;
    snapshot.minicampSolidTiles = solid;
  }
  status.textContent = JSON.stringify(snapshot, null, 1);
}
function safe(action) { return async () => { try { await action(); failure = null; } catch(e) { failure = e.message; } refresh(); }; }
document.getElementById("start").onclick = safe(async () => {
  const game = gameWindow().__phaserGame;
  if (!game?.scene.isActive("MainMenuScene") && !game?.scene.isActive("StartMenuScene")) { report("Wait for the menu, or reload this practice page."); return; }
  const menu = game.scene.isActive("MainMenuScene") ? "MainMenuScene" : "StartMenuScene";
  game.scene.getScene(menu).scene.start("WorldLoadScene", { saveSlot: 3, worldIdentity: "signal-practice-2026-09-07",
    isNewSave: true, tutorialChoice: "no" });
  report("Starting a fresh disposable world…");
});
document.getElementById("pack").onclick = safe(() => {
  const s = scene(); if (!s?.digSystem) return;
  const resources = s.digSystem.getResourceTotals();
  for (const key of Object.keys(resources)) resources[key] = 25;
  resources.dirt = 100; resources.stone = 50; resources.copper = 75;
  s.digSystem.setResourceTotals(resources);
  s.playerController.setGemPowerExact(s.playerController.getGemPowerMax(), { silent: true, source: "signal-practice" });
  report("Practice pack filled.");
});
document.querySelectorAll("[data-case]").forEach(button => {
  button.onclick = safe(() => {
    const s = scene(); if (!s?.dynamicEventRuntime) return;
    s.dynamicEventRuntime.cancel();
    gameWindow().__jkdE2E?.closeAll?.();
    const kind = button.dataset.case;
    const result = s.dynamicEventRuntime.request("signal", { survivorId: document.getElementById("survivor").value,
      kind: kind === "echo" ? "echo" : kind === "explosive" ? "explosive" : "survivor", ...(kind === "win" || kind === "loss" ? { outcome: kind } : {}) });
    report(result ? "Signal started. Follow its calls or go to the camp." : "Signal blocked. Wait for a quiet playing scene.");
  });
});
document.getElementById("approach").onclick = safe(() => {
  const s = scene(), active = signal()?.active;
  if (!active) { report("Start a Signal first."); return; }
  const a = active.anchors[0];
  s.playerController.teleportToTile(a.tx - 1, a.ty);
  report("At the minicamp. Press E in the game to approach the survivor.");
});
document.getElementById("walkout").onclick = safe(() => {
  const s = scene(), a = signal()?.active?.anchors?.[0];
  if (!a || !signal().trap.view.ready) { report("Start an explosive Signal and wait for its artwork."); return; }
  // A native review control sends the ordinary rebind-aware walking key, never a teleport to safety.
  const w = gameWindow(), binding = s.playerController.input;
  s.playerController.teleportToTile(a.tx - 1, a.ty);
  gameWindow().__jkdE2E?.closeAll?.();
  const keyCode = binding?.keys?.left?.keyCode || 65;
  const down = () => s.input.keyboard.manager.target.dispatchEvent(new w.KeyboardEvent("keydown", { key: "a", code: "KeyA", keyCode, which: keyCode, bubbles: true }));
  const up = () => s.input.keyboard.manager.target.dispatchEvent(new w.KeyboardEvent("keyup", { key: "a", code: "KeyA", keyCode, which: keyCode, bubbles: true }));
  // Let one frame arm the fuse before normal walking input.
  s.time.delayedCall(200, down); s.time.delayedCall(2200, up);
  report("Walking left with ordinary movement after a 200 ms reaction. No jump, Flight or GP needed.");
});
document.getElementById("talk").onclick = safe(() => {
  report(signal()?.handleInteract() ? "Encounter opened through the real interaction bridge." : "Get closer and wait for the survivor assets.");
});
document.getElementById("home").onclick = safe(() => {
  const s = scene(), bobo = s?.npcManager?.npcDefs?.find(n => n.merchantId === "boboMerchant");
  if (bobo) s.playerController.teleportToTile(bobo.tx + 1, bobo.ty);
  report("At Bobo on the surface.");
});
document.getElementById("restore").onclick = safe(() => {
  const s = scene(); if (!s?.upgradeSystem) return;
  const saved = JSON.parse(JSON.stringify(s.upgradeSystem.getUpgradeLevels()));
  s.npcManager.mia.clear(); s.upgradeSystem.setUpgradeLevels(saved);
  report("Restored the upgrade save map; Mia will be reconstructed beside Bobo.");
});
document.getElementById("sound").onclick = safe(() => {
  const s = scene(); if (!s?.soundSystem) return;
  s.soundSystem.sfxEnabled = !s.soundSystem.sfxEnabled;
  s.soundSystem.refreshMixVolumes();
  report(s.soundSystem.sfxEnabled ? "Sound on." : "Sound off. Calls still have captions and direction.");
});
document.getElementById("hardcore").onclick = safe(async () => {
  const s = scene(); if (!s?._hardcoreRuntime) return;
  s._hardcoreRuntime.system.selectMode("hardcore");
  s._hardcoreRuntime.system.arm("signal-practice");
  s.hardcoreModeData = s._hardcoreRuntime.system.getSaveData();
  await ensureHardcorePresentationRuntime(s, s._hardcoreRuntime);
  s.hardcoreMemorialStore = { append: record => ({ record, persisted: true }), getForSlot: () => [] };
  report("Hardcore armed in disposable memory. An attack loss or close explosion ends this practice run.");
});
document.getElementById("cancel").onclick = safe(() => { scene()?.dynamicEventRuntime?.cancel(); report("Encounter cancelled."); });
setInterval(() => { try { refresh(); } catch(e) { status.textContent = e.message; } }, 250);
