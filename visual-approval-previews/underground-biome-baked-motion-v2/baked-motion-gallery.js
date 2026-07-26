import { UNDERGROUND_BIOME_MOTION_REVIEW } from "../../values/undergroundBiomeMotionReview.js";

const video = document.querySelector("#motion-video");
const playToggle = document.querySelector("#play-toggle");
const biomeButtons = document.querySelector("#biome-buttons");
const selectedBiome = document.querySelector("#selected-biome");
const selectedTitle = document.querySelector("#selected-title");
const selectedDescription = document.querySelector("#selected-description");
const selectedMotion = document.querySelector("#selected-motion");
const sourceLink = document.querySelector("#source-link");
const keyframeLink = document.querySelector("#keyframe-link");
const videoLink = document.querySelector("#video-link");

const cards = UNDERGROUND_BIOME_MOTION_REVIEW.cards.map(card => {
  const artName = card.art.replace(/^\.\//, "");
  return {
    ...card,
    sourceUrl: `../underground-biome-motion-mockups-v1/${artName}`,
    keyframeUrl: `./${artName.replace(/\.png$/, "-keyframe-b-v2.png")}`,
    videoUrl: `../../${card.rejectedVideo}`,
  };
});

let activeCardId = cards[0].id;
let pausedByReviewer = false;

function updatePlayLabel() {
  playToggle.textContent = pausedByReviewer ? "Play rejected loop" : "Pause rejected loop";
}

async function selectCard(card) {
  activeCardId = card.id;
  selectedBiome.textContent = `${card.biome} · ${card.regionId}`;
  selectedTitle.textContent = card.title;
  selectedDescription.textContent = card.description;
  selectedMotion.textContent = card.motionLabel;
  sourceLink.href = card.sourceUrl;
  keyframeLink.href = card.keyframeUrl;
  videoLink.href = card.videoUrl;

  video.pause();
  video.poster = card.sourceUrl;
  video.src = card.videoUrl;
  video.load();
  if (!pausedByReviewer) {
    try {
      await video.play();
    } catch {
      pausedByReviewer = true;
    }
  }
  updatePlayLabel();
  document.querySelectorAll(".biome-button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.cardId === activeCardId));
  });
}

for (const card of cards) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "biome-button";
  button.dataset.cardId = card.id;
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `<span>${card.biome}</span><strong>${card.title}</strong>`;
  button.addEventListener("click", () => selectCard(card));
  biomeButtons.append(button);
}

playToggle.addEventListener("click", async () => {
  pausedByReviewer = !pausedByReviewer;
  if (pausedByReviewer) {
    video.pause();
  } else {
    try {
      await video.play();
    } catch {
      pausedByReviewer = true;
    }
  }
  updatePlayLabel();
});

selectCard(cards[0]);
