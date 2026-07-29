const ENGINE_ORDER = Object.freeze([
  "wayward-star",
  "hollow-sun",
  "comet-engine",
]);

const ENGINE_DEFINITIONS = Object.freeze({
  "wayward-star": Object.freeze({
    name: "WAYWARD STAR",
    role: "RICOCHET ENGINE",
    shortName: "STAR",
    accent: "#65E8FF",
    art: "../../sprites/celestial-engines/wayward-star-core-v1.png",
    description: "Release and redirect the capped bouncing star-ball.",
  }),
  "hollow-sun": Object.freeze({
    name: "HOLLOW SUN",
    role: "GRAVITY ENGINE",
    shortName: "SUN",
    accent: "#B985FF",
    art: "../../sprites/celestial-engines/hollow-sun-core-v1.png",
    description: "Place three crushing waves, then trigger the implosion.",
  }),
  "comet-engine": Object.freeze({
    name: "COMET ENGINE",
    role: "TUNNEL ENGINE",
    shortName: "COMET",
    accent: "#FFD27A",
    art: "../../sprites/celestial-engines/comet-engine-core-v1.png",
    description: "Launch and ride the protected-safe celestial spear.",
  }),
});

const slotsRoot = document.querySelector("#engineSlots");
const ownedRoot = document.querySelector("#ownedEngineRow");
const drawer = document.querySelector("#loadoutDrawer");
const editButton = document.querySelector("#editLoadout");
const resetButton = document.querySelector("#resetLoadout");
const chargeFill = document.querySelector("#chargeFill");
const chargeValue = document.querySelector("#chargeValue");
const statusText = document.querySelector("#barStatus");
const tooltip = document.querySelector("#engineTooltip");

let loadout = [...ENGINE_ORDER];
let editOpen = new URLSearchParams(location.search).get("edit") === "1";
let charge = 100;
let activeEngineId = null;
let dragged = null;
let activationTimer = null;

function engineMarkup(engineId, slotIndex) {
  const engine = ENGINE_DEFINITIONS[engineId];
  const linked = activeEngineId && activeEngineId !== engineId;
  return `
    <button
      class="engine-slot${activeEngineId === engineId ? " is-active" : ""}${linked ? " linked-lock" : ""}"
      style="--accent:${engine.accent}"
      type="button"
      draggable="false"
      data-engine="${engineId}"
      data-slot="${slotIndex}"
      aria-label="Slot ${slotIndex + 1}: ${engine.name}"
    >
      <span class="slot-key">${slotIndex + 1}</span>
      <span class="ready-pip"></span>
      <img class="engine-art" src="${engine.art}" alt="" draggable="false">
      <span class="slot-name">${engine.shortName}</span>
    </button>
  `;
}

function ownedMarkup(engineId) {
  const engine = ENGINE_DEFINITIONS[engineId];
  return `
    <div
      class="owned-engine"
      style="--accent:${engine.accent}"
      draggable="false"
      data-engine="${engineId}"
      aria-label="Drag ${engine.name}"
    >
      <img class="owned-art" src="${engine.art}" alt="" draggable="false">
      <span class="owned-copy">
        <strong>${engine.name}</strong>
        <span>${engine.role}</span>
      </span>
    </div>
  `;
}

function render() {
  slotsRoot.innerHTML = loadout.map(engineMarkup).join("");
  ownedRoot.innerHTML = ENGINE_ORDER.map(ownedMarkup).join("");
  drawer.classList.toggle("is-open", editOpen);
  drawer.setAttribute("aria-hidden", String(!editOpen));
  editButton.classList.toggle("is-open", editOpen);
  editButton.textContent = editOpen ? "DONE" : charge > 0 ? "EDIT" : "REFILL";
  chargeFill.style.width = `${charge}%`;
  chargeValue.textContent = `${charge} / 100`;
  wireInteractions();
}

function showTooltip(target, engineId) {
  const engine = ENGINE_DEFINITIONS[engineId];
  const rect = target.getBoundingClientRect();
  tooltip.style.setProperty("--tooltip-accent", engine.accent);
  tooltip.style.left = `${Math.min(1036, Math.max(18, rect.left + rect.width / 2 - 113))}px`;
  tooltip.style.top = `${Math.max(18, rect.top - 105)}px`;
  tooltip.innerHTML = `
    <strong>${engine.name}</strong>
    <em>${engine.role}</em>
    <span>${engine.description}</span>
  `;
  tooltip.classList.add("is-visible");
  tooltip.setAttribute("aria-hidden", "false");
}

