const root = "../../../";
const accepted = "../../blender-animation-lab-v1/review-drafts/mixamo-library-v1/renders/candidate-runtime/";
const draft = "../../blender-animation-lab-v1/review-drafts/mixamo-locomotion-comparison-v1/renders/candidate-runtime/";
const runtime = `${root}sprites/character/`;
const range = (count, start = 0) => Array.from({ length: count }, (_, i) => start + i);

const clip = (file, frames, columns, fps, display = 109, originY = .9, options = {}) => ({
  file, frames: Array.isArray(frames) ? frames : range(frames), columns, fps, display, originY,
  loop: options.loop ?? true, offsetY: options.offsetY ?? 0, label: options.label ?? "",
});

const C = {
  idle: clip(`${runtime}survival-character-blender-v2/runtime/survival-character-blender-v2-idle-sheet.png`, 48, 16, 12, 101, 228 / 256, { label: "Blender V2 idle" }),
  idleFidget: clip(`${accepted}survival-character-mixamo-v1-idle-looking-sheet.png`, 120, 16, 18, 101, 903 / 1024, { loop: false, label: "Unarmed Idle Looking" }),
  walkStart: clip(`${accepted}survival-character-mixamo-v1-walk-start-sheet.png`, 16, 16, 30, 101, 899 / 1024, { loop: false, label: "Start Walking" }),
  walk: clip(`${runtime}survival-character-blender-v2/runtime/survival-character-blender-v2-walk-sheet.png`, 24, 16, 30, 104, 224 / 256, { label: "Blender V2 walk" }),
  mixWalk: clip(`${draft}survival-character-mixamo-locomotion-v1-walk-loop-sheet.png`, 24, 16, 24, 101, .883, { label: "Standard Walk" }),
  run: clip(`${runtime}survival-ual-player-v1/runtime/survival-ual-player-v1-animation-polish-run-sheet.webp`, 28, 16, 30, 123, 248 / 256, { label: "UAL Jog polish" }),
  mixRun: clip(`${draft}survival-character-mixamo-locomotion-v1-run-loop-sheet.png`, 20, 16, 30, 109, .883, { label: "Unarmed Run Forward" }),
  walkStop: clip(`${accepted}survival-character-mixamo-v1-walk-stop-sheet.png`, 16, 16, 30, 101, 898 / 1024, { loop: false, label: "Stop Walking" }),
  crouchEnter: clip(`${accepted}survival-character-mixamo-v1-crouch-enter-sheet.png`, 18, 16, 24, 101, 915 / 1024, { loop: false, label: "Standing Idle To Crouch" }),
  crouchIdle: clip(`${accepted}survival-character-mixamo-v1-crouch-idle-sheet.png`, 28, 16, 20, 101, 918 / 1024, { label: "Crouch Idle" }),
  crouchWalk: clip(`${draft}survival-character-mixamo-locomotion-v1-crouch-walk-sheet.png`, 24, 16, 24, 101, .888, { label: "Crouched Walking" }),
  crouchExit: clip(`${accepted}survival-character-mixamo-v1-crouch-exit-sheet.png`, 18, 16, 24, 101, 916 / 1024, { loop: false, label: "Crouch To Standing" }),
  flightEnter: clip(`${runtime}survival-character-blender-v2/runtime/survival-character-blender-v2-superman-flight-prone-v3-sheet.png`, range(10), 12, 16, 109, .915, { loop: false, offsetY: -28, label: "Current Flight enter" }),
  flightLoop: clip(`${accepted}survival-character-mixamo-v1-flight-loop-sheet.png`, 48, 16, 18, 101, .915, { offsetY: -28, label: "Flying Idle" }),
  flightExit: clip(`${runtime}survival-character-blender-v2/runtime/survival-character-blender-v2-superman-flight-prone-v3-sheet.png`, range(10, 26), 12, 16, 109, .915, { loop: false, offsetY: -28, label: "Current Flight exit" }),
  hardLanding: clip(`${accepted}survival-character-mixamo-v1-hard-landing-sheet.png`, range(10, 14), 16, 30, 101, 897 / 1024, { loop: false, label: "Jumping Down · hard landing" }),
  jumpFull: clip(`${draft}survival-character-mixamo-locomotion-v1-jump-full-sheet.png`, 36, 16, 30, 101, .84, { loop: false, label: "Unarmed Jump" }),
  jumpTakeoff: clip(`${draft}survival-character-mixamo-locomotion-v1-jump-full-sheet.png`, range(14), 16, 30, 101, .84, { loop: false, label: "Unarmed Jump · takeoff" }),
  jumpAir: clip(`${draft}survival-character-mixamo-locomotion-v1-jump-full-sheet.png`, range(11, 14), 16, 30, 101, .84, { loop: false, label: "Unarmed Jump · airborne" }),
  jumpLand: clip(`${draft}survival-character-mixamo-locomotion-v1-jump-full-sheet.png`, range(11, 25), 16, 30, 101, .84, { loop: false, label: "Unarmed Jump · landing" }),
  falling: clip(`${draft}survival-character-mixamo-locomotion-v1-falling-loop-sheet.png`, 24, 16, 24, 101, .762, { offsetY: -28, label: "Falling Idle" }),
};

