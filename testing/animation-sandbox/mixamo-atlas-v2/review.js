import { GROUPS } from "./atlas-schema.js";
import { GROUND } from "./data-ground.js";
import { CROUCH } from "./data-crouch.js";
import { AIR } from "./data-air.js";
import { COMBAT } from "./data-combat.js";
import { ABILITIES } from "./data-abilities.js";
import { REACTIONS } from "./data-reactions.js";
import { IDLES } from "./data-idle.js";
import { CURRENT } from "./current-assets.js";
import { startSpriteRenderer } from "./sprite-renderer.js";

const candidates = Object.freeze([
  ...GROUND, ...CROUCH, ...AIR, ...COMBAT, ...ABILITIES, ...REACTIONS, ...IDLES,
]);
if (candidates.length !== 130) throw new Error(`Atlas contract expected 130 candidates, got ${candidates.length}`);

const storageKey = "dig-game-mixamo-atlas-v2-verdicts";
let verdicts = {};
try { verdicts = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { verdicts = {}; }

const atlas = document.querySelector("#atlas");
const featured = document.querySelector("#featured");
const stats = document.querySelector("#stats");
const resultLine = document.querySelector("#result-line");
const search = document.querySelector("#search");
const groupFilter = document.querySelector("#group-filter");
const stageFilter = document.querySelector("#stage-filter");
const verdictFilter = document.querySelector("#verdict-filter");
const groupLabels = new Map(GROUPS.map((group) => [group.id, group.label]));

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function stageLabel(stage) {
  return stage === "v4" ? "V4 character proof" : stage === "gated" ? "V4 gate failed" : "Source scout";
}

function media(candidate) {
  const source = candidate.localGif || candidate.sourceGif;
  return source
    ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(candidate.title)} animated preview" loading="lazy">`
    : `<span>Preview unavailable</span>`;
}

function currentStage(key) {
  const clip = CURRENT[key] || CURRENT.idle;
  return `<div class="preview-box"><canvas width="220" height="220" data-current="${escapeHtml(key)}" aria-label="${escapeHtml(clip.label)} animated current runtime preview"></canvas><span class="preview-label">${escapeHtml(clip.label)}</span></div>`;
}

function candidateStage(candidate) {
  const label = candidate.stage === "v4"
    ? "V4 character · matched render"
    : candidate.stage === "gated" ? "Mixamo source · gate failed" : "Mixamo source · motion only";
  return `<div class="preview-box">${media(candidate)}<span class="preview-label">${label}</span></div>`;
}

function verdictButtons(candidate) {
  const selected = verdicts[candidate.id] || "unreviewed";
  return ["accept", "maybe", "reject"].map((verdict) =>
    `<button type="button" data-action="verdict" data-id="${candidate.id}" data-verdict="${verdict}" aria-pressed="${selected === verdict}">${verdict[0].toUpperCase()}${verdict.slice(1)}</button>`
  ).join("");
}

function card(candidate) {
  const verdict = verdicts[candidate.id] || "unreviewed";
  const note = candidate.gate
    ? `<p class="card-copy gate-note"><strong>Rejected by gate:</strong> ${escapeHtml(candidate.gate)}</p>`
    : `<p class="card-copy">${escapeHtml(candidate.description)}</p>`;
  const reference = candidate.referenceOnly
    ? `<p class="card-copy reference">Future deformation reference only—there is no player jump mechanic.</p>` : "";
  return `<article class="candidate-card" data-id="${candidate.id}" data-group="${candidate.group}" data-stage="${candidate.stage}" data-verdict="${verdict}">
    <div class="card-head"><div><p class="eyebrow">${escapeHtml(groupLabels.get(candidate.group))}</p><h3>${escapeHtml(candidate.title)}</h3><p>${escapeHtml(candidate.role)}</p></div><span class="badge badge-${candidate.stage}">${stageLabel(candidate.stage)}</span></div>
    <div class="comparison"><div>${currentStage(candidate.currentKey)}</div><div>${candidateStage(candidate)}</div></div>
    ${note}${reference}
    <div class="tags">${candidate.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    <div class="verdicts">${verdictButtons(candidate)}</div>
  </article>`;
}

