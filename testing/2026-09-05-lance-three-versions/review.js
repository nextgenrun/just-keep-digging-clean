import { LANCE_VISUAL_REVIEW as C } from "../../values/stellarLanceVisualReview.js";
import { LanceReviewScene } from "./LanceReviewScene.js";
const scene = new LanceReviewScene();
const game = new Phaser.Game({
  type: Phaser.WEBGL, parent: "stage", width: C.width, height: C.height,
  backgroundColor: C.colors.background, scene: [scene],
  render: { antialias: true, pixelArt: false, roundPixels: false, preserveDrawingBuffer: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: true }, banner: false,
});
const el = id => document.getElementById(id);
const sync = () => {
  el("play").textContent = scene.playing ? "Pause" : "Play";
  el("play").setAttribute("aria-pressed", String(scene.playing));
};
function fire() { if (!scene.ready) return; scene.elapsedMs = 0; scene.playing = true; sync(); }
el("play").addEventListener("click", () => { scene.playing = !scene.playing; sync(); });
el("replay").addEventListener("click", fire);
el("freeze").addEventListener("click", () => { if (scene.ready) scene.seek(C.freezeAtMs); sync(); });
el("impact").addEventListener("click", () => { if (scene.ready) scene.seek(C.attacks[scene.attack].contactFrame / C.attacks[scene.attack].frameRate * 1000); sync(); });
el("speed").addEventListener("change", event => { scene.speed = Number(event.target.value); });
el("attack").addEventListener("change", event => { scene.attack = event.target.value; fire(); });
el("direction").addEventListener("change", event => { scene.direction = Number(event.target.value); });
el("footprint").addEventListener("change", event => { scene.showFootprint = event.target.checked; });
el("scrub").addEventListener("input", event => { if (scene.ready) scene.seek(event.target.value); sync(); });
el("fullscreen").addEventListener("click", async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.querySelector(".stage-wrap").requestFullscreen();
});
document.addEventListener("keydown", event => {
  if (event.code === "Space" && !/INPUT|SELECT|BUTTON/.test(event.target.tagName)) { event.preventDefault(); fire(); }
});
document.addEventListener("visibilitychange", () => { if (document.hidden) { scene.playing = false; sync(); } });

// Standalone review: never boots PlayScene or reads a game save.
window.lanceReview = { scene, game, snapshot: () => scene.snapshot() };
sync();

