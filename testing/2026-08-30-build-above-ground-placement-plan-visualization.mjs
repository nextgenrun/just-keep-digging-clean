import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildAboveGroundPlacementPlanData } from
  "./2026-08-30-above-ground-placement-plan-data.js";

const outputPath = process.argv[2];
if (!outputPath) throw new Error("Provide the destination HTML fragment path.");
const data = buildAboveGroundPlacementPlanData();
const { plan, review, records, summary } = data;
const esc = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const chart = Object.freeze({ width: 1420, height: 570, left: 86, right: 18, top: 50, bottom: 42 });
const minX = plan.bufferSpan.leftTile;
const maxX = plan.bufferSpan.rightTileExclusive;
const minY = review.map.topTile;
const maxY = review.map.bottomTileExclusive;
const plotWidth = chart.width - chart.left - chart.right;
const plotHeight = chart.height - chart.top - chart.bottom;
const sx = value => chart.left + (value - minX) / (maxX - minX) * plotWidth;
const sy = value => chart.top + (value - minY) / (maxY - minY) * plotHeight;
const familyClass = family => family.replaceAll(/[^a-z0-9-]/gi, "-");

const phaseAreas = plan.slices.map((phase, index) => (
  `<rect class="phase-area phase-${index + 1}" data-phase-area="${phase.id}" `
  + `x="${sx(phase.leftTile).toFixed(2)}" y="${chart.top}" `
  + `width="${(sx(phase.rightTileExclusive) - sx(phase.leftTile)).toFixed(2)}" `
  + `height="${plotHeight}" style="--phase-color:var(--viz-series-${index + 1})"/>`
)).join("");

const lanes = [
  ["Runtime buffer", -40, 0],
  ["High sky", 0, 23.5],
  ["Heavenblocks", 23.5, 40],
  ["Lower sky", 40, 55],
  ["Surface air", 55, 65],
  ["Surface facade", 65, 75],
].map(([label, top, bottom], index) => (
  `<g class="lane lane-${index}"><rect x="${chart.left}" y="${sy(top).toFixed(2)}" `
  + `width="${plotWidth}" height="${(sy(bottom) - sy(top)).toFixed(2)}"/>`
  + `<text x="${chart.left - 8}" y="${(sy(top) + 14).toFixed(2)}">${label}</text></g>`
)).join("");

const xTicks = Array.from({ length: 18 }, (_, index) => -40 + index * 20).map(tile => (
  `<g class="axis-tick"><line x1="${sx(tile).toFixed(2)}" y1="${chart.top}" `
  + `x2="${sx(tile).toFixed(2)}" y2="${chart.top + plotHeight}"/>`
  + `<text x="${sx(tile).toFixed(2)}" y="${chart.height - 14}">${tile}</text></g>`
)).join("");

const chapterMarkers = data.chapters.map(chapter => (
  `<g class="chapter-marker"><line x1="${sx(chapter.tileX).toFixed(2)}" y1="${chart.top}" `
  + `x2="${sx(chapter.tileX).toFixed(2)}" y2="${chart.top + plotHeight}"/>`
  + `<title>${esc(chapter.label)} · tile ${chapter.tileX}</title></g>`
)).join("");

const constraintMarkup = [
  ...data.constraints.protected.map(zone => ({ ...zone, type: "protected" })),
  ...data.constraints.lowProfile.map(zone => ({ ...zone, type: "low-profile" })),
].map(zone => {
  const yTop = zone.type === "protected" ? 59.2 : 54.8;
  const yBottom = 65;
  return `<rect class="constraint ${zone.type}" x="${sx(zone.leftTile).toFixed(2)}" `
    + `y="${sy(yTop).toFixed(2)}" width="${(sx(zone.rightTile) - sx(zone.leftTile)).toFixed(2)}" `
    + `height="${(sy(yBottom) - sy(yTop)).toFixed(2)}"><title>${esc(zone.id)}</title></rect>`;
}).join("");

