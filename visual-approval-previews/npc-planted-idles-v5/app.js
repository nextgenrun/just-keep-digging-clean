const CACHE_VERSION = "20260728-v13-silhouette-chroma";
const spec = await fetch(`activity-spec.json?v=${CACHE_VERSION}`).then(
  (response) => {
    if (!response.ok) {
      throw new Error(`Activity spec failed: ${response.status}`);
    }
    return response.json();
  },
);

const grid = document.querySelector("#npcGrid");
const log = document.querySelector("#eventLog");
const playButton = document.querySelector("#togglePlay");
const energyInput = document.querySelector("#energy");
const energyValue = document.querySelector("#energyValue");
const quietCount = document.querySelector("#quietCount");
const activeCount = document.querySelector("#activeCount");
const cards = new Map();
const simulation = {
  running: true,
  time: 0,
  lastReal: performance.now(),
  nextEvent: 7000,
  energy: 1,
};

function posePath(npc, poseId) {
  return `poses/${npc.slug}-${poseId}.webp?v=${CACHE_VERSION}`;
}

function activityFor(record, activityId) {
  if (activityId === "quiet") return spec.baselinePolicy;
  return record.npc.activities.find((item) => item.id === activityId);
}

function baselineMarkup(npc) {
  if (npc.baseline.type === "video") {
    return `<video class="baseline-visual" src="${npc.baseline.path}"
      autoplay muted loop playsinline aria-label="${npc.label} original idle"></video>`;
  }
  return `<img class="baseline-visual" src="${npc.baseline.path}"
    alt="${npc.label} original idle">`;
}

function preloadPoses(npc) {
  for (const activity of npc.activities) {
    const image = new Image();
    image.src = posePath(npc, activity.id);
  }
}

function createCard(npc) {
  preloadPoses(npc);
  const card = document.createElement("article");
  card.className = "npc-card";
  card.innerHTML = `
    <header class="card-head">
      <div>
        <h2>${npc.label}</h2>
        <p class="rhythm">${npc.rhythm}</p>
      </div>
      <span class="state-chip">original idle</span>
    </header>
    <div class="actor-stage">
      <div class="actor" data-state="quiet" data-pose="baseline">
        ${baselineMarkup(npc)}
        <img class="activity-layer pose-a" alt="${npc.label} activity pose">
        <img class="activity-layer pose-b" alt="">
      </div>
    </div>
    <div class="activity-copy"><strong></strong><span></span></div>
    <div class="activity-buttons"></div>
  `;
  const record = {
    npc,
    card,
    actor: card.querySelector(".actor"),
    chip: card.querySelector(".state-chip"),
    title: card.querySelector(".activity-copy strong"),
    description: card.querySelector(".activity-copy span"),
    buttons: card.querySelector(".activity-buttons"),
    layers: [...card.querySelectorAll(".activity-layer")],
    visibleLayer: 0,
    activityId: "quiet",
    poseId: null,
    endsAt: Number.POSITIVE_INFINITY,
  };
  npc.activities.forEach((activity) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = activity.label;
    button.title = activity.description;
    button.addEventListener(
      "click",
      () => setManualActivity(record, activity.id),
    );
    record.buttons.append(button);
  });
  grid.append(card);
  cards.set(npc.slug, record);
  setActivity(record, "quiet", "initial", false);
}

function updatePose(record, poseId) {
  const nextLayer = 1 - record.visibleLayer;
  const incoming = record.layers[nextLayer];
  const outgoing = record.layers[record.visibleLayer];
  incoming.src = posePath(record.npc, poseId);
  incoming.classList.add("visible");
  outgoing.classList.remove("visible");
  record.visibleLayer = nextLayer;
  record.poseId = poseId;
  record.actor.dataset.pose = poseId;
}

function showBaseline(record) {
  record.layers.forEach((layer) => layer.classList.remove("visible"));
  record.poseId = null;
  record.actor.dataset.pose = "baseline";
}

