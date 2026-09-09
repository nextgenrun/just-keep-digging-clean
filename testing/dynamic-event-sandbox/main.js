import { WURM_SIZES, WURM_DIFFICULTIES } from "../../values/graveborerWurmVariants.js";
import { DYNAMIC_EVENT_REVIEW as cfg } from "../../values/dynamicEventReview.js";
import { EncounterScene } from "./EncounterScene.js";

const byId = id => document.getElementById(id);
const controls = { wurmSize: "medium", wurmDifficulty: "drifter", depth: cfg.world.depth, intensity: "medium", speed: 1,
  hardcore: true, flight: true, hazards: true, suppressed: false, torch: false,
  patrol: true, mining: false, natural: false, audio: false, pauseOnResult: false };
let lastSnapshot = null;
function publish(snapshot) {
  lastSnapshot = snapshot;
  byId("pause").textContent = snapshot.paused ? "Resume" : "Pause";
  byId("status").textContent = snapshot.runtimeError ? "Runtime error: " + snapshot.runtimeError : snapshot.loadErrors.length
    ? "Asset load failed — see snapshots" : snapshot.paused ? "Paused"
      : snapshot.controls.natural ? "Normal timers and chance" : "Ready for review triggers";
  byId("health-status").textContent = snapshot.health.ready ? "HEALTHY · all controllers responding"
    : "FAULT · " + Object.values(snapshot.health.events).filter(row => row.issue).map(row => row.id + ": " + row.issue).join(" · ");
  byId("clock").textContent = (snapshot.elapsedMs / 1000).toFixed(1) + "s simulated";
  byId("shadow-state").textContent = snapshot.shadow.state + " · " + snapshot.shadow.spawnCount + " started";
  byId("wurm-state").textContent = snapshot.wurm.phase + " · pass " + snapshot.wurm.passIndex + "/" + snapshot.wurm.passCount;
  byId("quake-state").textContent = snapshot.earthquake.state + " · " + snapshot.earthquake.fallingRocks + " falling rocks";
  byId("shadow-gate").textContent = snapshot.gates.shadow.join(" · ");
  byId("wurm-gate").textContent = snapshot.gates.wurm.join(" · ") || "All natural admission gates open";
  byId("quake-gate").textContent = snapshot.gates.quake.join(" · ") || "Encounter active";
  byId("legacy-status").textContent = snapshot.retired.every(item => item.blocked)
    ? "3/3 blocked through direct start, query force and old-save restore."
    : "ERROR: a retired event passed admission";
  const run = snapshot.sequence;
  byId("sequence-state").textContent = !run ? "Shadowminer → Wurm → Earthquake, twice."
    : run.failed ? "Failed — see encounter trace." : run.completed ? "Complete · 6/6 encounters finished."
      : "Running · encounter " + (run.index + 1) + "/6";
  byId("metrics").textContent = snapshot.metrics.hits + " hits · " + snapshot.metrics.destroyed
    + " tiles destroyed · " + snapshot.metrics.audioCues + " cue previews · 0 save writes";
  byId("trace").textContent = snapshot.trace.map(entry =>
    (entry.timeMs / 1000).toFixed(2).padStart(7) + "s  " + entry.message).join("\n");
  const { trace, ...details } = snapshot;
  byId("snapshot").textContent = JSON.stringify(details, null, 2);
}
if (!window.eventLabStorage?.isolated) throw new Error("Save isolation unavailable; lab not started");
const scene = new EncounterScene(controls, publish);
const game = new Phaser.Game({ type: Phaser.AUTO, parent: "game",
  width: cfg.viewport.width, height: cfg.viewport.height, backgroundColor: "#080c0e",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { disableWebAudio: false }, scene: [scene] });

for (const [id, profiles] of [["wurmSize", WURM_SIZES], ["wurmDifficulty", WURM_DIFFICULTIES]]) {
  byId(id).replaceChildren(...profiles.map(profile => {
    const option = document.createElement("option"); option.value = profile.id;
    option.textContent = profile.label; option.selected = controls[id] === profile.id; return option;
  }));
}
for (const id of Object.keys(controls)) {
  const input = byId(id);
  input.addEventListener("change", () => {
    controls[id] = input.type === "checkbox" ? input.checked
      : ["depth", "speed"].includes(id) ? Number(input.value) : input.value;
    if (id === "depth") {
      controls.depth = Math.max(1, Math.min(2000, Math.floor(controls.depth) || cfg.world.depth));
      input.value = controls.depth;
      if (scene.ready) scene.resetChamber();
    }
    if (id === "audio") {
      if (controls.audio) void scene.sound.context?.resume();
      else scene.soundSystem?.stop();
    }
    if (id === "natural" && scene.ready) scene.resetChamber();
    if (scene.ready) scene.syncConditions();
    input.blur();
  });
}
document.querySelectorAll("[data-trigger]").forEach(button => {
  button.addEventListener("click", () => { scene.trigger(button.dataset.trigger); button.blur(); });
});
byId("noise").onclick = () => { if (scene.ready) scene.noise(); };
byId("sequence").onclick = () => { if (scene.ready) scene.runSequence(); };
byId("pause").onclick = () => {
  scene.paused = !scene.paused;
  scene.tweens.timeScale = scene.paused ? 0 : controls.speed;
  if (scene.paused) scene.soundSystem?.stop();
  byId("pause").textContent = scene.paused ? "Resume" : "Pause";
};
byId("speed").addEventListener("change", () => { scene.tweens.timeScale = scene.paused ? 0 : controls.speed; });
byId("reset").onclick = () => {
  if (scene.ready) scene.resetChamber();
  byId("pause").textContent = "Pause";
};
byId("export").onclick = () => {
  if (!lastSnapshot) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(lastSnapshot, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "dynamic-event-review.json";
  link.click();
  URL.revokeObjectURL(url);
};
window.addEventListener("error", event => {
  byId("status").textContent = "Runtime error: " + event.message;
});
window.addEventListener("pagehide", () => game.destroy(true), { once: true });
