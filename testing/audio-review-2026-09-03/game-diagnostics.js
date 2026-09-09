import { FREESOUND_AUDIO_REVIEW as VIEW } from "../../values/freesoundAudioReview.js";

/** Read-only visible diagnostics, only inside the existing local save-blocked harness. */
export function installAudioGameDiagnostics(scene) {
  if (typeof document === "undefined" || scene._saveWritesBlocked !== true
    || new URLSearchParams(window.location.search).get(VIEW.gameQuery) !== "1") return;
  const panel = document.createElement("section"); panel.id = VIEW.gamePanelId;
  panel.setAttribute("aria-label", "Save-disabled audio diagnostics");
  panel.style.cssText = "position:fixed;right:8px;bottom:8px;width:350px;max-width:40vw;max-height:40vh;overflow:auto;z-index:9999;background:#0b1927ed;color:#d8edff;padding:12px;border:1px solid #5a7c95;font:12px/1.4 monospace;pointer-events:auto";
  const title = document.createElement("strong"); title.textContent = "AUDIO REVIEW · SAVE WRITES BLOCKED";
  const hint = document.createElement("p"); hint.textContent = "Read-only game diagnostics. F6 finds an existing Star. Normal movement and mining controls are unchanged.";
  const close = document.createElement("button"); close.textContent = "Close audio diagnostics";
  const pre = document.createElement("pre"); pre.id = `${VIEW.gamePanelId}-state`;
  pre.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0";
  panel.append(title, hint, close, pre); document.body.append(panel);
  const errors = []; let last = -Infinity;
  const onError = event => errors.push(String(event.message || event.reason));
  window.addEventListener("error", onError); window.addEventListener("unhandledrejection", onError);
  const update = time => {
    if (time - last < VIEW.diagnosticsMs) return; last = time;
    const system = scene.soundSystem, director = system?.freesoundAudio;
    if (!director) return;
    const snapshot = director.snapshot();
    pre.textContent = JSON.stringify({ saveWritesBlocked: scene._saveWritesBlocked, phase: scene.gameState,
      audioContextState: scene.sound.context?.state, initialized: system.audioInitialized, enabled: snapshot.enabled,
      listener: director.frame?.position, context: snapshot.context, stars: snapshot.stars, panic: snapshot.panic,
      memory: snapshot.memory, sfx: system.activeSfxMixer.snapshot(), recentEvents: snapshot.history.slice(-8), errors }, null, 2);
  };
  const destroy = () => {
    scene.game.events.off("poststep", update); window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onError); panel.remove();
  };
  close.onclick = destroy; scene.game.events.on("poststep", update);
  scene.events.once("shutdown", destroy);
}
