import { prepareSearchEntry, searchWiki, normalizeSearch } from "./search.js?v=20260907-guide1";

export function initializeWikiSearch() {
  const input = document.querySelector("[data-wiki-search]");
  const panel = document.querySelector("[data-search-results]");
  const list = panel.querySelector("ol");
  const status = panel.querySelector("[data-search-status]");
  const entries = [];
  for (const section of document.querySelectorAll(".wiki-section:not([data-nosnippet])")) {
    const category = section.querySelector("h2").textContent;
    const intro = section.querySelector(".section-intro")?.textContent || "";
    entries.push(prepareSearchEntry({ id: section.id, title: category, category: "Guide", keywords: section.dataset.search, body: intro }));
    const parts = section.querySelectorAll("article, details, tbody tr, .control, .steps li");
    parts.forEach((part, index) => {
      const heading = part.querySelector("h3, summary, strong, kbd");
      const cells = [...part.querySelectorAll("td")];
      const title = heading?.textContent || (cells.length ? cells.slice(0, 2).map(cell => cell.textContent).join(" · ") : part.textContent);
      part.id ||= `${section.id}-${normalizeSearch(title).replaceAll(" ", "-").slice(0, 70)}-${index}`;
      entries.push(prepareSearchEntry({ id: part.id, title: title.trim(), category,
        keywords: part.dataset.search || "", body: cells.length ? cells.map(cell => cell.textContent.trim()).join(" · ")
          : [...part.querySelectorAll("p:not(.meta)")].map(p => p.textContent.trim()).join(" ")
            || part.textContent.replace(heading?.textContent || "", "").trim() }));
    });
  }

  function close(returnFocus = false) {
    if (returnFocus) input.focus({ preventScroll: true });
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }
  function highlight(parent, value, words) {
    for (const token of value.split(/(\b[\w]+\b)/)) {
      if (words.includes(normalizeSearch(token))) {
        const mark = document.createElement("mark"); mark.textContent = token; parent.append(mark);
      } else parent.append(document.createTextNode(token));
    }
  }
  function show() {
    const query = input.value.trim().slice(0, 160);
    list.replaceChildren();
    if (!query) { close(); return; }
    const results = searchWiki(entries, query);
    document.body.classList.remove("nav-open");
    document.querySelector("[data-nav-toggle]")?.setAttribute("aria-expanded", "false");
    status.textContent = results.length ? `${results.length} answers · best matches first` : `No answers for “${query}”`;
    panel.querySelector("[data-search-empty]").hidden = results.length > 0;
    for (const result of results.slice(0, 15)) {
      const item = document.createElement("li");
      const link = document.createElement("a"); link.href = `#${result.id}`;
      const category = document.createElement("span"); category.className = "search-category"; category.textContent = result.category;
      const title = document.createElement("strong"); highlight(title, result.title, result.matched);
      const snippet = document.createElement("p");
      const body = result.body.replace(/\s+/g, " ");
      const firstMatch = body.toLowerCase().search(new RegExp(result.matched.filter(Boolean).join("|"), "i"));
      const start = firstMatch > 160 ? Math.max(0, body.lastIndexOf(" ", firstMatch - 55)) : 0;
      const excerpt = body.slice(start, start + 230).trim();
      highlight(snippet, `${start ? "…" : ""}${excerpt}${body.length > start + 230 ? "…" : ""}`, result.matched);
      link.append(category, title, snippet);
      link.addEventListener("click", () => {
        close();
        const target = document.getElementById(result.id);
        if (target.tagName === "DETAILS") target.open = true;
        target.setAttribute("tabindex", "-1");
        requestAnimationFrame(() => { target.scrollIntoView({ block: "start" }); target.focus({ preventScroll: true }); });
      });
      item.append(link); list.append(item);
    }
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }
  input.addEventListener("input", show);
  input.addEventListener("focus", () => { if (input.value.trim()) show(); });
  input.addEventListener("keydown", event => {
    const first = list.querySelector("a");
    if (event.key === "ArrowDown" && first && !panel.hidden) { event.preventDefault(); first.focus(); }
    if (event.key === "Enter" && first && !panel.hidden) { event.preventDefault(); first.click(); }
  });
  panel.addEventListener("keydown", event => {
    const links = [...list.querySelectorAll("a")];
    const index = links.indexOf(document.activeElement);
    if (index < 0 || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const next = index + (event.key === "ArrowDown" ? 1 : -1);
    if (next < 0) input.focus(); else links[Math.min(next, links.length - 1)]?.focus();
  });
  document.addEventListener("keydown", event => {
    const typing = document.activeElement?.matches("input, textarea, select, [contenteditable=true]");
    if ((event.key === "/" && !typing) || ((event.ctrlKey || event.metaKey) && event.key === "k")) {
      event.preventDefault(); input.focus(); input.select();
    }
    if (event.key === "Escape" && !panel.hidden) { event.preventDefault(); close(true); }
  });
  document.addEventListener("click", event => {
    if (!panel.contains(event.target) && !event.target.closest("[data-wiki-search], [data-search-open], [data-search-query]")) close();
  });
  document.querySelector("[data-search-close]").addEventListener("click", () => {
    input.value = ""; close(true);
  });
  for (const button of document.querySelectorAll("[data-search-query], [data-search-open]")) {
    button.addEventListener("click", () => {
      if (button.dataset.searchQuery) input.value = button.dataset.searchQuery;
      input.focus(); show();
    });
  }
  // Links to FAQ answers also expand correctly when opened in a fresh tab.
  const revealHash = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (target?.tagName === "DETAILS") target.open = true;
  };
  window.addEventListener("hashchange", revealHash);
  revealHash();
  const initialQuery = new URLSearchParams(location.search).get("q");
  if (initialQuery) { input.value = initialQuery.slice(0, 160); show(); }
}
