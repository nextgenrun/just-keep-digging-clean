const POSE_CACHE_VERSION = "20260726-clean-crops";
const spec = await fetch(`activity-spec.json?v=${POSE_CACHE_VERSION}`).then((response) => {
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
  nextEvent: 900,
  energy: 1,
};

function posePath(npc, activity) {
  return `poses/${npc.slug}-${activity.id}.webp?v=${POSE_CACHE_VERSION}`;
}

function createCard(npc, index) {
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
      <div class="actor" data-state="quiet" style="animation-delay:-${index * 0.61}s">
        <img class="pose-a visible" alt="${npc.label} activity pose">
        <img class="pose-b" alt="">
      </div>
    </div>
    <div class="activity-copy">
      <strong></strong>
      <span></span>
    </div>
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
    endsAt: Infinity,
  };
  npc.activities.forEach((activity) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = activity.label;
    button.addEventListener("click", () => setActivity(record, activity.id, "manual"));
    record.buttons.append(button);
  });
  grid.append(card);
  cards.set(npc.slug, record);
  setActivity(record, "quiet", "initial", false);
}

function activityFor(record, activityId) {
  return record.npc.activities.find((item) => item.id === activityId);
}

function updatePose(record, activity) {
  const nextLayer = 1 - record.visibleLayer;
  const incoming = record.layers[nextLayer];
  const outgoing = record.layers[record.visibleLayer];
  const source = posePath(record.npc, activity);
  incoming.src = source;
  if (!outgoing.getAttribute("src")) outgoing.src = source;
  incoming.classList.add("visible");
  outgoing.classList.remove("visible");
  record.visibleLayer = nextLayer;
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
    ? Infinity
    : simulation.time + activity.durationMs / simulation.energy;
  updatePose(record, activity);
  [...record.buttons.children].forEach((button, index) => {
    button.classList.toggle("active", record.npc.activities[index].id === activityId);
  });
  if (writeLog && activityId !== "quiet") {
    addLog(`${record.npc.label}: ${activity.label}${source === "manual" ? " (manual)" : ""}`);
  }
  updateCounts();
}

function addLog(message) {
  const item = document.createElement("li");
  item.textContent = message;
  log.prepend(item);
  while (log.children.length > 8) log.lastElementChild.remove();
}

function randomBetween([minimum, maximum]) {
  return minimum + Math.random() * (maximum - minimum);
}

function weightedActivity(record) {
  const roll = Math.random();
  const weights = spec.townRhythm.activityWeights;
  if (roll < weights.work) return "work";
  if (roll < weights.work + weights.rare) return "rare";
  return "player";
}

function triggerScheduled(force = false) {
  const quiet = [...cards.values()].filter((record) => record.activityId === "quiet");
  const active = cards.size - quiet.length;
  if (!quiet.length || (!force && active >= spec.townRhythm.maxSimultaneousActivities)) {
    return false;
  }
  const record = quiet[Math.floor(Math.random() * quiet.length)];
  setActivity(record, weightedActivity(record));
  return true;
}

function scheduleNext() {
  const gap = randomBetween(spec.townRhythm.normalEventGapMs) / simulation.energy;
  simulation.nextEvent = simulation.time + gap;
}

function updateCounts() {
  const active = [...cards.values()].filter((record) => record.activityId !== "quiet").length;
  activeCount.textContent = active;
  quietCount.textContent = cards.size - active;
}

function resetTown() {
  cards.forEach((record) => setActivity(record, "quiet", "reset", false));
  simulation.time = 0;
  simulation.nextEvent = 900;
  log.replaceChildren();
  addLog("Town reset to quiet anchors.");
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
addLog("Staggered town activity simulation started.");
requestAnimationFrame(tick);

playButton.addEventListener("click", () => {
  simulation.running = !simulation.running;
  document.body.classList.toggle("is-paused", !simulation.running);
  playButton.textContent = simulation.running ? "Pause town" : "Resume town";
});

document.querySelector("#nextEvent").addEventListener("click", () => {
  if (!triggerScheduled(true)) addLog("All NPCs are already active.");
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
