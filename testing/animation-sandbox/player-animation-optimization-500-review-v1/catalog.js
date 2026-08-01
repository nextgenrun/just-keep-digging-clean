(function () {
  "use strict";

  const PAGE_SIZE = 60;
  const state = {
    catalog: null,
    config: null,
    filtered: [],
    renderLimit: PAGE_SIZE
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function optionMarkup(id, label) {
    return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
  }

  function pointMarkup(point) {
    return `
      <article class="point" data-point="${escapeHtml(point.id)}">
        <div class="point-top">
          <span class="point-id">${escapeHtml(point.id)}</span>
          <span class="pill ${escapeHtml(point.priority)}">${escapeHtml(point.priority)}</span>
          ${point.verifiedHotspot ? '<span class="hotspot">● verified hotspot</span>' : ""}
        </div>
        <h3>${escapeHtml(point.title)}</h3>
        <p>${escapeHtml(point.recommendation)}</p>
        <div class="point-rule">
          <span>PASS RULE · ${escapeHtml(point.metric)}</span>
          <p>${escapeHtml(point.passRule)}</p>
        </div>
      </article>`;
  }

  function controls() {
    return {
      search: document.querySelector("#catalog-search"),
      family: document.querySelector("#family-filter"),
      lens: document.querySelector("#lens-filter"),
      priority: document.querySelector("#priority-filter"),
      count: document.querySelector("#visible-count"),
      list: document.querySelector("#catalog-list"),
      showMore: document.querySelector("#show-more"),
      reset: document.querySelector("#reset-filters")
    };
  }

  function haystack(point) {
    return [
      point.id,
      point.title,
      point.family,
      point.lens,
      point.category,
      point.recommendation,
      point.currentEvidence,
      point.familyTarget,
      point.metric,
      point.passRule
    ].join(" ").toLowerCase();
  }

  function applyFilters(resetLimit = true) {
    const ui = controls();
    const query = ui.search.value.trim().toLowerCase();
    state.filtered = state.catalog.points
      .filter((point) => !ui.family.value || point.familyId === ui.family.value)
      .filter((point) => !ui.lens.value || point.lensId === ui.lens.value)
      .filter((point) => !ui.priority.value || point.priority === ui.priority.value)
      .filter((point) => !query || haystack(point).includes(query))
      .sort((left, right) =>
        Number(right.verifiedHotspot) - Number(left.verifiedHotspot)
        || right.score - left.score
        || left.index - right.index);
    if (resetLimit) state.renderLimit = PAGE_SIZE;
    render();
  }

  function render() {
    const ui = controls();
    const visible = state.filtered.slice(0, state.renderLimit);
    ui.count.textContent = state.filtered.length.toLocaleString();
    ui.list.innerHTML = visible.map(pointMarkup).join("");
    ui.showMore.hidden = visible.length >= state.filtered.length;
    ui.showMore.textContent = `Show ${Math.min(PAGE_SIZE, state.filtered.length - visible.length)} more`;
    window.dispatchEvent(new CustomEvent("animation-review-catalog", {
      detail: {
        visiblePointCount: state.filtered.length,
        renderedPointCount: visible.length
      }
    }));
  }

  function reset() {
    const ui = controls();
    ui.search.value = "";
    ui.family.value = "";
    ui.lens.value = "";
    ui.priority.value = "";
    applyFilters();
  }

  function init(catalog, config) {
    state.catalog = catalog;
    state.config = config;
    const ui = controls();
    ui.family.insertAdjacentHTML(
      "beforeend",
      config.families.map((item) => optionMarkup(item.id, item.label)).join("")
    );
    ui.lens.insertAdjacentHTML(
      "beforeend",
      config.lenses.map((item) => optionMarkup(item.id, item.label)).join("")
    );
    [ui.search, ui.family, ui.lens, ui.priority].forEach((element) => {
      element.addEventListener("input", () => applyFilters());
      element.addEventListener("change", () => applyFilters());
    });
    ui.reset.addEventListener("click", reset);
    ui.showMore.addEventListener("click", () => {
      state.renderLimit += PAGE_SIZE;
      render();
    });
    applyFilters();
  }

  function getVisibleCount() {
    return state.filtered.length;
  }

  window.AnimationCatalog = { init, getVisibleCount };
}());