function renderFeatured() {
  const ids = ["standard-walk", "slow-run", "unarmed-run", "standard-run", "sprint-forward"];
  const current = `<article class="featured-card">${currentStage("run")}<h3>Current UAL Run</h3><p>Exact runtime reference</p></article>`;
  featured.innerHTML = current + ids.map((id) => {
    const candidate = candidates.find((item) => item.id === id);
    return `<article class="featured-card">${candidateStage(candidate)}<h3>${escapeHtml(candidate.title)}</h3><p>${stageLabel(candidate.stage)}</p></article>`;
  }).join("");
}

function renderStats() {
  const counts = {
    v4: candidates.filter((item) => item.stage === "v4").length,
    source: candidates.filter((item) => item.stage === "source").length,
    gated: candidates.filter((item) => item.stage === "gated").length,
    accepted: Object.values(verdicts).filter((value) => value === "accept").length,
  };
  stats.innerHTML = [
    [candidates.length, "role-mapped candidates"], [GROUPS.length, "game families"],
    [counts.v4, "V4 character proofs"], [counts.source, "source scouts"],
    [counts.gated, "strict gate failures"], [counts.accepted, "accepted locally"],
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function applyFilters() {
  const query = search.value.trim().toLowerCase();
  const group = groupFilter.value;
  const stage = stageFilter.value;
  const verdict = verdictFilter.value;
  let visible = 0;
  document.querySelectorAll(".candidate-card").forEach((element) => {
    const candidate = candidates.find((item) => item.id === element.dataset.id);
    const haystack = [candidate.title, candidate.role, candidate.description, ...candidate.tags].join(" ").toLowerCase();
    const matches = (!query || haystack.includes(query))
      && (group === "all" || candidate.group === group)
      && (stage === "all" || candidate.stage === stage)
      && (verdict === "all" || (verdicts[candidate.id] || "unreviewed") === verdict);
    element.hidden = !matches;
    if (matches) visible += 1;
  });
  resultLine.textContent = `${visible} shown · ${candidates.length} total · verdicts are browser-local`;
}

groupFilter.innerHTML = `<option value="all">All families</option>` + GROUPS.map((group) =>
  `<option value="${group.id}">${group.label}</option>`
).join("");
atlas.innerHTML = candidates.map(card).join("");
renderFeatured();
renderStats();
applyFilters();
startSpriteRenderer();

[search, groupFilter, stageFilter, verdictFilter].forEach((control) => control.addEventListener("input", applyFilters));
atlas.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='verdict']");
  if (!button) return;
  const { id, verdict } = button.dataset;
  verdicts[id] = verdicts[id] === verdict ? "unreviewed" : verdict;
  localStorage.setItem(storageKey, JSON.stringify(verdicts));
  const article = button.closest(".candidate-card");
  article.dataset.verdict = verdicts[id];
  article.querySelectorAll(".verdicts button").forEach((item) => item.setAttribute("aria-pressed", String(item.dataset.verdict === verdicts[id])));
  renderStats();
  applyFilters();
});

document.querySelector("#scale-toggle").addEventListener("click", (event) => {
  const inspect = document.body.dataset.scale !== "inspect";
  document.body.dataset.scale = inspect ? "inspect" : "game";
  event.currentTarget.textContent = inspect ? "Game scale 101–123 px" : "Inspection 1.46×";
});

document.querySelector("#clear-verdicts").addEventListener("click", () => {
  verdicts = {};
  localStorage.removeItem(storageKey);
  document.querySelectorAll(".candidate-card").forEach((article) => {
    article.dataset.verdict = "unreviewed";
    article.querySelectorAll(".verdicts button").forEach((button) => button.setAttribute("aria-pressed", "false"));
  });
  renderStats();
  applyFilters();
});

globalThis.__MIXAMO_ATLAS_V2__ = Object.freeze({
  reviewOnly: true,
  productionChanged: false,
  runtimeWired: false,
  candidateCount: candidates.length,
  v4ProofCount: candidates.filter((item) => item.stage === "v4").length,
  sourceScoutCount: candidates.filter((item) => item.stage === "source").length,
  gatedCount: candidates.filter((item) => item.stage === "gated").length,
});
