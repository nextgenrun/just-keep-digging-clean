const manifest = await fetch("showcase-manifest.json").then(response => {
  if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
  return response.json();
});

const $ = selector => document.querySelector(selector);
const effectVideo = $("#effect-video");
const miniEffect = $("#mini-effect");
const rawVideo = $("#raw-video");
const tile = $("#tile");
const miniTile = $("#mini-tile");
const status = $("#play-status");
let selectedIndex = 0;
let playbackRate = 1;
let cyclesRemaining = 0;
let restartTimer = 0;

$("#scene-bg").src = manifest.scene.background;
$("#mini-bg").src = manifest.scene.background;
$("#player").src = manifest.scene.player;
$("#model-name").textContent = manifest.model;
$("#known-spend").textContent = `€${manifest.budget.knownEur.toFixed(2)}`;
$("#clip-count").textContent = String(manifest.budget.completedClips);
$("#budget-meter").style.width = `${Math.min(100, manifest.budget.knownEur / manifest.budget.capEur * 100)}%`;

function titleCase(value) {
  return value.replace(/-/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function stopAll() {
  window.clearTimeout(restartTimer);
  cyclesRemaining = 0;
  [effectVideo, miniEffect].forEach(video => {
    video.pause();
    video.currentTime = 0;
    video.classList.remove("playing");
  });
  tile.classList.remove("hidden-at-impact");
  status.textContent = "READY";
}

function syncAppearance(effect) {
  const semantic = /magma-crystal|ember-ore/.test(effect.tile);
  [tile, miniTile].forEach(element => {
    element.src = effect.tile;
    element.classList.toggle("semantic", semantic && element === tile);
  });
  [effectVideo, miniEffect].forEach(video => {
    video.style.setProperty("--fx-scale", effect.scale);
    video.classList.toggle("screen", effect.blend === "screen");
  });
}

function selectEffect(index) {
  stopAll();
  selectedIndex = index;
  const effect = manifest.effects[index];
  effectVideo.src = effect.processed;
  miniEffect.src = effect.processed;
  rawVideo.src = effect.raw;
  syncAppearance(effect);
  $("#effect-family").textContent = effect.family;
  $("#effect-label").textContent = effect.label;
  $("#effect-role").textContent = effect.role;
  $("#effect-use").textContent = effect.use;
  $("#effect-why").textContent = effect.why;
  document.querySelectorAll(".effect-option").forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === index);
  });
}

function setTileForTime(effect, time) {
  if (!effect.breakTile) return;
  tile.classList.toggle("hidden-at-impact", time >= .34);
  miniTile.style.opacity = time >= .34 ? "0" : "1";
}

function playCycle(count) {
  stopAll();
  cyclesRemaining = count;
  const effect = manifest.effects[selectedIndex];
  [effectVideo, miniEffect].forEach(video => {
    video.playbackRate = playbackRate;
    video.currentTime = 0;
    video.classList.add("playing");
  });
  tile.classList.remove("hidden-at-impact");
  miniTile.style.opacity = "1";
  status.textContent = count === 1 ? "PLAYING 1 / 1" : `PLAYING 1 / ${count}`;
  effectVideo.play();
  miniEffect.play();
  setTileForTime(effect, 0);
}

effectVideo.addEventListener("timeupdate", () => {
  setTileForTime(manifest.effects[selectedIndex], effectVideo.currentTime);
});

effectVideo.addEventListener("ended", () => {
  cyclesRemaining -= 1;
  if (cyclesRemaining > 0) {
    const total = Number(status.textContent.split("/")[1]?.trim()) || 3;
    const completed = total - cyclesRemaining;
    status.textContent = `PLAYING ${completed + 1} / ${total}`;
    tile.classList.remove("hidden-at-impact");
    miniTile.style.opacity = "1";
    restartTimer = window.setTimeout(() => {
      effectVideo.currentTime = 0;
      miniEffect.currentTime = 0;
      effectVideo.play();
      miniEffect.play();
    }, 180);
  } else {
    status.textContent = "FORWARD PASS COMPLETE";
    window.setTimeout(() => {
      effectVideo.classList.remove("playing");
      miniEffect.classList.remove("playing");
      tile.classList.remove("hidden-at-impact");
      miniTile.style.opacity = "1";
    }, 240);
  }
});

$("#play-once").addEventListener("click", () => playCycle(1));
$("#play-three").addEventListener("click", () => playCycle(3));
$("#speed-toggle").addEventListener("click", event => {
  playbackRate = playbackRate === 1 ? .5 : 1;
  event.currentTarget.textContent = `SPEED ${playbackRate}×`;
  effectVideo.playbackRate = playbackRate;
  miniEffect.playbackRate = playbackRate;
});

const list = $("#effect-list");
manifest.effects.forEach((effect, index) => {
  const button = document.createElement("button");
  button.className = "effect-option";
  button.innerHTML = `<span class="num">${String(index + 1).padStart(2, "0")}</span><span><strong>${effect.label}</strong><small>${effect.role}</small></span><span class="family">${effect.family}</span>`;
  button.addEventListener("click", () => selectEffect(index));
  list.append(button);
});

const rejectGrid = $("#reject-grid");
manifest.rejectedPlayerVideo.forEach(item => {
  const card = document.createElement("article");
  card.className = "reject-card";
  card.innerHTML = `<header><strong>${item.label}</strong><span>REJECTED</span></header><video controls muted playsinline preload="metadata" poster="${item.poster}" src="${item.source}"></video><p>${item.reason}</p>`;
  rejectGrid.append(card);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAll();
});

selectEffect(0);
