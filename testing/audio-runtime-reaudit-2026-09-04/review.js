const $ = id => document.getElementById(id);
const STORE = "understar-active-gametime-audio-reaudit-2026-09-04";
const VOLUME_STORE = "understar-active-gametime-audio-volume-tuning-2026-09-04";
const VALID = new Set(["keep", "reject"]);
const audio = $("audio");
let catalog = null;
let rows = [];
let filtered = [];
let index = 0;
let decisions = {};
let tunings = {};
let playingId = null;
let playbackRequest = 0;

try { decisions = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (_) {}
if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) decisions = {};
try { tunings = JSON.parse(localStorage.getItem(VOLUME_STORE) || "{}"); } catch (_) {}
if (!tunings || typeof tunings !== "object" || Array.isArray(tunings)) tunings = {};

function choice(id) {
  return VALID.has(decisions[id]) ? decisions[id] : "open";
}

function current() {
  return filtered[index] || null;
}

function roundGain(value) {
  return Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 1000) / 1000;
}

function hasTuning(id) {
  return Object.prototype.hasOwnProperty.call(tunings, id) && Number.isFinite(Number(tunings[id]));
}

function tunedGain(item) {
  return roundGain(hasTuning(item.id) ? tunings[item.id] : item.suggestedGain);
}

function gainDb(currentGain, nextGain) {
  if (currentGain <= 0) return 0;
  return nextGain > 0 ? 20 * Math.log10(nextGain / currentGain) : null;
}