const rows = [
  { id: "idle", group: "Ground · base", title: "Standing idle", current: C.idle, candidate: C.idleFidget, recommend: "CURRENT + FIDGET", note: "Keep the restrained Blender idle as the base. Use Mixamo only as an occasional looking fidget, not a permanent replacement.", verdict: "keep", currentMetrics: ["48f · 12 fps", "101 px"], candidateMetrics: ["120f · 18 fps", "addition only"] },
  { id: "walk-start", group: "Ground · transition", title: "Walk / run startup", current: C.walkStart, candidate: C.walkStart, recommend: "SAME · KEEP", note: "Runtime already uses this Mixamo weight-transfer. The real conflict begins when it hands into the Blender walk loop.", verdict: "keep", same: true, currentMetrics: ["16f · 30 fps", "101 px active"], candidateMetrics: ["byte-identical", "foot-lock gated"] },
  { id: "walk-loop", group: "Ground · loop", title: "Walking", current: C.walk, candidate: C.mixWalk, recommend: "MIXAMO", note: "Standard Walk matches startup and slowdown at the same measured ~0.30 discontinuity as current, while its arm swing, pelvis and stride read substantially more naturally.", verdict: "mixamo", currentMetrics: ["24f · 30 fps", "104 px", "startup 0.30"], candidateMetrics: ["24f · 24 fps", "startup 0.30", "0 green"] },
  { id: "run-loop", group: "Ground · loop", title: "Running", current: C.run, candidate: C.mixRun, recommend: "CURRENT · HANDOFF WINNER", note: "Unarmed Run is crisp in isolation but is not the best locomotive result: its Standard Walk handoff scores 0.44 discontinuity versus 0.36 when Standard Walk enters the current UAL run. Keep current until a dedicated blend is sourced or authored.", verdict: "current", currentMetrics: ["28f · 30 fps", "123 px", "new-walk handoff 0.36"], candidateMetrics: ["20f · 30 fps", "handoff 0.44", "0 green"] },
  { id: "walk-stop", group: "Ground · transition", title: "Walk / run slowdown", current: C.walkStop, candidate: C.walkStop, recommend: "SAME · KEEP", note: "Runtime already uses the authored Mixamo plant and settle. Phase-match the chosen loop into this clip; do not replace it.", verdict: "keep", same: true, currentMetrics: ["16f · 30 fps", "101 px active"], candidateMetrics: ["byte-identical", "planted stop"] },
  { id: "crouch-enter", group: "Duck · transition", title: "Standing to duck", current: C.crouchEnter, candidate: C.crouchEnter, recommend: "SAME · KEEP", note: "The approved Mixamo crouch entry is already current runtime and should remain the hitbox-handoff authority.", verdict: "keep", same: true, currentMetrics: ["18f · 24 fps"], candidateMetrics: ["byte-identical"] },
  { id: "crouch-idle", group: "Duck · loop", title: "Duck / crouch idle", current: C.crouchIdle, candidate: C.crouchIdle, recommend: "SAME · KEEP", note: "The current neutral Crouch Idle is already the accepted Mixamo version. No second source should be mixed into this hold.", verdict: "keep", same: true, currentMetrics: ["28f · 20 fps", "101 px"], candidateMetrics: ["byte-identical"] },
  { id: "crouch-walk", group: "Duck · movement", title: "Crouched movement", current: C.crouchIdle, candidate: C.crouchWalk, recommend: "MIXAMO ADDITION", note: "Runtime currently has no dedicated crouch-walk loop. This candidate prevents sliding the static duck pose when low movement is allowed.", verdict: "mixamo", currentMetrics: ["idle placeholder", "no stride"], candidateMetrics: ["24f · 24 fps", "baseline 13 px", "0 green"] },
  { id: "crouch-exit", group: "Duck · transition", title: "Duck to standing", current: C.crouchExit, candidate: C.crouchExit, recommend: "SAME · KEEP", note: "The matched recovery is already current runtime. Keep it paired with the existing enter and idle.", verdict: "keep", same: true, currentMetrics: ["18f · 24 fps"], candidateMetrics: ["byte-identical"] },
  { id: "takeoff", group: "Air · transition", title: "Taking off", current: C.flightEnter, candidate: C.jumpTakeoff, recommend: "CURRENT FOR FLIGHT", note: "The Mixamo jump takeoff reads well but does not connect to the prone Flight pose. Keep the current Flight handoff; retain Mixamo only as future jump reference.", verdict: "current", reference: true, currentMetrics: ["10f · 16 fps", "Flight role"], candidateMetrics: ["14f sample", "future jump only"] },
  { id: "airborne", group: "Air · loop", title: "Airborne / falling", current: C.flightLoop, candidate: C.falling, recommend: "ROLE SPLIT", note: "Flying Idle is already current and correct for controlled Flight. Falling Idle is stronger only for an uncontrolled descent or future jump state.", verdict: "keep", reference: true, currentMetrics: ["48f · 18 fps", "current Mixamo Flight"], candidateMetrics: ["24f · 24 fps", "baseline 2 px"] },
  { id: "landing", group: "Air · impact", title: "Landing", current: C.hardLanding, candidate: C.jumpLand, recommend: "CURRENT HARD LANDING", note: "Keep the accepted Jumping Down hard landing: it has a clearer impact and recovery. The full-jump tail is useful only for a lighter jump landing.", verdict: "current", reference: true, currentMetrics: ["runtime frames 14–23", "30 fps"], candidateMetrics: ["jump tail", "lighter impact"] },
  { id: "jump-full", group: "Reference · no gameplay state", title: "Full jump sequence", current: C.idle, candidate: C.jumpFull, recommend: "REVIEW ONLY", note: "There is no current player jump mechanic. This row tests mesh deformation and motion quality only and must remain unwired unless gameplay scope changes explicitly.", verdict: "keep", reference: true, currentMetrics: ["no runtime state"], candidateMetrics: ["36f · 30 fps", "271 px vertical travel", "0 green"] },
];

