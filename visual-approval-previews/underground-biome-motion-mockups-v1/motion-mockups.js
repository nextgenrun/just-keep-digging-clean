import { UNDERGROUND_BIOME_MOTION_REVIEW } from "../../values/undergroundBiomeMotionReview.js";
import { WORLD_VISUAL_DEPTH_BACKDROPS } from "../../values/worldVisualDepthBackdrops.js";
import { WORLD_VISUAL_DEPTH_MOTION } from "../../values/worldVisualDepthMotion.js";
import { WORLD_VISUAL_MATERIALS } from "../../values/worldVisualMaterials.js";
import { BiomeMotionRenderer } from "./BiomeMotionRenderer.js";

const elements = {
  biomeList: document.querySelector("#biomeList"),
  biomeName: document.querySelector("#biomeName"),
  conceptTitle: document.querySelector("#conceptTitle"),
  depthRange: document.querySelector("#depthRange"),
  stageShell: document.querySelector("#stageShell"),
  stageStatus: document.querySelector("#stageStatus"),
  motionLabel: document.querySelector("#motionLabel"),
  conceptDescription: document.querySelector("#conceptDescription"),
  materialName: document.querySelector("#materialName"),
  motionToggle: document.querySelector("#motionToggle"),
  darknessToggle: document.querySelector("#darknessToggle"),
  groundToggle: document.querySelector("#groundToggle"),
  intensityRange: document.querySelector("#intensityRange"),
  intensityValue: document.querySelector("#intensityValue"),
  canvas: document.querySelector("#motionCanvas"),
};

const cssColor = color => `#${color.toString(16).padStart(6, "0")}`;
const cards = UNDERGROUND_BIOME_MOTION_REVIEW.cards.map(card => {
  const motion = WORLD_VISUAL_DEPTH_MOTION.profiles[card.regionId];
  return Object.freeze({
    ...card,
    accent: cssColor(motion.accent),
    secondary: cssColor(motion.secondary),
    direction: motion.direction,
    motion,
  });
});
const regions = new Map(
  WORLD_VISUAL_DEPTH_BACKDROPS.regions.map(region => [region.id, region])
);
const buttons = [];
let selectedIndex = 0;

const renderer = new BiomeMotionRenderer(elements.canvas, (state, error) => {
  elements.stageShell.dataset.state = state;
  if (state === "loading") elements.stageStatus.textContent = "Loading biome plate…";
  if (state === "ready") elements.stageStatus.textContent = "Ready";
  if (state === "error") elements.stageStatus.textContent = error?.message || "Asset load failed";
});

function displayMaterialName(materialId) {
  return materialId
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, letter => letter.toUpperCase());
}

function createBiomeButtons() {
  cards.forEach((card, index) => {
    const region = regions.get(card.regionId);
    const button = document.createElement("button");
    const number = String(index + 1).padStart(2, "0");
    const lastRow = region ? region.bottomTileExclusive - 1 : "—";
    button.type = "button";
    button.className = "biome-card";
    button.innerHTML = `
      <span class="biome-index">${number}</span>
      <span class="biome-copy">
        <strong>${card.biome}</strong>
        <span>${region?.topTile ?? "—"}–${lastRow} · ${card.title}</span>
      </span>
    `;
    button.addEventListener("click", () => selectCard(index));
    elements.biomeList.append(button);
    buttons.push(button);
  });
}

function selectCard(index, updateHash = true) {
  selectedIndex = (index + cards.length) % cards.length;
  const card = cards[selectedIndex];
  const region = regions.get(card.regionId);
  const material = WORLD_VISUAL_MATERIALS[card.materialId];
  const lastRow = region ? region.bottomTileExclusive - 1 : "—";
  const artUrl = new URL(card.art, import.meta.url).href;
  const materialUrl = new URL(`../../${material.path}`, import.meta.url).href;

  document.documentElement.style.setProperty("--accent", card.accent);
  document.documentElement.style.setProperty("--secondary", card.secondary);
  elements.biomeName.textContent = card.biome;
  elements.conceptTitle.textContent = card.title;
  elements.depthRange.textContent = `${region?.topTile ?? "—"}–${lastRow}`;
  elements.motionLabel.textContent = card.motionLabel;
  elements.conceptDescription.textContent = card.description;
  elements.materialName.textContent = `${displayMaterialName(card.materialId)} production texture`;

  buttons.forEach((button, buttonIndex) => {
    button.setAttribute("aria-current", String(buttonIndex === selectedIndex));
  });

  renderer.setCard({ ...card, art: artUrl }, materialUrl);
  if (updateHash) history.replaceState(null, "", `#${card.id}`);
}

function bindControls() {
  elements.motionToggle.addEventListener("change", () => {
    renderer.setMotionEnabled(elements.motionToggle.checked);
  });
  elements.darknessToggle.addEventListener("change", () => {
    renderer.setDarknessEnabled(elements.darknessToggle.checked);
  });
  elements.groundToggle.addEventListener("change", () => {
    renderer.setGroundEnabled(elements.groundToggle.checked);
  });
  elements.intensityRange.addEventListener("input", () => {
    const value = Number(elements.intensityRange.value);
    renderer.setIntensity(value / 100);
    elements.intensityValue.value = `${value}%`;
    elements.intensityValue.textContent = `${value}%`;
  });

  document.addEventListener("keydown", event => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" && document.activeElement?.type === "range") return;
    if (event.key === "ArrowRight") selectCard(selectedIndex + 1);
    if (event.key === "ArrowLeft") selectCard(selectedIndex - 1);
    if (event.code === "Space") {
      event.preventDefault();
      elements.motionToggle.checked = !elements.motionToggle.checked;
      renderer.setMotionEnabled(elements.motionToggle.checked);
    }
  });
}

function initialIndex() {
  const requested = location.hash.slice(1);
  const match = cards.findIndex(card => card.id === requested);
  return match >= 0 ? match : 0;
}

function honorReducedMotion() {
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  elements.motionToggle.checked = false;
  renderer.setMotionEnabled(false);
}

createBiomeButtons();
bindControls();
honorReducedMotion();
selectCard(initialIndex(), false);
renderer.start();
