import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_ORDER,
} from "../../values/celestialEngines.js";

export function buildStarHeartBackdrop(overlay, rect) {
  const gfx = overlay.scene.add.graphics();
  gfx.lineStyle(1, 0x275775, 0.22);
  gfx.lineBetween(rect.left + 22, rect.top + 18, rect.right - 28, rect.bottom - 86);
  gfx.lineBetween(rect.left + 90, rect.bottom - 82, rect.right - 80, rect.top + 24);
  overlay.shell.content.add(gfx);
  for (let index = 0; index < 16; index += 1) {
    const x = rect.left + 24 + ((index * 137) % Math.max(1, rect.width - 48));
    const y = rect.top + 18 + ((index * 79) % Math.max(1, rect.height - 96));
    const node = overlay.scene.add.circle(
      x,
      y,
      index % 4 === 0 ? 2.2 : 1.2,
      0x7eeaff,
      0.3,
    );
    overlay.shell.content.add(node);
    overlay.ambientNodes.push(node);
  }
}

export function refreshStarHeartSelection(overlay, snapshot) {
  const unlockedEngines = new Set(snapshot.unlockedEngines || []);
  overlay.cardViews.forEach((view, index) => {
    const selected = index === overlay.selectedIndex;
    const owned = snapshot.godMode || unlockedEngines.has(view.engineId);
    const equipped = snapshot.selectedEngine === view.engineId;
    const sealed = Boolean(!snapshot.godMode && !owned && snapshot.availableHearts <= 0);
    view.bg.clear();
    view.bg.fillStyle(selected ? 0x0b2230 : 0x07131d, sealed ? 0.52 : 0.9);
    view.bg.fillRoundedRect(-view.width / 2, -view.height / 2, view.width, view.height, 12);
    view.bg.lineStyle(
      selected || owned ? 2 : 1,
      equipped ? 0xf2c86e : CELESTIAL_ENGINE_CONFIG.engines[view.engineId].accent,
      selected ? 0.96 : owned ? 0.66 : 0.38,
    );
    view.bg.strokeRoundedRect(-view.width / 2, -view.height / 2, view.width, view.height, 12);
    view.root.setAlpha(sealed ? 0.33 : selected ? 1 : 0.72);
  });

  const engineId = CELESTIAL_ENGINE_ORDER[overlay.selectedIndex];
  const owned = snapshot.godMode || unlockedEngines.has(engineId);
  const equipped = snapshot.selectedEngine === engineId;
  const canChoose = snapshot.godMode
    || (owned && !equipped)
    || (!owned && snapshot.availableHearts > 0);
  overlay.confirmButton?.setEnabled(canChoose, equipped ? "EQUIPPED" : "SEALED");
  overlay.confirmButton?.setLabel(
    snapshot.godMode
      ? CELESTIAL_ENGINE_CONFIG.copy.godModeConfirm
      : equipped
        ? CELESTIAL_ENGINE_CONFIG.copy.equipped
        : owned
          ? CELESTIAL_ENGINE_CONFIG.copy.equip
          : CELESTIAL_ENGINE_CONFIG.copy.confirm,
  );
  overlay.confirmButton?.setHint(
    snapshot.godMode
      ? CELESTIAL_ENGINE_CONFIG.copy.godModeHint
      : owned
        ? "PERMANENTLY OWNED"
        : canChoose
          ? `${snapshot.availableHearts} HEART READY`
          : "",
  );
}
