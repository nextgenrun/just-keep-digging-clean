const cards = document.querySelector("#cards");
const playToggle = document.querySelector("#play-toggle");
const restart = document.querySelector("#restart");
const scrub = document.querySelector("#scrub");
const speedSelect = document.querySelector("#speed");
const scaleToggle = document.querySelector("#scale-toggle");
const phaseOutput = document.querySelector("#phase");

const data = await fetch("./manifest.json", { cache: "no-store" }).then((response) => {
  if (!response.ok) throw new Error(`Manifest failed: ${response.status}`);
  return response.json();
});

if (!data.reviewOnly || data.productionChanged) {
  throw new Error("NPC idle review safety contract is invalid.");
}

const rootRelative = (path) => `../../${path}`;
const poseStacks = [];
let phase = 0;
let playing = true;
let speed = 1;
let cycleStartedAt = performance.now();

function cardFor(npc) {
  const article = document.createElement("article");
  article.className = "card";
  const current = npc.currentPosePaths.map((path, index) =>
    `<img src="${rootRelative(path)}" alt="${npc.label} ${npc.currentPoseLabels[index]} sample">`
  ).join("");
  const poses = npc.posePaths.map((path, index) =>
    `<img src="${rootRelative(path)}" alt="${npc.label} ${npc.poseLabels[index]} pose">`
  ).join("");

  article.innerHTML = `
    <div class="card-head">
      <div><h2>${npc.label}</h2><p class="kind">Current: ${npc.currentKind}</p></div>
      <span class="duration">${npc.durationSeconds.toFixed(1)}s proposed rhythm</span>
    </div>
    <div class="comparison">
      <section class="side">
        <div class="side-title"><span>CURRENT RUNTIME</span><span>12 exact samples · 4.0s</span></div>
        <div class="stage">
          <div class="visual pose-stack" data-kind="current">${current}<span class="pose-label">runtime 0%</span></div>
        </div>
      </section>
      <section class="side">
        <div class="side-title"><span class="proposal">PROPOSED DIRECTION</span><span>4 poses</span></div>
        <div class="stage">
          <div class="visual pose-stack" data-kind="proposal">${poses}<span class="pose-label">neutral</span></div>
        </div>
      </section>
    </div>
    <div class="notes">
      <div class="note issue"><strong>Current weakness</strong>${npc.issue}</div>
      <div class="note proposal"><strong>Character beat</strong>${npc.proposal}</div>
      <div class="note secondary"><strong>Secondary motion</strong>${npc.secondary}</div>
    </div>`;
  cards.append(article);
  article.querySelectorAll(".pose-stack").forEach((element) => {
    const currentStack = element.dataset.kind === "current";
    poseStacks.push({
      kind: element.dataset.kind,
      images: [...element.querySelectorAll("img")],
      label: element.querySelector(".pose-label"),
      labels: currentStack ? npc.currentPoseLabels : npc.poseLabels,
    });
  });
}

data.npcs.forEach(cardFor);

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function poseMix(progress) {
  const keys = [0, 0.24, 0.54, 0.80, 1];
  const poses = [0, 1, 2, 3, 0];
  let segment = 0;
  while (segment < keys.length - 2 && progress >= keys[segment + 1]) segment += 1;
  const span = keys[segment + 1] - keys[segment];
  const local = Math.max(0, Math.min(1, (progress - keys[segment]) / span));
  const blendStart = 0.58;
  const blend = local <= blendStart ? 0 : smoothstep((local - blendStart) / (1 - blendStart));
  return { from: poses[segment], to: poses[segment + 1], blend };
}

function sampleMix(progress, count) {
  const position = progress * count;
  const from = Math.floor(position) % count;
  return { from, to: (from + 1) % count, blend: smoothstep(position - Math.floor(position)) };
}

function renderPhase() {
  for (const stack of poseStacks) {
    const mix = stack.kind === "current" ? sampleMix(phase, stack.images.length) : poseMix(phase);
    stack.images.forEach((image, index) => {
      image.style.opacity = index === mix.from ? 1 - mix.blend : index === mix.to ? mix.blend : 0;
    });
    stack.label.textContent = mix.blend < 0.5 ? stack.labels[mix.from] : stack.labels[mix.to];
  }
  scrub.value = String(Math.round(phase * 1000));
  phaseOutput.value = `${Math.round(phase * 100)}%`;
}

function setPlaying(next) {
  playing = next;
  playToggle.textContent = playing ? "Pause" : "Play";
  if (playing) cycleStartedAt = performance.now() - phase * 4000 / speed;
}

playToggle.addEventListener("click", () => setPlaying(!playing));
restart.addEventListener("click", () => {
  phase = 0;
  cycleStartedAt = performance.now();
  renderPhase();
});
scrub.addEventListener("input", () => {
  setPlaying(false);
  phase = Number(scrub.value) / 1000;
  renderPhase();
});
speedSelect.addEventListener("change", () => {
  speed = Number(speedSelect.value);
  cycleStartedAt = performance.now() - phase * 4000 / speed;
});
scaleToggle.addEventListener("click", () => {
  document.body.classList.toggle("runtime-scale");
  scaleToggle.textContent = document.body.classList.contains("runtime-scale")
    ? "Show large inspect"
    : "Show 138 px scale";
});

function tick(now) {
  if (playing) {
    phase = ((now - cycleStartedAt) * speed / 4000) % 1;
    renderPhase();
  }
  requestAnimationFrame(tick);
}

renderPhase();
setPlaying(true);
requestAnimationFrame(tick);