function backgroundMarkup(record) {
  const x = sx(record.x);
  const y = sy(record.y);
  const width = Math.max(1.4, sx(record.x + record.width) - x);
  const height = Math.max(2, sy(record.y + record.height) - y);
  return `<rect class="record background ${familyClass(record.family)}" data-record-id="${esc(record.id)}" `
    + `data-kind="background" data-phase="${record.phaseId}" data-status="${record.status}" `
    + `x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}">`
    + `<title>${esc(record.label)} · ${esc(record.status)}</title></rect>`;
}

function propMarkup(record) {
  const x = sx(record.anchorX);
  const y = sy(record.anchorY);
  const common = `class="record prop ${familyClass(record.family)}" data-record-id="${esc(record.id)}" `
    + `data-kind="prop" data-phase="${record.phaseId}" data-status="${record.status}"`;
  const title = `<title>${esc(record.label)} · tile ${record.anchorX.toFixed(2)}, ${record.anchorY.toFixed(2)}</title>`;
  if (record.family === "generated-sky-prop") {
    return `<path ${common} d="M ${x} ${y - 4} L ${x + 4} ${y} L ${x} ${y + 4} L ${x - 4} ${y} Z">${title}</path>`;
  }
  if (record.family === "retained-authored-prop") {
    return `<rect ${common} x="${(x - 3).toFixed(2)}" y="${(y - 3).toFixed(2)}" width="6" height="6">${title}</rect>`;
  }
  if (record.family === "hero-landmark") {
    return `<path ${common} d="M ${x} ${y - 7} L ${x + 7} ${y + 6} L ${x - 7} ${y + 6} Z">${title}</path>`;
  }
  return `<circle ${common} cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3">${title}</circle>`;
}

const recordMarkup = records.map(record => (
  record.kind === "background" ? backgroundMarkup(record) : propMarkup(record)
)).join("");

const phaseCards = summary.phases.map(phase => (
  `<button class="phase-card" type="button" data-phase-button="${phase.id}">`
  + `<span class="phase-number">${phase.order}</span><span><strong>${esc(phase.label)}</strong>`
  + `<small>tiles ${phase.leftTile}–${phase.rightTileExclusive} · ${phase.backgroundCount} bg · ${phase.propCount} props</small>`
  + `<span>${esc(phase.intent)}</span><em>Gate: ${esc(phase.gate)}</em></span></button>`
)).join("");

const phaseOptions = ["<option value=\"all\">Whole map</option>", ...summary.phases.map(phase => (
  `<option value="${phase.id}">${phase.order}. ${esc(phase.label)}</option>`
))].join("");
const serialized = JSON.stringify(data).replaceAll("<", "\\u003c");

