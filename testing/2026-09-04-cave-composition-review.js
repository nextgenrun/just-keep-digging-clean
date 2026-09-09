import { CAVE_VISUAL_COMPOSITION_REVIEW as CONFIG } from "../values/caveVisualCompositionReview.js";
import { startCarriedLightLiveComparison } from "./2026-07-30-carried-light-live-controller.js";

const api = startCarriedLightLiveComparison(CONFIG);
const comparison = document.getElementById("comparison");
const inputButtons = [...document.querySelectorAll("button[data-review-input]")];
let inputTimer = null;
let heldInput = null;
let lastInput = null;
const frames = () => CONFIG.scenarios.map(scenario => (
  document.getElementById(`${scenario.id}-frame`).contentWindow
));
const inputSnapshot = () => frames().map(win => {
  const scene = win.__phaserGame?.scene?.getScene("PlayScene");
  const body = scene?.playerController?.physicsBody;
  if (!body) return null;
  const tx = Math.floor((body.x + body.w / 2) / scene.config.tileSize);
  const ty = Math.floor((body.y + body.h) / scene.config.tileSize);
  return { x: body.x, y: body.y, floor: { tx, ty, type: scene.worldModel.getTile(tx, ty) } };
});
function releaseInput() {
  if (!heldInput) return;
  for (const win of frames()) for (const key of CONFIG.review.inputs[heldInput]) {
    win.dispatchEvent(new win.KeyboardEvent("keyup", { ...key, which: key.keyCode, bubbles: true }));
  }
  clearTimeout(inputTimer);
  inputTimer = null;
  heldInput = null;
  lastInput.after = inputSnapshot();
  lastInput.originalFloorAfter = frames().map((win, index) => {
    const floor = lastInput.before[index]?.floor;
    return floor ? win.__phaserGame.scene.getScene("PlayScene").worldModel.getTile(floor.tx, floor.ty) : null;
  });
}
for (const button of inputButtons) button.addEventListener("click", () => {
  if (!api.ready) return;
  releaseInput();
  heldInput = button.dataset.reviewInput;
  lastInput = { action: heldInput, before: inputSnapshot() };
  for (const win of frames()) for (const key of CONFIG.review.inputs[heldInput]) {
    win.dispatchEvent(new win.KeyboardEvent("keydown", { ...key, which: key.keyCode, bubbles: true }));
  }
  inputTimer = setTimeout(releaseInput, CONFIG.review.inputHoldMs);
});
for (const button of document.querySelectorAll("button[data-view]")) {
  button.addEventListener("click", () => {
    comparison.dataset.view = button.dataset.view;
    for (const other of document.querySelectorAll("button[data-view]")) {
      other.setAttribute("aria-pressed", String(other === button));
    }
  });
}

const timer = setInterval(() => {
  if (!api.ready) {
    document.getElementById("checks").textContent = JSON.stringify(CONFIG.scenarios.map(scenario => {
      const game = document.getElementById(`${scenario.id}-frame`).contentWindow?.__phaserGame;
      return { scenario: scenario.label, fps: game?.loop?.actualFps,
        scenes: game?.scene?.getScenes(true)?.map(scene => ({
          key: scene.scene.key, status: scene.sys.settings.status,
          loading: scene.load?.isLoading?.(), progress: scene.load?.progress,
          setupReady: scene._sceneSetupReady, player: Boolean(scene.player),
          lighting: Boolean(scene.lightSystem), savesBlocked: scene._saveWritesBlocked,
          harness: Boolean(game.canvas.ownerDocument.defaultView.__jkdE2E),
        })) };
    }), null, 2);
    return;
  }
  const live = api.snapshot();
  // Keep the selected fuel comparable during a long visual review. Runtime
  // consumption and all production resource rules remain owned by the game.
  api.setFuel(live.fuelProfile);
  for (const button of inputButtons) button.disabled = false;
  const scenes = CONFIG.scenarios.map(scenario => {
    const frame = document.getElementById(`${scenario.id}-frame`);
    const scene = frame.contentWindow?.__phaserGame?.scene?.getScene("PlayScene");
    const body = scene?.playerController?.physicsBody;
    const shadow = scene?.playerContactShadow;
    return {
      scenario: scenario.label,
      fps: Math.round(scene?.game?.loop?.actualFps || 0),
      body: body ? { x: body.x, y: body.y, w: body.w, h: body.h } : null,
      shadow: shadow?.inner ? { x: shadow.inner.x, y: shadow.inner.y, visible: shadow.inner.visible } : null,
      sprite: scene?.player ? { x: scene.player.x, y: scene.player.y, originY: scene.player.originY } : null,
      lighting: scene?.worldRenderer?.lightingBridge?.sample?.() || null,
      savesBlocked: scene?._saveWritesBlocked === true,
    };
  });
  document.getElementById("checks").textContent = JSON.stringify({ ...live, render: scenes, lastInput }, null, 2);
}, CONFIG.review.telemetryMs);
window.addEventListener("beforeunload", () => { releaseInput(); clearInterval(timer); });
