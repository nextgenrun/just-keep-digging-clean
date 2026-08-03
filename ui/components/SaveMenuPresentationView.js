import { SAVE_MENU_PRESENTATION, getSaveMenuAssetEntries } from "../../values/saveMenuPresentation.js";
import { createButton } from "../PhaserUiKit.js";

function texturesExist(scene, keys) {
  return keys.every(key => scene.textures.exists(key));
}

function addToParent(parent, child) {
  if (parent && typeof parent.add === "function") parent.add(child);
  return child;
}

export function preloadSaveMenuArt(scene) {
  for (const [key, path] of getSaveMenuAssetEntries()) {
    if (!scene.textures.exists(key)) scene.load.image(key, path);
  }
}

export function createSaveSlotChrome(scene, { x, y, width, height }) {
  const art = SAVE_MENU_PRESENTATION.slot;
  if (!texturesExist(scene, [art.idleKey, art.selectedKey])) return null;

  const root = scene.add.container(x, y);
  const idle = scene.add.image(0, 0, art.idleKey).setDisplaySize(width, height);
  const selected = scene.add.image(0, 0, art.selectedKey)
    .setDisplaySize(width, height)
    .setAlpha(0);
  root.add([idle, selected]);
  root.__saveMenuChrome = {
    setState(state) {
      const selectedAlpha = state === "selected" ? 1 : state === "hover" ? 0.52 : 0;
      idle.setAlpha(1 - selectedAlpha * 0.72);
      selected.setAlpha(selectedAlpha);
    },
  };
  return root;
}

export function createSaveModalChrome(scene, { kind, x, y, width, height }) {
  const art = SAVE_MENU_PRESENTATION.modal[kind];
  if (!art || !scene.textures.exists(art.key)) return null;
  return scene.add.image(x, y, art.key).setDisplaySize(width, height);
}

export function createSaveChoiceChrome(scene, { x = 0, y = 0, width, height }) {
  const art = SAVE_MENU_PRESENTATION.choice;
  if (!texturesExist(scene, [art.idleKey, art.selectedKey])) return null;

  const root = scene.add.container(x, y);
  const idle = scene.add.image(0, 0, art.idleKey).setDisplaySize(width, height);
  const selected = scene.add.image(0, 0, art.selectedKey)
    .setDisplaySize(width, height)
    .setAlpha(0);
  root.add([idle, selected]);
  return {
    root,
    setSelected(value) {
      idle.setAlpha(value ? 0.2 : 1);
      selected.setAlpha(value ? 1 : 0);
    },
  };
}

export function createSaveMenuButton(scene, options = {}) {
  const art = SAVE_MENU_PRESENTATION.button;
  const useAuthoredArt = options.useAuthoredArt
    ?? scene._useAuthoredSaveMenuArt
    ?? false;
  if (!useAuthoredArt || !texturesExist(scene, [art.idleKey, art.selectedKey])) {
    return createButton(scene, options);
  }

  const {
    x = 0,
    y = 0,
    width = 220,
    height = 44,
    parent = null,
    depth = 2501,
  } = options;
  let hovered = false;
  let focused = false;
  let selectedState = Boolean(options.selected);
  let enabled = options.enabled !== false;

  const root = scene.add.container(x, y).setSize(width, height);
  const idle = scene.add.image(0, 0, art.idleKey).setDisplaySize(width, height);
  const selected = scene.add.image(0, 0, art.selectedKey)
    .setDisplaySize(width, height)
    .setAlpha(0);
  root.add([idle, selected]);
  root.setDepth(depth);
  addToParent(parent, root);

  const button = createButton(scene, {
    ...options,
    x: 0,
    y: 0,
    parent: root,
    visibleChrome: false,
  });

  function draw() {
    if (!root.active) return;
    const highlighted = enabled && (selectedState || focused || hovered);
    idle.setAlpha(highlighted ? 0.22 : 1);
    selected.setAlpha(highlighted ? 1 : 0);
    root.setAlpha(enabled ? 1 : 0.48);
  }

  button.hit.on("pointerover", () => {
    hovered = enabled;
    draw();
  });
  button.hit.on("pointerout", () => {
    hovered = false;
    draw();
  });
  button.hit.on("pointerdown", () => {
    if (!enabled) return;
    scene.tweens.killTweensOf(root);
    scene.tweens.add({
      targets: root,
      scaleX: 0.985,
      scaleY: 0.985,
      duration: 55,
      yoyo: true,
      ease: "Power2.out",
    });
  });
  draw();

  return {
    ...button,
    root,
    setSelected(value) {
      selectedState = Boolean(value);
      button.setSelected(value);
      draw();
    },
    setFocused(value) {
      focused = Boolean(value);
      button.setFocused(value);
      draw();
    },
    setEnabled(value, reason = null) {
      enabled = Boolean(value);
      if (!enabled) {
        hovered = false;
        focused = false;
      }
      button.setEnabled(value, reason);
      draw();
    },
    setVisible(value) {
      root.setVisible(value);
    },
    destroy() {
      root.destroy(true);
    },
  };
}