const fragment = `<div id="above-ground-placement-plan-v1" data-filter="all" data-show-nonactive="true">
<style>
#above-ground-placement-plan-v1{box-sizing:border-box;max-width:1600px;margin:0 auto;padding:clamp(14px,2.2vw,28px);color:var(--foreground);background:var(--background);font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.45}
#above-ground-placement-plan-v1 *{box-sizing:border-box}.plan-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end;margin-bottom:18px}.eyebrow{margin:0 0 6px;color:var(--primary);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.plan-head h1{margin:0;font-size:clamp(26px,4vw,48px);line-height:1.05;letter-spacing:-.035em}.lede{max-width:780px;margin:10px 0 0;color:var(--muted-foreground)}.stats{display:grid;grid-template-columns:repeat(3,minmax(96px,1fr));gap:8px}.stat{padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:var(--card);min-width:112px}.stat b{display:block;font-size:23px;line-height:1}.stat span{display:block;margin-top:5px;color:var(--muted-foreground);font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:14px;background:var(--card);margin-bottom:12px}.filter-group{display:flex;gap:4px}.filter-group button,.toolbar select{border:1px solid var(--border);border-radius:9px;background:var(--background);color:var(--foreground);padding:8px 11px;font:inherit;font-size:13px}.filter-group button[aria-pressed=true]{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}.toolbar label{display:flex;gap:7px;align-items:center;color:var(--muted-foreground);font-size:13px}.toolbar select{min-width:200px}.map-shell{border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--card)}.map-caption{display:flex;justify-content:space-between;gap:12px;padding:10px 13px;border-bottom:1px solid var(--border);color:var(--muted-foreground);font-size:12px}.map-viewport{overflow-x:auto}.map-viewport svg{display:block;width:100%;min-width:1100px;height:auto;background:var(--background)}
.lane rect{fill:var(--card);opacity:.32}.lane:nth-child(even) rect{fill:var(--muted);opacity:.22}.lane text{fill:var(--muted-foreground);font-size:10px;text-anchor:end}.axis-tick line{stroke:var(--border);stroke-width:1;opacity:.55}.axis-tick text{fill:var(--muted-foreground);font-size:10px;text-anchor:middle}.chapter-marker line{stroke:var(--foreground);stroke-width:.7;stroke-dasharray:2 7;opacity:.18}.phase-area{fill:var(--phase-color);opacity:.045;stroke:var(--phase-color);stroke-width:1;vector-effect:non-scaling-stroke}.phase-area.is-selected{opacity:.12;stroke-width:2}.constraint{fill:none;vector-effect:non-scaling-stroke}.constraint.protected{stroke:var(--destructive);stroke-width:1.5;stroke-dasharray:4 3}.constraint.low-profile{stroke:var(--warning,var(--viz-series-4));stroke-width:1.4;stroke-dasharray:2 3}
.record{cursor:pointer;vector-effect:non-scaling-stroke;transition:opacity .15s ease,filter .15s ease}.record:hover,.record.is-selected{filter:brightness(1.35);stroke:var(--foreground);stroke-width:1.6}.background{stroke:var(--border);stroke-width:.55;opacity:.44}.sky-foundation{fill:var(--background);opacity:.2}.sky-cohesion-card{fill:var(--viz-series-1)}.v11-terrain-card{fill:var(--viz-series-2)}.v11-obsolete-sky{fill:var(--muted);stroke-dasharray:3 3}.surface-far-repeat,.sky-island-far-repeat{fill:var(--viz-series-3);opacity:.2}.surface-edge-repeat{fill:var(--viz-series-4);opacity:.9}.ground-variation-repeat{fill:var(--viz-series-5);opacity:.7}.town-pack{fill:var(--primary);stroke:var(--primary);opacity:.48}.record[data-status=locked]{fill:none;stroke:var(--primary);stroke-width:2.4;opacity:1}.record[data-status=excluded],.record[data-status=suppressed]{opacity:.13;stroke-dasharray:4 3}.record[data-status=fallback]{opacity:.2}.prop{stroke:var(--background);stroke-width:1;opacity:.9}.generated-surface-prop{fill:var(--viz-series-7)}.generated-sky-prop{fill:var(--viz-series-6)}.retained-authored-prop{fill:var(--viz-series-8)}.hero-landmark{fill:var(--primary);stroke:var(--primary-foreground);stroke-width:1.5}
#above-ground-placement-plan-v1[data-filter=background] .record[data-kind=prop],#above-ground-placement-plan-v1[data-filter=prop] .record[data-kind=background]{display:none}#above-ground-placement-plan-v1[data-show-nonactive=false] .record[data-status=excluded],#above-ground-placement-plan-v1[data-show-nonactive=false] .record[data-status=suppressed]{display:none}.record.is-outside-phase{opacity:.035!important;pointer-events:none}.detail{display:grid;grid-template-columns:minmax(150px,.55fr) minmax(0,1.45fr);gap:12px;margin:12px 0 18px;padding:13px 15px;border:1px solid var(--border);border-radius:13px;background:var(--card)}.detail b{display:block}.detail small,.detail span{color:var(--muted-foreground);font-size:12px}.detail-path{overflow-wrap:anywhere}.plan-section h2{font-size:18px;margin:0 0 10px}.phase-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.phase-card{display:grid;grid-template-columns:30px 1fr;gap:10px;text-align:left;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--card);color:var(--foreground);font:inherit;cursor:pointer}.phase-card:hover,.phase-card.is-selected{border-color:var(--primary)}.phase-card .phase-number{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--primary);color:var(--primary-foreground);font-weight:800}.phase-card strong,.phase-card small,.phase-card span,.phase-card em{display:block}.phase-card small{margin:2px 0 6px;color:var(--muted-foreground)}.phase-card span{font-size:12px}.phase-card em{margin-top:6px;color:var(--muted-foreground);font-size:11px;font-style:normal}.legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:12px;padding:10px 12px;border-top:1px solid var(--border);color:var(--muted-foreground);font-size:11px}.key{display:inline-flex;gap:6px;align-items:center}.swatch{width:10px;height:10px;border-radius:2px;background:var(--swatch)}.note{margin:10px 0 0;color:var(--muted-foreground);font-size:11px}
@media(max-width:900px){.plan-head{grid-template-columns:1fr}.stats{max-width:520px}.phase-grid{grid-template-columns:1fr}}@media(max-width:560px){#above-ground-placement-plan-v1{padding:12px}.stats{grid-template-columns:repeat(3,1fr)}.stat{min-width:0;padding:9px}.stat b{font-size:18px}.toolbar{align-items:stretch}.filter-group{width:100%}.filter-group button{flex:1}.toolbar select{width:100%}.detail{grid-template-columns:1fr}.map-caption{display:block}.map-caption span{display:block;margin-top:3px}}
</style>
<header class="plan-head"><div><p class="eyebrow">Runtime-sourced merge blueprint · review only</p><h1>Above-ground placement plan</h1><p class="lede">One complete coordinate map for every background instance and prop already composed by the runtime mockup. Spatial ownership is split into seven mergeable slices; shared scenic systems land once as the foundation.</p></div><div class="stats"><div class="stat"><b>${summary.totalRecords}</b><span>mapped records</span></div><div class="stat"><b>${summary.props}</b><span>prop placements</span></div><div class="stat"><b>${plan.slices.length}</b><span>merge slices</span></div></div></header>
<div class="toolbar"><div class="filter-group" aria-label="Map record filter"><button type="button" data-filter-button="all" aria-pressed="true">All</button><button type="button" data-filter-button="background" aria-pressed="false">Backgrounds</button><button type="button" data-filter-button="prop" aria-pressed="false">Props</button></div><select id="plan-phase-select" aria-label="Highlight merge slice">${phaseOptions}</select><label><input id="plan-nonactive-toggle" type="checkbox" checked> Show 33 excluded + 28 suppressed background records</label></div>
<section class="map-shell" aria-label="Above-ground world placement map"><div class="map-caption"><strong>Tiles −40…308 · authored play span 0…280</strong><span>Outlined zones are runtime clear/low-profile constraints · click a map item for source details</span></div><div class="map-viewport"><svg id="placement-world-map" viewBox="0 0 ${chart.width} ${chart.height}" role="img" aria-labelledby="placement-map-title placement-map-desc"><title id="placement-map-title">Complete above-ground background and prop placement map</title><desc id="placement-map-desc">A tile-coordinate map of 247 background instances and 253 prop placements, divided into seven proposed merge slices.</desc>${lanes}${phaseAreas}${xTicks}${chapterMarkers}${recordMarkup}${constraintMarkup}</svg></div><div class="legend"><span class="key"><i class="swatch" style="--swatch:var(--viz-series-1)"></i>Sky cards</span><span class="key"><i class="swatch" style="--swatch:var(--viz-series-2)"></i>V11 terrain</span><span class="key"><i class="swatch" style="--swatch:var(--viz-series-3)"></i>Scenic repeats</span><span class="key"><i class="swatch" style="--swatch:var(--viz-series-7)"></i>Generated surface props</span><span class="key"><i class="swatch" style="--swatch:var(--viz-series-6)"></i>Generated sky props</span><span class="key"><i class="swatch" style="--swatch:var(--viz-series-8)"></i>Retained props</span><span class="key"><i class="swatch" style="--swatch:var(--primary)"></i>Hero / Town lock</span></div></section>
<div class="detail" aria-live="polite"><div><b id="detail-title">Whole-map inventory</b><small id="detail-meta">247 backgrounds · 253 props · 500 mapped records</small></div><div><span id="detail-body">Select a background, prop, or merge slice. Record ownership uses its center tile; the full authored footprint remains visible across boundaries.</span><small class="detail-path" id="detail-path"></small></div></div>
<section class="plan-section"><h2>Piecemeal merge order</h2><div class="phase-grid">${phaseCards}</div><p class="note">Foundation first: ordered sky cohesion, scenic surface repeats, and active V11 terrain. Then merge slices 1–7 in order and finish with a whole-map runtime canary. Town Square is verification-only; its MP4 is excluded from every visual merge.</p></section>
<script>(function(){
const root=document.getElementById("above-ground-placement-plan-v1");const DATA=${serialized};
const byId=new Map(DATA.records.map(function(record){return[record.id,record]}));const select=document.getElementById("plan-phase-select");
const title=document.getElementById("detail-title"),meta=document.getElementById("detail-meta"),body=document.getElementById("detail-body"),path=document.getElementById("detail-path");
function showRecord(record,element){document.querySelectorAll(".record.is-selected").forEach(function(node){node.classList.remove("is-selected")});if(element)element.classList.add("is-selected");title.textContent=record.label;meta.textContent=record.family+" · "+record.status+" · "+record.phaseId;const x=Number.isFinite(record.anchorX)?record.anchorX:record.x+record.width/2;const y=Number.isFinite(record.anchorY)?record.anchorY:record.y+record.height/2;body.textContent="Tile "+x.toFixed(2)+", "+y.toFixed(2)+" · asset "+record.assetId+(record.note?" · "+record.note:"");path.textContent=record.path||""}
function setPhase(id){select.value=id;document.querySelectorAll("[data-phase-area],[data-phase-button]").forEach(function(node){const value=node.dataset.phaseArea||node.dataset.phaseButton;node.classList.toggle("is-selected",id!=="all"&&value===id)});document.querySelectorAll(".record").forEach(function(node){node.classList.toggle("is-outside-phase",id!=="all"&&node.dataset.phase!==id)});if(id==="all"){title.textContent="Whole-map inventory";meta.textContent=DATA.summary.backgrounds+" backgrounds · "+DATA.summary.props+" props · "+DATA.summary.totalRecords+" mapped records";body.textContent="All runtime-sourced placements are visible, including stream buffers and explicitly excluded/suppressed background records.";path.textContent="";return}const phase=DATA.summary.phases.find(function(value){return value.id===id});title.textContent=phase.order+". "+phase.label;meta.textContent="tiles "+phase.leftTile+"–"+phase.rightTileExclusive+" · "+phase.backgroundCount+" backgrounds · "+phase.propCount+" props";body.textContent=phase.intent+" Gate: "+phase.gate;path.textContent=phase.townLocked?"Town MP4 locked byte-for-byte; verify only.":""}
root.querySelectorAll("[data-filter-button]").forEach(function(button){button.addEventListener("click",function(){root.dataset.filter=button.dataset.filterButton;root.querySelectorAll("[data-filter-button]").forEach(function(item){item.setAttribute("aria-pressed",String(item===button))})})});
document.getElementById("plan-nonactive-toggle").addEventListener("change",function(event){root.dataset.showNonactive=String(event.target.checked)});select.addEventListener("change",function(){setPhase(select.value)});root.querySelector("svg").addEventListener("click",function(event){const element=event.target.closest("[data-record-id]");if(element)showRecord(byId.get(element.dataset.recordId),element)});root.querySelectorAll("[data-phase-button]").forEach(function(button){button.addEventListener("click",function(){setPhase(button.dataset.phaseButton);button.scrollIntoView({block:"nearest",behavior:"smooth"})})});
setPhase("all");
})();</script>
</div>`;

await writeFile(resolve(outputPath), fragment, "utf8");
console.log(JSON.stringify({
  ok: true,
  outputPath: resolve(outputPath),
  bytes: Buffer.byteLength(fragment),
  records: summary.totalRecords,
}, null, 2));
