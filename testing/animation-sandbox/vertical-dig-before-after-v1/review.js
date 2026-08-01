const CONFIG_PATH = "../../../values/verticalDigBeforeAfterReview.json";
const METRICS_PATH = "generated/vertical-dig-before-after-metrics.json";
const storageKey = "dig-game-vertical-dig-before-after-review-v1";

const elements = {
  grid: document.querySelector("#review-grid"),
  buttons: document.querySelector("#scenario-buttons"),
  summary: document.querySelector("#approval-summary"),
};
const state = {
  config: null,
  metrics: null,
  approved: new Set(),
  filter: new URLSearchParams(location.search).get("scenario") || "all",
};

window.__VERTICAL_DIG_BEFORE_AFTER_REVIEW__ = {
  ready: false,
  reviewOnly: true,
  productionChanged: false,
  getSnapshot: () => ({
    ready: window.__VERTICAL_DIG_BEFORE_AFTER_REVIEW__.ready,
    reviewOnly: state.config?.reviewOnly === true,
    productionChanged: state.config?.productionChanged === true,
    scenarioCount: state.config?.scenarios?.length || 0,
    approvedIds: [...state.approved],
    filter: state.filter,
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
  try {
    localStorage.setItem(storageKey, JSON.stringify([...state.approved]));
  } catch {}
}

function updateSummary() {
  const selected = state.config.scenarios.filter(({ id }) => state.approved.has(id));
  elements.summary.textContent = selected.length
    ? selected.map(({ rank, shortTitle }) => `#${rank} ${shortTitle}`).join(" · ")
    : "Nothing approved yet";
}

function metricChips(scenario) {
  const metric = state.metrics.scenarios[scenario.id];
  const before = metric.before;
  const after = metric.after;
  const intrusion = `${metric.currentOpaqueTileIntrusionPixels} → ${metric.proposedOpaqueTileIntrusionPixels}`;
  return `
    <span>${metric.currentSpriteOffsetPx.magnitude.toFixed(1)} → 0 px sprite translation</span>
    <span>${before.medianVisibleHeightPx.toFixed(1)} → ${after.medianVisibleHeightPx.toFixed(1)} px median body</span>
    <span>${intrusion} opaque tile-overlap pixels</span>
    <span>${after.bottomDriftSourcePx.toFixed(1)} px proposed baseline drift</span>
  `;
}

function createCard(scenario) {
  const article = document.createElement("article");
  article.className = "review-card";
  article.dataset.scenario = scenario.id;
  article.innerHTML = `
    <header>
      <div class="rank">${scenario.rank}</div>
      <div><p>${scenario.movement ? "MOVING DIAGONAL" : "STATIONARY"}</p><h2>${scenario.label}</h2></div>
      <span class="status">Review</span>
    </header>
    <a class="visual" href="${scenario.output}" aria-label="Open ${scenario.label} comparison full size">
      <img src="${scenario.output}" alt="Synchronized Before and After animation for ${scenario.label}">
    </a>
    <div class="legend">
      <span><i class="collider"></i>31×75 body</span>
      <span><i class="anchor"></i>sprite foot anchor</span>
      <span><i class="bounds"></i>visible silhouette</span>
      <span><i class="impact"></i>contact face</span>
    </div>
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
  state.filter = state.config.scenarios.some((scenario) => scenario.id === id)
    ? id
    : "all";
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
    fetch(CONFIG_PATH).then((response) => response.json()),
    fetch(METRICS_PATH).then((response) => response.json()),
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
    elements.buttons.append(button);
    elements.grid.append(createCard(scenario));
  });
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.filter));
  });
  updateSummary();
  applyFilter(state.filter);
  window.__VERTICAL_DIG_BEFORE_AFTER_REVIEW__.ready = true;
}

start().catch((error) => {
  console.error(error);
  elements.grid.innerHTML = `<p class="error">Review failed: ${error.message}</p>`;
});
