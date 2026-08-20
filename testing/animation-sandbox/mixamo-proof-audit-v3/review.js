import { PROOFS, PROOF_GROUPS } from "./proof-data.js";
import { CURRENT } from "../mixamo-atlas-v2/current-assets.js";
import { startSpriteRenderer } from "../mixamo-atlas-v2/sprite-renderer.js";

const storageKey = "dig-game-mixamo-atlas-v2-verdicts";
let verdicts = {};
try { verdicts = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { verdicts = {}; }

const audit = document.querySelector("#audit");
const stats = document.querySelector("#stats");
const result = document.querySelector("#result");
const search = document.querySelector("#search");
const groupFilter = document.querySelector("#group-filter");
const verdictFilter = document.querySelector("#verdict-filter");
const groupLabels = new Map(PROOF_GROUPS.map((group) => [group.id, group.label]));

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function currentStage(key) {
  const clip = CURRENT[key] || CURRENT.idle;
  return `<div class="stage"><canvas width="260" height="260" data-current="${escapeHtml(key)}" aria-label="${escapeHtml(clip.label)} animated current runtime preview"></canvas><span class="stage-label">${escapeHtml(clip.label)}</span></div>`;
}

function candidateStage(proof) {
  return `<div class="stage"><img src="${escapeHtml(proof.preview)}" alt="${escapeHtml(proof.title)} on the Survival V4 character" loading="lazy"><span class="stage-label">Survival V4 · matched render · infinite</span></div>`;
}

function verdictButtons(proof) {
  const selected = verdicts[proof.id] || "unreviewed";
  return ["accept", "maybe", "reject"].map((verdict) =>
    `<button type="button" data-action="verdict" data-id="${escapeHtml(proof.id)}" data-verdict="${verdict}" aria-pressed="${selected === verdict}">${verdict[0].toUpperCase()}${verdict.slice(1)}</button>`
  ).join("");
}

function row(proof) {
  const verdict = verdicts[proof.id] || "unreviewed";
  const reference = proof.referenceOnly ? " reference" : "";
  return `<article class="audit-row" data-id="${escapeHtml(proof.id)}" data-group="${escapeHtml(proof.group)}" data-verdict="${verdict}">
    <header class="row-head"><div><p class="eyebrow">${escapeHtml(groupLabels.get(proof.group))}</p><h3>${escapeHtml(proof.title)}</h3><p>${escapeHtml(proof.role)}</p></div><span class="recommend">${escapeHtml(proof.recommendation)}</span></header>
    <div class="comparison">${currentStage(proof.currentKey)}${candidateStage(proof)}</div>
    <footer class="row-foot"><div><p class="row-note${reference}">${escapeHtml(proof.description)}</p><div class="proof-meta"><span>Survival mesh + rig</span><span>V4 light/material</span><span>infinite replay</span>${proof.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div></div><div class="verdicts">${verdictButtons(proof)}</div></footer>
  </article>`;
}

function renderStats() {
  const accepted = PROOFS.filter((proof) => verdicts[proof.id] === "accept").length;
  stats.innerHTML = [
    [PROOFS.length, "matched V4 proofs"], [PROOF_GROUPS.length, "game families"],
    [PROOFS.length, "infinite replays"], [0, "generic previews"], [accepted, "accepted locally"],
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function applyFilters() {
  const query = search.value.trim().toLowerCase();
  const group = groupFilter.value;
  const verdict = verdictFilter.value;
  let visible = 0;
  document.querySelectorAll(".audit-row").forEach((element) => {
    const proof = PROOFS.find((item) => item.id === element.dataset.id);
    const haystack = [proof.title, proof.role, proof.description, proof.recommendation, ...proof.tags].join(" ").toLowerCase();
    const matches = (!query || haystack.includes(query))
      && (group === "all" || proof.group === group)
      && (verdict === "all" || (verdicts[proof.id] || "unreviewed") === verdict);
    element.hidden = !matches;
    if (matches) visible += 1;
  });
  result.textContent = `${visible} shown · ${PROOFS.length} matched proofs · verdicts stay browser-local`;
}

groupFilter.innerHTML = `<option value="all">All families</option>` + PROOF_GROUPS.map((group) =>
  `<option value="${group.id}">${escapeHtml(group.label)}</option>`
).join("");
audit.innerHTML = PROOFS.map(row).join("");
renderStats();
applyFilters();
startSpriteRenderer();

[search, groupFilter, verdictFilter].forEach((control) => control.addEventListener("input", applyFilters));
audit.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='verdict']");
  if (!button) return;
  const { id, verdict } = button.dataset;
  verdicts[id] = verdicts[id] === verdict ? "unreviewed" : verdict;
  localStorage.setItem(storageKey, JSON.stringify(verdicts));
  const article = button.closest(".audit-row");
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

globalThis.__MIXAMO_PROOF_AUDIT_V3__ = Object.freeze({
  reviewOnly: true,
  productionChanged: false,
  runtimeWired: false,
  proofCount: PROOFS.length,
  infiniteCount: PROOFS.filter((proof) => proof.infiniteReplay).length,
  genericPreviewCount: 0,
});
