(function () {
  "use strict";

  const STORAGE_KEY = "player-animation-optimization-500-review-v1:approved";
  const METRIC_SPECS = {
    "stationary-release": {
      key: "stationaryRelease",
      before: "currentContactOffsetPx",
      after: "proposedContactOffsetPx",
      label: "Contact body pull",
      unit: " px"
    },
    "landing-finish": {
      key: "landingFinish",
      before: "currentFinalToIdleDeltaPx",
      after: "proposedFinalToIdleDeltaPx",
      label: "Finish → Idle jump",
      unit: " px"
    },
    "wall-push": {
      key: "wallPush",
      before: "currentLoopMedianHeightPx",
      after: "proposedLoopMedianHeightPx",
      label: "Median loop height",
      unit: " px"
    }
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function loadApprovals() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }

  function saveApprovals(approvals) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...approvals]));
    window.dispatchEvent(new CustomEvent("animation-review-approvals", {
      detail: { approvedIds: [...approvals] }
    }));
  }

  function formatValue(value, unit) {
    const numeric = Number(value);
    return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(1)}${unit}`;
  }

  function cardMarkup(scenario, metrics, approvals) {
    const spec = METRIC_SPECS[scenario.id];
    const scenarioMetrics = metrics[spec.key];
    const approved = approvals.has(scenario.id);
    return `
      <article class="comparison-card" data-scenario="${escapeHtml(scenario.id)}">
        <div class="comparison-copy">
          <div>
            <span class="rank">RANK ${String(scenario.rank).padStart(2, "0")}</span>
            <h3>${escapeHtml(scenario.label)}</h3>
            <p>${escapeHtml(spec.label)} · deterministic source-frame measurement</p>
          </div>
          <div class="metric-pair" aria-label="${escapeHtml(spec.label)}">
            <div>
              <span>Current</span>
              <strong class="before-value">${formatValue(scenarioMetrics[spec.before], spec.unit)}</strong>
            </div>
            <b class="metric-arrow">→</b>
            <div>
              <span>Proposed</span>
              <strong class="after-value">${formatValue(scenarioMetrics[spec.after], spec.unit)}</strong>
            </div>
          </div>
          <button class="button approve-button ${approved ? "approved" : ""}" type="button"
            data-approve="${escapeHtml(scenario.id)}" aria-pressed="${approved}">
            ${approved ? "Approved locally" : "Approve for wiring"}
          </button>
        </div>
        <img class="comparison-visual" src="./${escapeHtml(scenario.output)}"
          alt="Synchronized before and after comparison for ${escapeHtml(scenario.label)}">
        <div class="comparison-notes">
          <div class="before-note">
            <span>BEFORE · CURRENT</span>
            <p>${escapeHtml(scenario.before)}</p>
          </div>
          <div class="after-note">
            <span>AFTER · PROPOSED</span>
            <p>${escapeHtml(scenario.after)}</p>
          </div>
        </div>
      </article>`;
  }

  function render(container, scenarios, metrics) {
    const approvals = loadApprovals();
    container.innerHTML = scenarios
      .sort((left, right) => left.rank - right.rank)
      .map((scenario) => cardMarkup(scenario, metrics, approvals))
      .join("");
    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-approve]");
      if (!button) return;
      const id = button.dataset.approve;
      if (approvals.has(id)) approvals.delete(id);
      else approvals.add(id);
      const approved = approvals.has(id);
      button.classList.toggle("approved", approved);
      button.setAttribute("aria-pressed", String(approved));
      button.textContent = approved ? "Approved locally" : "Approve for wiring";
      saveApprovals(approvals);
    });
    return approvals;
  }

  window.AnimationComparisons = { render, loadApprovals };
}());