const images = new Map();
const state = { playing: true, scale: "game", speed: 1, guides: true, onion: false, elapsed: 0, last: performance.now() };
const storageKey = "dig-game-mixamo-locomotion-comparison-v1";
let decisions = {};
try { decisions = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { decisions = {}; }

function imageFor(file) {
  if (!images.has(file)) {
    const image = new Image();
    image.src = file;
    images.set(file, image);
  }
  return images.get(file);
}

function phaseFrame(spec, phase) {
  const normalized = spec.loop ? phase % 1 : Math.min(.9999, phase);
  return spec.frames[Math.min(spec.frames.length - 1, Math.floor(normalized * spec.frames.length))];
}

function drawClip(canvas, spec, phase, options = {}) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const ground = h - 34;
  ctx.clearRect(0, 0, w, h);
  const gradient = ctx.createRadialGradient(w / 2, h * .42, 8, w / 2, h * .44, w * .46);
  gradient.addColorStop(0, options.candidate ? "#23342d" : "#173039");
  gradient.addColorStop(1, "#071013");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  if (state.guides) {
    ctx.strokeStyle = "#6fd0c744";
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(16, ground + .5); ctx.lineTo(w - 16, ground + .5); ctx.stroke();
    ctx.setLineDash([]);
  }
  const image = imageFor(spec.file);
  if (!image.complete || !image.naturalWidth) {
    ctx.fillStyle = "#92a5a6"; ctx.font = "13px Segoe UI"; ctx.textAlign = "center";
    ctx.fillText("Loading exact runtime sheet…", w / 2, h / 2);
    return;
  }
  const size = spec.display * (state.scale === "inspect" ? 1.65 : 1) * (canvas.width > 360 ? 1.05 : 1);
  const x = w / 2 - size / 2;
  const y = ground - size * spec.originY + spec.offsetY * (state.scale === "inspect" ? 1.35 : 1);
  const renderFrame = (frame, alpha = 1, dx = 0) => {
    const sx = (frame % spec.columns) * 256;
    const sy = Math.floor(frame / spec.columns) * 256;
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, sx, sy, 256, 256, x + dx, y, size, size);
    ctx.globalAlpha = 1;
  };
  const frame = phaseFrame(spec, phase);
  if (state.onion) {
    const index = spec.frames.indexOf(frame);
    renderFrame(spec.frames[(index - 2 + spec.frames.length) % spec.frames.length], .12, -5);
    renderFrame(spec.frames[(index - 1 + spec.frames.length) % spec.frames.length], .2, -2);
  }
  renderFrame(frame);
  if (options.noState) {
    ctx.fillStyle = "#070d0fe0"; ctx.fillRect(28, h / 2 - 22, w - 56, 44);
    ctx.strokeStyle = "#ef7f78"; ctx.strokeRect(28.5, h / 2 - 21.5, w - 57, 43);
    ctx.fillStyle = "#ffd2cf"; ctx.font = "800 13px Segoe UI"; ctx.textAlign = "center";
    ctx.fillText("NO CURRENT JUMP STATE", w / 2, h / 2 + 5);
  }
}

const players = [];
function addPlayer(canvas, spec, candidate, noState = false) { players.push({ canvas, spec, candidate, noState }); }