function signedDb(value) {
  if (value === null || !Number.isFinite(Number(value))) return "mute";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)} dB`;
}

function tell(message) {
  $("status").textContent = message;
}

function stop() {
  playbackRequest += 1;
  playingId = null;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  $("now").textContent = "Stopped — no audio is playing.";
}

function selectedGain(item) {
  const runtime = Number.isFinite(Number(item.runtimeGain)) ? Math.max(0, Number(item.runtimeGain)) : 0.35;
  return {
    current: runtime,
    suggested: Number.isFinite(Number(item.suggestedGain)) ? Math.max(0, Number(item.suggestedGain)) : runtime,
    tuned: tunedGain(item),
    solo: Math.max(0.5, runtime),
  }[$("gain-mode").value] ?? runtime;
}

function listeningGain(item) {
  return Math.min(1, Number($("master").value) * selectedGain(item));
}

function refreshPlaybackGain() {
  const item = current();
  if (playingId && item) audio.volume = listeningGain(item);
}

async function play() {
  const item = current();
  if (!item) return;
  if (playingId === item.id && !audio.paused) return audio.pause();
  if (playingId !== item.id) {
    stop();
    audio.src = new URL(`/${item.metadata.runtimePreviewPath || item.path}`, location.origin).href;
    playingId = item.id;
  }
  audio.volume = listeningGain(item);
  const request = ++playbackRequest;
  $("now").textContent = `Loading: ${item.title}`;
  try { await audio.play(); } catch (error) {
    if (request !== playbackRequest || error.name === "AbortError") return;
    $("now").textContent = "Playback failed — the file may be unavailable or unsupported.";
  }
}

function addMetadata(label, value, asLink = false) {
  if (value === undefined || value === null || value === "") return;
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  if (asLink) {
    const link = document.createElement("a");
    link.href = value;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = value;
    dd.append(link);
  } else dd.textContent = Array.isArray(value) ? value.join(", ") : String(value);
  $("metadata").append(dt, dd);
}

function decisionCounts() {
  const keep = rows.filter(item => choice(item.id) === "keep").length;
  const reject = rows.filter(item => choice(item.id) === "reject").length;
  return { keep, reject, open: rows.length - keep - reject, reviewed: keep + reject };
}

function updateProgress() {
  const counts = decisionCounts();
  const percentage = rows.length ? counts.reviewed / rows.length * 100 : 0;
  const tuned = rows.filter(item => hasTuning(item.id)).length;
  $("progress-bar").style.width = `${percentage}%`;
  $("summary").textContent = `${counts.reviewed} / ${rows.length} reviewed · ${counts.keep} KEEP · ${counts.reject} REJECT · ${counts.open} unreviewed · ${tuned} volume overrides`;
}

function paint() {
  stop();
  const item = current();
  $("card").hidden = !item;
  $("empty").hidden = Boolean(item);
  $("previous").disabled = !item || index === 0;
  $("next").disabled = !item || index >= filtered.length - 1;
  $("counter").textContent = `${item ? index + 1 : 0} / ${filtered.length} shown`;
  updateProgress();
  if (!item) return;

  const state = choice(item.id);
  $("decision").dataset.state = state;
  $("decision").textContent = state === "open" ? "Unreviewed" : state.toUpperCase();
  $("title").textContent = item.title;
  $("family-copy").textContent = `${item.kind.toUpperCase()} · ${item.families.join(" · ")}`;
  $("current-gain").textContent = Number(item.runtimeGain).toFixed(3);
  $("suggested-gain").textContent = Number(item.suggestedGain).toFixed(3);
  $("suggested-db").textContent = signedDb(Number(item.suggestedDbChange));
  $("tuned-gain").value = tunedGain(item);
  $("tuned-gain-value").textContent = `${tunedGain(item).toFixed(3)} · ${signedDb(gainDb(item.runtimeGain, tunedGain(item)))}`;
  $("volume-reason").textContent = `Starting-point rationale: ${item.volumeReason}. ${hasTuning(item.id) ? "Your override is saved locally." : "No override yet; tuned playback follows the suggestion."}`;
  $("metadata").replaceChildren();
  addMetadata("Runtime file", item.path);
  addMetadata("Available", item.exists ? `${item.byteSize.toLocaleString()} bytes` : "MISSING");
  addMetadata("Current → suggested", `${Number(item.runtimeGain).toFixed(4)} → ${Number(item.suggestedGain).toFixed(4)} (${signedDb(item.suggestedDbChange)})`);
  addMetadata("Final tuned gain", `${tunedGain(item).toFixed(4)} (${signedDb(gainDb(item.runtimeGain, tunedGain(item)))})`);
  addMetadata("Families", item.families);
  addMetadata("Keys", [...new Set(item.routes.map(value => value.key).filter(Boolean))]);
  addMetadata("Live routes", item.routes.map(value => `${value.source}: ${value.role || "general"} @ ${Number(value.gain).toFixed(4)} → ${Number(value.suggestedGain).toFixed(4)}${value.details ? ` (${value.details})` : ""}`));
  addMetadata("Creator", item.metadata.creator);
  addMetadata("Delivery", item.metadata.delivery);
  if (item.metadata.playbackWindow) {
    const window = item.metadata.playbackWindow;
    addMetadata("Current playback", `${Math.round(window.duration * 1000)} ms from ${Math.round(window.start * 1000)} ms in the original, with edge fades. Approval remains attached to the original source.`);
    addMetadata("Unedited recording", `/${item.path}`, true);
  }
  addMetadata("Duration", item.metadata.duration ? `${Number(item.metadata.duration).toFixed(3)} seconds` : null);
  addMetadata("Measured peak", Number.isFinite(Number(item.metadata.peak)) ? Number(item.metadata.peak).toFixed(4) : null);
  addMetadata("Active RMS", Number.isFinite(Number(item.metadata.activeRmsDb)) ? `${Number(item.metadata.activeRmsDb).toFixed(2)} dBFS` : null);
  addMetadata("License", item.licenses);
  addMetadata("Source", item.sourceUrls[0], Boolean(item.sourceUrls[0]));
  $("keep").setAttribute("aria-pressed", String(state === "keep"));
  $("reject").setAttribute("aria-pressed", String(state === "reject"));
  $("clear").setAttribute("aria-pressed", String(state === "open"));
}

function matches(item) {
  const text = $("search").value.trim().toLowerCase();
  const haystack = `${item.title} ${item.path} ${item.kind} ${item.families.join(" ")} ${JSON.stringify(item.metadata)}`.toLowerCase();
  return (!text || haystack.includes(text))
    && (!$("kind").value || item.kind === $("kind").value)
    && (!$("family").value || item.families.includes($("family").value))
    && (!$("filter").value || choice(item.id) === $("filter").value);
}

function filter() {
  filtered = rows.filter(matches);
  index = 0;
  paint();
}

function move(delta) {
  index = Math.max(0, Math.min(filtered.length - 1, index + delta));
  paint();
}

function nextOpen() {
  if (!filtered.length) return;
  for (let offset = 1; offset <= filtered.length; offset += 1) {
    const candidate = (index + offset) % filtered.length;
    if (choice(filtered[candidate].id) === "open") { index = candidate; paint(); return; }
  }
  tell("Every sound in the current filter has a KEEP or REJECT decision.");
}

function decide(value) {
  const item = current();
  if (!item) return;
  if (VALID.has(value)) decisions[item.id] = value;
  else delete decisions[item.id];
  try { localStorage.setItem(STORE, JSON.stringify(decisions)); }
  catch (_) { tell("Browser storage is unavailable; export before leaving."); }
  if (VALID.has(value)) nextOpen();
  else paint();
}

function populateFilters() {
  for (const kind of [...new Set(rows.map(item => item.kind))].sort()) {
    const option = document.createElement("option"); option.value = kind; option.textContent = kind; $("kind").append(option);
  }
  for (const family of [...new Set(rows.flatMap(item => item.families))].sort()) {
    const option = document.createElement("option"); option.value = family; option.textContent = family; $("family").append(option);
  }
}

function setTuning(value) {
  const item = current();
  if (!item) return;
  tunings[item.id] = roundGain(value);
  try { localStorage.setItem(VOLUME_STORE, JSON.stringify(tunings)); }
  catch (_) { tell("Browser storage is unavailable; export before leaving."); }
  $("tuned-gain").value = tunings[item.id];
  $("tuned-gain-value").textContent = `${Number(tunings[item.id]).toFixed(3)} · ${signedDb(gainDb(item.runtimeGain, tunings[item.id]))}`;
  $("volume-reason").textContent = `Starting-point rationale: ${item.volumeReason}. Your override is saved locally.`;
  $("gain-mode").value = "tuned";
  refreshPlaybackGain();
  updateProgress();
}

function toggleComparison() {
  const mode = $("gain-mode").value === "current" ? "suggested" : "current";
  $("gain-mode").value = mode;
  refreshPlaybackGain();
  const item = current();
  if (item) tell(`A/B mode: ${mode} gain ${selectedGain(item).toFixed(3)} (master ${$("master-value").textContent}).`);
}

function exportDecisions() {
  const counts = decisionCounts();
  const volumeOverrides = Object.fromEntries(rows
    .filter(item => hasTuning(item.id))
    .map(item => [item.id, tunedGain(item)]));
  const output = {
    schemaVersion: 2,
    reviewOnly: true,
    runtimeWired: false,
    exportedAt: new Date().toISOString(),
    catalogHash: catalog.catalogHash,
    scope: catalog.scope,
    counts: { ...counts, volumeOverrides: Object.keys(volumeOverrides).length },
    decisions: Object.fromEntries(rows.map(item => [item.id, choice(item.id)])),
    volumeTuning: Object.fromEntries(rows.map(item => [item.id, tunedGain(item)])),
    volumeOverrides,
    items: rows.map(item => ({
      id: item.id,
      path: item.path,
      decision: choice(item.id),
      currentGain: item.runtimeGain,
      suggestedGain: item.suggestedGain,
      suggestedDbChange: item.suggestedDbChange,
      tunedGain: tunedGain(item),
      tunedDbChange: gainDb(item.runtimeGain, tunedGain(item)) === null
        ? null
        : Math.round(gainDb(item.runtimeGain, tunedGain(item)) * 10) / 10,
      tunedByUser: hasTuning(item.id),
    })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = "understar-active-gametime-audio-reaudit.json"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  tell("Exported review-only KEEP/REJECT decisions and volume plan. Runtime audio is unchanged.");
}

async function importDecisions(event) {
  try {
    const file = event.target.files[0];
    if (!file || file.size > 10_000_000) throw new Error("invalid file");
    const input = JSON.parse(await file.text());
    const known = new Set(rows.map(item => item.id));
    let count = 0;
    for (const [id, value] of Object.entries(input.decisions || {})) {
      if (!known.has(id)) continue;
      if (VALID.has(value)) decisions[id] = value;
      else if (value === "open") delete decisions[id];
      else continue;
      count += 1;
    }
    const importedVolumes = input.volumeOverrides ?? input.volumeTuning ?? {};
    let volumeCount = 0;
    for (const [id, value] of Object.entries(importedVolumes)) {
      const numeric = Number(value);
      if (!known.has(id) || !Number.isFinite(numeric) || numeric < 0 || numeric > 1) continue;
      tunings[id] = roundGain(numeric);
      volumeCount += 1;
    }
    localStorage.setItem(STORE, JSON.stringify(decisions));
    if (Object.keys(tunings).length) localStorage.setItem(VOLUME_STORE, JSON.stringify(tunings));
    filter();
    tell(`Imported ${count} matching decisions and ${volumeCount} volume overrides${input.catalogHash !== catalog.catalogHash ? " from a different catalog revision" : ""}.`);
  } catch (_) { tell("Import failed; existing decisions are unchanged."); }
  event.target.value = "";
}

$("previous").onclick = () => move(-1);
$("next").onclick = () => move(1);
$("next-open").onclick = nextOpen;
$("play").onclick = play;
$("stop").onclick = stop;
$("keep").onclick = () => decide("keep");
$("reject").onclick = () => decide("reject");
$("clear").onclick = () => decide("open");
$("search").oninput = filter;
$("kind").onchange = filter;
$("family").onchange = filter;
$("filter").onchange = filter;
$("gain-mode").onchange = refreshPlaybackGain;
$("compare").onclick = toggleComparison;
$("master").oninput = () => { $("master-value").textContent = `${Math.round(Number($("master").value) * 100)}%`; refreshPlaybackGain(); };
$("tuned-gain").oninput = event => setTuning(event.target.value);
$("use-suggested").onclick = () => { const item = current(); if (item) setTuning(item.suggestedGain); };
$("use-current").onclick = () => { const item = current(); if (item) setTuning(item.runtimeGain); };
$("export").onclick = exportDecisions;
$("import").onclick = () => $("file").click();
$("file").onchange = importDecisions;
$("reset-decisions").onclick = () => {
  if (!confirm("Clear every KEEP/REJECT decision in this local re-audit?")) return;
  decisions = {}; localStorage.removeItem(STORE); filter(); tell("Fresh re-audit restored; gameplay remains unchanged.");
};
$("reset-volumes").onclick = () => {
  if (!confirm("Clear every saved volume override and return to the suggested starting gains?")) return;
  tunings = {}; localStorage.removeItem(VOLUME_STORE); filter(); tell("Volume overrides cleared; suggested starting gains restored. Gameplay remains unchanged.");
};

audio.onplaying = () => {
  const item = current();
  $("now").textContent = `Playing: ${item?.title} · ${$("gain-mode").value} ${selectedGain(item).toFixed(3)} · output ${Math.round(audio.volume * 100)}%`;
};
audio.onpause = () => { if (playingId) $("now").textContent = `Paused: ${current()?.title}`; };
audio.onended = () => { $("now").textContent = `Finished: ${current()?.title}`; };
audio.onerror = () => { if (playingId) $("now").textContent = "Playback failed — verify the runtime file."; };
document.addEventListener("keydown", event => {
  if (/INPUT|SELECT|TEXTAREA|AUDIO/.test(event.target.tagName) || event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;
  if (event.key === " " && /BUTTON|A/.test(event.target.tagName)) return;
  const action = { h: () => move(-1), j: () => move(1), n: nextOpen, k: () => decide("keep"), r: () => decide("reject"), u: () => decide("open"), v: toggleComparison, " ": play, "0": stop, escape: stop }[event.key.toLowerCase()];
  if (action) { event.preventDefault(); action(); }
});
window.addEventListener("pagehide", stop);
document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });

try {
  const response = await fetch("catalog.json", { cache: "no-store" });
  if (!response.ok) throw new Error("catalog unavailable");
  catalog = await response.json();
  rows = catalog.items;
  populateFilters();
  filtered = [...rows];
  const firstOpen = filtered.findIndex(item => choice(item.id) === "open");
  index = Math.max(0, firstOpen);
  tell(`${catalog.counts.total.toLocaleString()} active physical clips · ${catalog.counts.missing} missing · fresh KEEP/REJECT + volume ledger`);
  paint();
} catch (_) {
  tell("Catalog unavailable. Run the catalog builder and start canonical serve.py from the repository root.");
}