function setActivity(record, activityId, source = "scheduler", writeLog = true) {
  const activity = activityFor(record, activityId);
  if (!activity) return;
  record.activityId = activityId;
  record.actor.dataset.state = activityId;
  record.card.dataset.state = activityId;
  record.chip.textContent = activityId === "quiet"
    ? "original idle"
    : activityId === "player" ? "player reaction" : activityId;
  record.title.textContent = activity.label;
  record.description.textContent = activity.description;
  record.endsAt = activityId === "quiet"
    ? Number.POSITIVE_INFINITY
    : simulation.time + activity.durationMs / simulation.energy;
  if (activityId === "quiet") showBaseline(record);
  else updatePose(record, activityId);
  [...record.buttons.children].forEach((button, index) => {
    button.classList.toggle(
      "active",
      record.npc.activities[index].id === activityId,
    );
  });
  if (writeLog && activityId !== "quiet") {
    const suffix = source === "manual" ? " (manual)" : "";
    addLog(`${record.npc.label}: ${activity.label}${suffix}`);
  }
  updateCounts();
}

function addLog(message) {
  const item = document.createElement("li");
  item.textContent = message;
  log.prepend(item);
  while (log.children.length > 8) log.lastElementChild.remove();
}

function setManualActivity(record, activityId) {
  cards.forEach((other) => {
    if (other !== record && other.activityId !== "quiet") {
      setActivity(other, "quiet", "manual-settle", false);
    }
  });
  setActivity(record, activityId, "manual");
  scheduleNext();
}

function randomBetween([minimum, maximum]) {
  return minimum + Math.random() * (maximum - minimum);
}

function weightedActivity() {
  const entries = Object.entries(spec.townRhythm.activityWeights);
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  const roll = Math.random() * total;
  let cumulative = 0;
  for (const [activityId, weight] of entries) {
    cumulative += weight;
    if (roll <= cumulative) return activityId;
  }
  return entries[0][0];
}

function triggerScheduled() {
  const quiet = [...cards.values()].filter(
    (record) => record.activityId === "quiet",
  );
  const active = cards.size - quiet.length;
  if (!quiet.length || active >= spec.townRhythm.maxSimultaneousActivities) {
    return false;
  }
  const record = quiet[Math.floor(Math.random() * quiet.length)];
  setActivity(record, weightedActivity());
  return true;
}

function scheduleNext() {
  const gap = randomBetween(spec.townRhythm.normalEventGapMs);
  simulation.nextEvent = simulation.time + gap / simulation.energy;
}

function updateCounts() {
  const active = [...cards.values()].filter(
    (record) => record.activityId !== "quiet",
  ).length;
  activeCount.textContent = active;
  quietCount.textContent = cards.size - active;
}

function resetTown() {
  simulation.time = 0;
  simulation.nextEvent = 7000;
  cards.forEach((record) => setActivity(record, "quiet", "reset", false));
  log.replaceChildren();
  addLog("Town reset to the original calm idle baselines.");
}

function tick(realNow) {
  const realDelta = Math.min(100, realNow - simulation.lastReal);
  simulation.lastReal = realNow;
  if (simulation.running) {
    simulation.time += realDelta;
    cards.forEach((record) => {
      if (record.activityId !== "quiet" && simulation.time >= record.endsAt) {
        setActivity(record, "quiet", "settle", false);
      }
    });
    if (simulation.time >= simulation.nextEvent) {
      triggerScheduled();
      scheduleNext();
    }
  }
  requestAnimationFrame(tick);
}

spec.npcs.forEach(createCard);
addLog("Original idles running; seven accepted activities are wired.");
requestAnimationFrame(tick);

playButton.addEventListener("click", () => {
  simulation.running = !simulation.running;
  document.body.classList.toggle("is-paused", !simulation.running);
  playButton.textContent = simulation.running ? "Pause town" : "Resume town";
});

document.querySelector("#nextEvent").addEventListener("click", () => {
  if (!triggerScheduled()) addLog("The town is holding a calm idle beat.");
  scheduleNext();
});

document.querySelector("#resetTown").addEventListener("click", resetTown);

energyInput.addEventListener("input", () => {
  simulation.energy = Number(energyInput.value);
  energyValue.textContent = `${simulation.energy.toFixed(2)}×`;
  scheduleNext();
});

document.querySelector("#gameScale").addEventListener("change", (event) => {
  document.body.classList.toggle("scale-game", event.currentTarget.checked);
});
