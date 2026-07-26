const FRAME_NAMES = [
  "ANCHOR / ANTICIPATE",
  "FIRST CONTACT",
  "PASSING POSE",
  "SECOND CONTACT",
  "SETTLE / LOOK BACK",
];

let paused = false;
let speed = 1;
let previousTime = performance.now();
const players = [];

function framePath(slug, index) {
  return `frames/${slug}/frame-${String(index + 1).padStart(2, "0")}.webp`;
}

function makeCard(npc) {
  const card = document.createElement("article");
  card.className = "npc-card";
  card.innerHTML = `
    <div class="npc-stage">
      <img alt="${npc.label} anchored walk cycle">
    </div>
    <div class="npc-copy">
      <h2>${npc.label}</h2>
      <p>${npc.gait}</p>
      <span class="frame-label">${FRAME_NAMES[0]}</span>
    </div>
  `;
  const player = {
    npc,
    image: card.querySelector("img"),
    label: card.querySelector(".frame-label"),
    frame: 0,
    elapsed: 0,
  };
  player.image.src = framePath(npc.slug, 0);
  players.push(player);
  return card;
}

function showFrame(player) {
  const { npc, frame, image, label } = player;
  image.src = framePath(npc.slug, frame);
  image.style.setProperty("--walk-offset", `${npc.offsetTiles[frame] * 94}px`);
  label.textContent = FRAME_NAMES[frame];
}

function tick(now) {
  const delta = Math.min(now - previousTime, 80);
  previousTime = now;
  if (!paused) {
    for (const player of players) {
      player.elapsed += delta * speed;
      const duration = player.npc.frameDurationsMs[player.frame];
      if (player.elapsed >= duration) {
        player.elapsed -= duration;
        player.frame = (player.frame + 1) % FRAME_NAMES.length;
        showFrame(player);
      }
    }
  }
  requestAnimationFrame(tick);
}

async function start() {
  const response = await fetch("walking-spec.json");
  const spec = await response.json();
  const grid = document.querySelector("#npcGrid");
  spec.npcs.forEach(npc => grid.appendChild(makeCard(npc)));

  document.querySelector("#pauseButton").addEventListener("click", event => {
    paused = !paused;
    event.currentTarget.textContent = paused ? "Play" : "Pause";
  });
  document.querySelector("#speedSelect").addEventListener("change", event => {
    speed = Number(event.currentTarget.value) || 1;
  });
  requestAnimationFrame(tick);
}

start().catch(error => {
  document.querySelector("#npcGrid").textContent = `Preview failed: ${error.message}`;
});