function hideTooltip() {
  tooltip.classList.remove("is-visible");
  tooltip.setAttribute("aria-hidden", "true");
}

function beginDrag(event, engineId, slotIndex = null) {
  if (!editOpen || event.button !== 0) return;
  dragged = { engineId, slotIndex };
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.currentTarget.classList.add("dragging");
  updateDropTarget(event.clientX, event.clientY);
}

function updateDropTarget(clientX, clientY) {
  document.querySelectorAll(".drop-target")
    .forEach(target => target.classList.remove("drop-target"));
  if (!dragged) return null;
  const target = document.elementFromPoint(clientX, clientY)?.closest?.(".engine-slot");
  target?.classList.add("drop-target");
  return target || null;
}

function finishPointerDrag(event) {
  if (!dragged) return;
  const target = updateDropTarget(event.clientX, event.clientY);
  const targetSlotIndex = Number(target?.dataset?.slot);
  if (Number.isInteger(targetSlotIndex)) completeDrop(targetSlotIndex);
  dragged = null;
  document.querySelectorAll(".dragging, .drop-target").forEach(element => {
    element.classList.remove("dragging", "drop-target");
  });
}

function completeDrop(targetSlotIndex) {
  if (!dragged) return;
  const sourceIndex = loadout.indexOf(dragged.engineId);
  if (sourceIndex < 0 || sourceIndex === targetSlotIndex) return;
  [loadout[sourceIndex], loadout[targetSlotIndex]] = [
    loadout[targetSlotIndex],
    loadout[sourceIndex],
  ];
  statusText.textContent = `${ENGINE_DEFINITIONS[dragged.engineId].name} MOVED TO SLOT ${targetSlotIndex + 1}`;
  render();
}

function activateSlot(slotIndex) {
  if (editOpen || activeEngineId) return;
  if (charge <= 0) {
    statusText.textContent = "STAR HEART EMPTY • MINE SKY STARS TO RECHARGE";
    return;
  }
  activeEngineId = loadout[slotIndex];
  charge = 0;
  statusText.textContent = `${ENGINE_DEFINITIONS[activeEngineId].name} ACTIVE • OTHER SLOTS LINKED`;
  clearTimeout(activationTimer);
  render();
  activationTimer = setTimeout(() => {
    activeEngineId = null;
    statusText.textContent = "STAR HEART EMPTY • MINE SKY STARS TO RECHARGE";
    render();
  }, 2600);
}

function wireInteractions() {
  document.querySelectorAll(".engine-slot").forEach(slot => {
    const engineId = slot.dataset.engine;
    const slotIndex = Number(slot.dataset.slot);
    slot.addEventListener("mouseenter", () => showTooltip(slot, engineId));
    slot.addEventListener("mouseleave", hideTooltip);
    slot.addEventListener("click", () => activateSlot(slotIndex));
    slot.addEventListener("pointerdown", event => beginDrag(event, engineId, slotIndex));
    slot.addEventListener("pointermove", event => updateDropTarget(event.clientX, event.clientY));
    slot.addEventListener("pointerup", finishPointerDrag);
    slot.addEventListener("pointercancel", finishPointerDrag);
  });

  document.querySelectorAll(".owned-engine").forEach(item => {
    const engineId = item.dataset.engine;
    item.addEventListener("mouseenter", () => showTooltip(item, engineId));
    item.addEventListener("mouseleave", hideTooltip);
    item.addEventListener("pointerdown", event => beginDrag(event, engineId));
    item.addEventListener("pointermove", event => updateDropTarget(event.clientX, event.clientY));
    item.addEventListener("pointerup", finishPointerDrag);
    item.addEventListener("pointercancel", finishPointerDrag);
  });
}

editButton.addEventListener("click", () => {
  if (!editOpen && charge <= 0 && !activeEngineId) {
    charge = 100;
    statusText.textContent = "MOCKUP CHARGE RESTORED • CHOOSE ANY ENGINE";
    render();
    return;
  }
  editOpen = !editOpen;
  statusText.textContent = editOpen
    ? "LOADOUT EDIT • DRAG TO SWAP SLOTS"
    : "CLICK OR PRESS 1–3 TO RELEASE";
  render();
});

resetButton.addEventListener("click", () => {
  loadout = [...ENGINE_ORDER];
  statusText.textContent = "DEFAULT ENGINE ORDER RESTORED";
  render();
});

window.addEventListener("keydown", event => {
  const slotIndex = Number(event.key) - 1;
  if (slotIndex >= 0 && slotIndex < loadout.length) activateSlot(slotIndex);
});

render();
