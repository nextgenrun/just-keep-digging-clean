const grid = document.querySelector("#review-grid");
const buttons = document.querySelector("#scenario-buttons");
const summary = document.querySelector("#approval-summary");
const storageKey = "dig-game-held-dig-next-five-review-v1";

const state = {
  config: null,
  metrics: null,
  approved: new Set(),
  filter: new URLSearchParams(location.search).get("scenario") || "all",
};

window.__HELD_DIG_NEXT_FIVE_REVIEW__ = {
  ready: false,
  reviewOnly: true,
  productionChanged: false,
  getSnapshot: () => ({
    ready: window.__HELD_DIG_NEXT_FIVE_REVIEW__.ready,
    scenarioCount: state.config?.scenarios?.length || 0,
    approvedIds: [...state.approved],
    filter: state.filter,
    reviewOnly: state.config?.reviewOnly === true,
    productionChanged: state.config?.productionChanged === true,
  }),
};

function restoreSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    state.approved = new Set(saved.filter((id) => (
      state.config.scenarios.some((scenario) => scenario.id === id)
    )));
  } catch {
    state.approved = new Set();
  }
}

function saveSelection() {
  try { localStorage.setItem(storageKey, JSON.stringify([...state.approved])); } catch {}
}

function updateSummary() {
  const selected = state.config.scenarios.filter(({ id }) => state.approved.has(id));
  summary.textContent = selected.length
    ? selected.map(({ rank, shortTitle }) => `#${rank} ${shortTitle}`).join(" · ")
    : "Nothing approved yet";
}

function metricChips(scenario) {
  const metric = state.metrics.scenarios.find(({ id }) => id === scenario.id);
  if (!metric) return "";
  if (scenario.id === "held-chain") {
    return `<span>${metric.beforeJogFlashFrames} → ${metric.afterJogFlashFrames} Jog-flash frames</span><span>contacts ${metric.contactFramesAfter.join(" / ")}</span>`;
  }
  if (scenario.id === "move-during-strike") {
    return `<span>${metric.standingFootTravelFramesBefore} → ${metric.standingFootTravelFramesAfter} sliding frames</span><span>contacts unchanged</span>`;
  }
  if (scenario.id === "aim-retarget") {
    return `<span>${metric.visualResponseDelayFramesBefore} → ${metric.visualResponseDelayFramesAfter} response frames</span><span>next contact ${metric.nextContactFrameAfter}</span>`;
  }
  if (scenario.id === "mining-reversal") {
    return `<span>${metric.facingResponseDelayFramesBefore} → ${metric.facingResponseDelayFramesAfter} turn-delay frames</span><span>${metric.pivotFramesAfter}-frame plant</span>`;
  }
  return `<span>Jog phases ${metric.beforeJogPhaseAdvance.join("/")} → ${metric.afterJogPhaseAdvance.join("/")}</span><span>80 / 200 px/s</span>`;
}

function createCard(scenario) {
  const article = document.createElement("article");
  article.className = "review-card";
  article.dataset.scenario = scenario.id;
  article.innerHTML = `
    <header>
      <div class="rank">${scenario.rank}</div>
      <div><p>${scenario.eventLabel}</p><h2>${scenario.title}</h2></div>
      <span class="status">Review</span>
    </header>
    <a class="visual" href="${scenario.output}" aria-label="Open ${scenario.title} GIF full size">
      <img src="${scenario.output}" alt="Synchronized Before and After mockup for ${scenario.title}">
    </a>
    <div class="comparison">
      <section><h3>Before</h3><p>${scenario.before}</p></section>
      <section><h3>After</h3><p>${scenario.after}</p></section>
    </div>
    <div class="metrics">${metricChips(scenario)}</div>
    <button class="approve" type="button"></button>
  `;
  const approve = article.querySelector(".approve");
  const refresh = () => {
    const active = state.approved.has(scenario.id);
    article.classList.toggle("is-approved", active);
    article.querySelector(".status").textContent = active ? "Approved locally" : "Review";
    approve.textContent = active
      ? `Approved for possible wiring · remove #${scenario.rank}`
      : `Approve mockup #${scenario.rank} for possible wiring`;
  };
  approve.addEventListener("click", () => {
    if (state.approved.has(scenario.id)) state.approved.delete(scenario.id);
    else state.approved.add(scenario.id);
    saveSelection();
    refresh();
    updateSummary();
  });
  refresh();
  return article;
}

function applyFilter(id) {
  state.filter = state.config.scenarios.some((scenario) => scenario.id === id) ? id : "all";
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });
  document.querySelectorAll(".review-card").forEach((card) => {
    card.hidden = state.filter !== "all" && card.dataset.scenario !== state.filter;
  });
  const url = new URL(location.href);
  if (state.filter === "all") url.searchParams.delete("scenario");
  else url.searchParams.set("scenario", state.filter);
  history.replaceState(null, "", url);
}

async function start() {
  [state.config, state.metrics] = await Promise.all([
    fetch("../../../values/heldDigNextFiveReview.json").then((response) => response.json()),
    fetch("generated/held-dig-next-five-metrics.json").then((response) => response.json()),
  ]);
  if (!state.config.reviewOnly || state.config.productionChanged) {
    throw new Error("Review isolation guard failed");
  }
  restoreSelection();
  state.config.scenarios.forEach((scenario) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.filter = scenario.id;
    button.textContent = `${scenario.rank}. ${scenario.shortTitle}`;
    buttons.append(button);
    grid.append(createCard(scenario));
  });
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.filter));
  });
  updateSummary();
  applyFilter(state.filter);
  window.__HELD_DIG_NEXT_FIVE_REVIEW__.ready = true;
}

start().catch((error) => {
  console.error(error);
  grid.innerHTML = `<p class="error">Review failed: ${error.message}</p>`;
});
