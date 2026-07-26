const CACHE_VERSION = "20260726-v11-rooted-motion";
const spec = await fetch(`activity-spec.json?v=${CACHE_VERSION}`).then((response) => {
  if (!response.ok) throw new Error(`Activity spec failed: ${response.status}`);
  return response.json();
});

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
  nextEvent: 4800,
  energy: 1,
};

function posePath(npc, poseId) {
  return `poses/${npc.slug}-${poseId}.webp?v=${CACHE_VERSION}`;
}

function activityFor(record, activityId) {
  return record.npc.activities.find(item => item.id === activityId);
}

function preloadPoses(npc) {
  const poseIds = [
    ...spec.quietLoop.frameIds,
    ...npc.activities
      .filter(activity => activity.id !== "quiet")
      .map(activity => activity.id),
  ];
  for (const poseId of poseIds) {
    const image = new Image();
    image.src = posePath(npc, poseId);
  }
}

function createCard(npc, index) {
  preloadPoses(npc);
  const card = document.createElement("article");
  card.className = "npc-card";
  card.innerHTML = `
    <header class="card-head">
      <div>
        <h2>${npc.label}</h2>
        <p class="rhythm">${npc.rhythm}</p>
      </div>
      <span class="state-chip">quiet</span>
    </header>
    <div class="actor-stage">
      <div class="actor" data-state="quiet">
        <img class="pose-a visible" alt="${npc.label} activity pose">
        <img class="pose-b" alt="">
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
    layers: [...card.querySelectorAll(".actor img")],
    visibleLayer: 0,
    activityId: "quiet",
    poseId: null,
    endsAt: Number.POSITIVE_INFINITY,
    quietFrameId: spec.quietLoop.sequence[0],
    quietSequenceIndex: 0,
    nextQuietFrameAt: 0,
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

function updatePose(record, poseId, transitionKind = "activity") {
  if (record.poseId === poseId) return;
  const nextLayer = 1 - record.visibleLayer;
  const incoming = record.layers[nextLayer];
  const outgoing = record.layers[record.visibleLayer];
  const source = posePath(record.npc, poseId);
  record.actor.dataset.transition = transitionKind;
  incoming.src = source;
  if (!outgoing.getAttribute("src")) outgoing.src = source;
  incoming.classList.add("visible");
  outgoing.classList.remove("visible");
  record.visibleLayer = nextLayer;
  record.poseId = poseId;
  record.actor.dataset.pose = poseId;
}

function resetQuietLoop(record) {
  record.quietSequenceIndex = 0;
  record.quietFrameId = spec.quietLoop.sequence[0];
  record.nextQuietFrameAt = simulation.time
    + randomBetween(spec.quietLoop.initialHoldMs) / simulation.energy;
  updatePose(record, record.quietFrameId, "quiet");
}

function advanceQuietLoop(record) {
  if (record.activityId !== "quiet") return;
  let advanced = 0;
  while (simulation.time >= record.nextQuietFrameAt && advanced < 8) {
    record.quietSequenceIndex = (
      record.quietSequenceIndex + 1
    ) % spec.quietLoop.sequence.length;
    record.quietFrameId = spec.quietLoop.sequence[
      record.quietSequenceIndex
    ];
    updatePose(record, record.quietFrameId, "quiet");
    let holdMs = spec.quietLoop.frameDurationsMs[
      record.quietSequenceIndex
    ];
    if (record.quietSequenceIndex === 0) {
      holdMs += randomBetween(spec.quietLoop.loopGapMs);
    }
    record.nextQuietFrameAt += holdMs / simulation.energy;
    advanced += 1;
  }
}

function setActivity(record, activityId, source = "scheduler", writeLog = true) {
  const activity = activityFor(record, activityId);
  if (!activity) return;
  record.activityId = activityId;
  record.actor.dataset.state = activityId;
  record.card.dataset.state = activityId;
  record.chip.textContent = activityId === "player" ? "player reaction" : activityId;
  record.title.textContent = activity.label;
  record.description.textContent = activity.description;
  record.endsAt = activityId === "quiet"
    ? Number.POSITIVE_INFINITY
    : simulation.time + activity.durationMs / simulation.energy;
  if (activityId === "quiet") resetQuietLoop(record);
  else updatePose(record, activityId, "activity");
  [...record.buttons.children].forEach((button, index) => {
    button.classList.toggle("active", record.npc.activities[index].id === activityId);
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
  if (activityId !== "quiet") {
    cards.forEach((other) => {
      if (other !== record && other.activityId !== "quiet") {
        setActivity(other, "quiet", "manual-settle", false);
      }
    });
  }
  setActivity(record, activityId, "manual");
  scheduleNext();
}

function randomBetween([minimum, maximum]) {
  return minimum + Math.random() * (maximum - minimum);
}

function weightedActivity() {
  const weights = spec.townRhythm.activityWeights;
  const entries = Object.entries(weights);
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
  const quiet = [...cards.values()].filter(record => record.activityId === "quiet");
  const active = cards.size - quiet.length;
  if (!quiet.length || active >= spec.townRhythm.maxSimultaneousActivities) {
    return false;
  }
  const record = quiet[Math.floor(Math.random() * quiet.length)];
  setActivity(record, weightedActivity());
  return true;
}

function scheduleNext() {
  const gap = randomBetween(spec.townRhythm.normalEventGapMs) / simulation.energy;
  simulation.nextEvent = simulation.time + gap;
}

function updateCounts() {
  const active = [...cards.values()]
    .filter(record => record.activityId !== "quiet").length;
  activeCount.textContent = active;
  quietCount.textContent = cards.size - active;
}

function resetTown() {
  simulation.time = 0;
  simulation.nextEvent = 4800;
  cards.forEach(record => setActivity(record, "quiet", "reset", false));
  log.replaceChildren();
  addLog("Town reset. Every merchant is still on the exact anchor.");
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
      advanceQuietLoop(record);
    });
    if (simulation.time >= simulation.nextEvent) {
      triggerScheduled();
      scheduleNext();
    }
  }
  requestAnimationFrame(tick);
}

spec.npcs.forEach(createCard);
addLog("Rooted idle loops started: visible frame motion, no walking or sway.");
requestAnimationFrame(tick);

playButton.addEventListener("click", () => {
  simulation.running = !simulation.running;
  document.body.classList.toggle("is-paused", !simulation.running);
  playButton.textContent = simulation.running ? "Pause town" : "Resume town";
});

document.querySelector("#nextEvent").addEventListener("click", () => {
  if (!triggerScheduled()) addLog("The town is holding a quiet beat.");
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
