// Local E2E fixture controls. Never imported by the normal game entry.
import { setSaveMenuPrompt } from "/ui/components/BakedSaveMenuView.js";
import { SAVE_MENU_PRESENTATION } from "/values/saveMenuPresentation.js";
export function setupSaveMenuReview(panel, showReview) {
  if (!new URLSearchParams(location.search).has("jkd_e2e")) return;
  const menu = () => window.__phaserGame?.scene.getScenes(true).find(s => s.scene.key === "StartMenuScene");
  let original = null;
  function rebuild(scene) {
    scene._cardGraphics.forEach(({ g }) => scene.tweens.killTweensOf(g));
    scene.selectedSlot = null;
    scene._destroyCards();
    scene._buildCards();
    scene._syncSaveTransferControls();
    setSaveMenuPrompt(scene, SAVE_MENU_PRESENTATION.copy.startPrompt, "#f0e9d7");
  }
  function button(label, action) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = () => { const scene = menu(); if (!scene) return; action(scene); b.blur(); document.querySelector("#game-root canvas")?.focus(); };
    panel.querySelector("#baked-controls").append(b);
  }
  button("Save menu: stress values", scene => {
    original ||= scene.saveSlots.map(s => structuredClone(s));
    scene.saveSlots = [
      { ...original[0], id: 1, hasData: false },
      { ...original[1], id: 2, hasData: true, updatedAt: Date.now(), level: 999,
        currentDepth: 123456, bestDepth: 987654, wallet: 987654321012, stars: 999999999,
        dugTiles: 987654321, hardcoreModeData: { mode: "casual" } },
      { ...original[2], id: 3, hasData: true, updatedAt: Date.now(), level: 80,
        currentDepth: 1234, bestDepth: 5678, wallet: 123456789, stars: 12345,
        dugTiles: 987654, hardcoreModeData: { mode: "hardcore", armed: true, livesRemaining: 1 } },
    ];
    rebuild(scene);
  });
  button("Save menu: ended run", scene => {
    if (!original) return;
    scene.saveSlots[2].hardcoreModeData = { mode: "hardcore", armed: true, livesRemaining: 0, exhausted: true };
    rebuild(scene);
  });
  button("Save menu: restore", scene => {
    if (!original) return;
    scene.saveSlots = original;
    original = null;
    rebuild(scene);
  });
  button("Save menu: hide controls", () => { panel.style.visibility = "hidden"; showReview.style.display = "block"; });
  const timer = setInterval(() => {
    const scene = menu();
    const objects = scene?.children.list || [];
    const cards = objects.filter(o => o.name?.startsWith("baked-save-slot-"));
    panel.dataset.saveSnapshot = JSON.stringify({
      phase: scene?.scene.key || null, selected: scene?.selectedSlot,
      cards: cards.map(root => ({ name: root.name, values: root.list.filter(o => o.type === "Text")
        .map(o => ({ name: o.name, text: o.text, bounds: o.getBounds(), well: o.getData("saveValueWell"), scale: o.scaleX })),
        art: root.list.filter(o => o.type === "Image").map(o => ({ frame: o.frame.name, bounds: o.getBounds(), scaleX: o.scaleX, scaleY: o.scaleY })) })),
      copy: objects.filter(o => o.getData?.("bakedSaveCopy")).map(o => ({ name: o.name, frame: o.frame.name, bounds: o.getBounds() })),
      setupOpen: Boolean(scene?._newRunSetup?.isOpen),
      fixture: Boolean(original),
    });
  }, 300);
  window.addEventListener("pagehide", () => clearInterval(timer), { once: true });
}