function metricHtml(items) { return items.map(item => `<span>${item}</span>`).join(""); }

function renderRows() {
  const host = document.querySelector("#rows");
  const template = document.querySelector("#row-template");
  rows.forEach(row => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = row.id;
    if (row.same) node.classList.add("same-row");
    if (row.reference) node.classList.add("reference-row");
    node.querySelector(".motion-group").textContent = row.group;
    node.querySelector(".motion-title").textContent = row.title;
    node.querySelector(".motion-note").textContent = row.note;
    node.querySelector(".recommend-badge").textContent = row.recommend;
    node.querySelector(".current-name").textContent = row.current.label;
    node.querySelector(".candidate-name").textContent = row.candidate.label;
    node.querySelector(".current-metrics").innerHTML = metricHtml(row.currentMetrics);
    node.querySelector(".candidate-metrics").innerHTML = metricHtml(row.candidateMetrics);
    const currentCanvas = node.querySelector(".current-canvas");
    const candidateCanvas = node.querySelector(".candidate-canvas");
    addPlayer(currentCanvas, row.current, false, row.id === "jump-full");
    addPlayer(candidateCanvas, row.candidate, true);
    const selected = decisions[row.id] || row.verdict;
    node.querySelectorAll(".verdicts button").forEach(button => {
      button.classList.toggle("active", button.dataset.verdict === selected);
      button.addEventListener("click", () => {
        decisions[row.id] = button.dataset.verdict;
        localStorage.setItem(storageKey, JSON.stringify(decisions));
        node.querySelectorAll(".verdicts button").forEach(item => item.classList.toggle("active", item === button));
        updateSummary();
      });
    });
    host.appendChild(node);
  });
  updateSummary();
}

function updateSummary() {
  const counts = { current: 0, mixamo: 0, keep: 0 };
  rows.forEach(row => counts[decisions[row.id] || row.verdict]++);
  document.querySelector("#verdict-summary").innerHTML = `<b>${counts.mixamo}</b> Mixamo · <b>${counts.current}</b> current · <b>${counts.keep}</b> keep / split`;
}

const groundCurrent = [
  ["Idle", C.idle, .8], ["Startup", C.walkStart, .55], ["Walk", C.walk, 1.25], ["Run", C.run, 1.1],
  ["Walk", C.walk, .75], ["Slowdown", C.walkStop, .55], ["Idle", C.idle, .7],
];
const groundCandidate = [
  ["Idle", C.idle, .8], ["Startup", C.walkStart, .55], ["Walk", C.mixWalk, 1.25], ["Run", C.mixRun, 1.1],
  ["Walk", C.mixWalk, .75], ["Slowdown", C.walkStop, .55], ["Idle", C.idle, .7],
];

function sequenceState(sequence, elapsed) {
  const total = sequence.reduce((sum, item) => sum + item[2], 0);
  let cursor = (elapsed % total);
  for (const item of sequence) {
    if (cursor <= item[2]) return { label: item[0], spec: item[1], phase: cursor / item[2] };
    cursor -= item[2];
  }
  return { label: sequence[0][0], spec: sequence[0][1], phase: 0 };
}

function render(time) {
  const delta = Math.min(80, time - state.last) / 1000;
  state.last = time;
  if (state.playing) state.elapsed += delta * state.speed;
  players.forEach(player => {
    const duration = Math.max(.7, player.spec.frames.length / player.spec.fps);
    drawClip(player.canvas, player.spec, (state.elapsed % duration) / duration, { candidate: player.candidate, noState: player.noState });
  });
  const a = sequenceState(groundCurrent, state.elapsed);
  const b = sequenceState(groundCandidate, state.elapsed);
  drawClip(document.querySelector("#sequence-current"), a.spec, a.phase, { candidate: false });
  drawClip(document.querySelector("#sequence-candidate"), b.spec, b.phase, { candidate: true });
  document.querySelector("#sequence-current-phase").textContent = a.label;
  document.querySelector("#sequence-candidate-phase").textContent = b.label;
  requestAnimationFrame(render);
}

document.querySelector("#play-toggle").addEventListener("click", event => {
  state.playing = !state.playing;
  event.currentTarget.textContent = state.playing ? "Pause all" : "Play all";
});
document.querySelectorAll("[data-scale]").forEach(button => button.addEventListener("click", () => {
  state.scale = button.dataset.scale;
  document.querySelectorAll("[data-scale]").forEach(item => item.classList.toggle("active", item === button));
}));
document.querySelector("#speed").addEventListener("change", event => { state.speed = Number(event.target.value); });
document.querySelector("#guides").addEventListener("change", event => { state.guides = event.target.checked; });
document.querySelector("#onion").addEventListener("change", event => { state.onion = event.target.checked; });

renderRows();
requestAnimationFrame(render);
