import { UI_COLORS } from "../values/uiColors.js";

export const UI_THEME = Object.freeze({
  fontBody: "Consolas, monospace",
  fontTitle: "Trebuchet MS, Segoe UI, sans-serif",
  radius: 8,
  radiusSmall: 5,
  depthOverlay: 2500,
  pressScale: 0.97,
  fadeMs: 180,
});

function addToParent(parent, child) {
  if (parent && typeof parent.add === "function") {
    parent.add(child);
  }
  return child;
}

function setTreeDepth(root, depth) {
  if (!Number.isFinite(depth) || !root) return;
  root.setDepth?.(depth);
  root.iterate?.(child => child?.setDepth?.(depth));
}

function setTreeScroll(root, scrollFactor) {
  if (!root) return;
  root.setScrollFactor?.(scrollFactor);
  root.iterate?.(child => child?.setScrollFactor?.(scrollFactor));
}

export function createPanel(scene, options = {}) {
  const {
    x = scene.scale.width / 2,
    y = scene.scale.height / 2,
    width = 600,
    height = 360,
    title = "",
    depth = UI_THEME.depthOverlay,
    scrollFactor = 0,
    fill = UI_COLORS.bg,
    border = UI_COLORS.borderDim,
    accent = UI_COLORS.borderSel,
    alpha = 0.98,
    parent = null,
    titleY = -height / 2 + 28,
  } = options;

  const root = scene.add.container(x, y);
  setTreeScroll(root, scrollFactor);
  setTreeDepth(root, depth);

  const bg = scene.add.graphics();
  bg.fillStyle(fill, alpha);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, UI_THEME.radius);
  bg.lineStyle(2, border, 1);
  bg.strokeRoundedRect(-width / 2, -height / 2, width, height, UI_THEME.radius);
  bg.lineStyle(1, accent, 0.35);
  bg.strokeRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, UI_THEME.radius - 2);

  const titleText = title
    ? scene.add.text(0, titleY, title, {
        fontFamily: UI_THEME.fontTitle,
        fontSize: "22px",
        fontStyle: "bold",
        color: UI_COLORS.gold,
        letterSpacing: 2,
      }).setOrigin(0.5, 0.5)
    : null;

  const sep = scene.add.graphics();
  sep.lineStyle(1, UI_COLORS.borderDim, 0.8);
  sep.lineBetween(-width / 2 + 24, titleY + 28, width / 2 - 24, titleY + 28);

  root.add(titleText ? [bg, titleText, sep] : [bg]);
  addToParent(parent, root);

  return {
    root,
    bg,
    titleText,
    sep,
    width,
    height,
    setTitle(value) {
      titleText?.setText(value);
    },
    setVisible(visible) {
      root.setVisible(visible);
    },
    destroy() {
      root.destroy(true);
    },
  };
}

export function createButton(scene, options = {}) {
  const state = {
    hovered: false,
    selected: Boolean(options.selected),
    enabled: options.enabled !== false,
    pressing: false,
  };

  const {
    x = 0,
    y = 0,
    width = 220,
    height = 44,
    label = "",
    hint = "",
    depth = UI_THEME.depthOverlay + 1,
    scrollFactor = 0,
    parent = null,
    accent = UI_COLORS.borderSel,
    fill = UI_COLORS.cardBase,
    hoverFill = UI_COLORS.cardHover,
    disabledFill = 0x101820,
    labelColor = UI_COLORS.white,
    disabledColor = UI_COLORS.dim,
    hintColor = UI_COLORS.hint,
    fontSize = "14px",
    align = "center",
    onClick = null,
    onFocus = null,
    playSounds = true,
  } = options;

  const root = scene.add.container(x, y);
  root.setSize(width, height);
  root.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains
  );
  setTreeDepth(root, depth);
  setTreeScroll(root, scrollFactor);

  const bg = scene.add.graphics();
  const accentBar = scene.add.graphics();
  const textX = align === "left" ? -width / 2 + 18 : 0;
  const textOrigin = align === "left" ? [0, 0.5] : [0.5, 0.5];
  const text = scene.add.text(textX, 0, label, {
    fontFamily: UI_THEME.fontBody,
    fontSize,
    fontStyle: "bold",
    color: labelColor,
  }).setOrigin(textOrigin[0], textOrigin[1]);
  const hintText = hint
    ? scene.add.text(width / 2 - 12, 0, hint, {
        fontFamily: UI_THEME.fontBody,
        fontSize: "12px",
        color: hintColor,
      }).setOrigin(1, 0.5)
    : null;
  const hit = scene.add.rectangle(0, 0, width, height, 0x000000, 0)
    .setInteractive({ useHandCursor: true });

  function draw() {
    if (!root?.active || !bg?.active || !accentBar?.active || !text?.active) return;
    const currentFill = !state.enabled
      ? disabledFill
      : state.selected || state.hovered
        ? hoverFill
        : fill;
    const currentBorder = state.selected ? accent : (state.hovered ? UI_COLORS.borderHov : UI_COLORS.borderDim);
    const alpha = state.enabled ? 1 : 0.62;

    bg.clear();
    bg.fillStyle(currentFill, state.selected || state.hovered ? 1 : 0.94);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, UI_THEME.radiusSmall);
    bg.lineStyle(state.selected ? 2 : 1, currentBorder, state.enabled ? 1 : 0.55);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, UI_THEME.radiusSmall);

    accentBar.clear();
    if (accent) {
      accentBar.fillStyle(accent, state.enabled ? (state.selected ? 1 : 0.82) : 0.35);
      accentBar.fillRoundedRect(-width / 2, -height / 2, 4, height, UI_THEME.radiusSmall);
    }

    try {
      text.setColor(state.enabled ? labelColor : disabledColor);
      text.setAlpha(alpha);
      hintText?.setAlpha(alpha);
    } catch (_) {
      // Phaser text can briefly lose its canvas during scene teardown/focus churn.
    }
  }

  function activate() {
    if (state.pressing) return false;
    if (!state.enabled) return false;
    state.pressing = true;
    scene.tweens.killTweensOf(root);
    scene.tweens.add({
      targets: root,
      scaleX: UI_THEME.pressScale,
      scaleY: UI_THEME.pressScale,
      duration: 55,
      yoyo: true,
      ease: "Power2.out",
      onComplete: () => {
        state.pressing = false;
        if (playSounds) scene.soundSystem?.playUiConfirm?.();
        onClick?.();
      },
    });
    return true;
  }

  function handlePointerOver() {
    if (!state.enabled) return;
    state.hovered = true;
    if (playSounds && !state.selected) scene.soundSystem?.playUiSelect?.();
    onFocus?.();
    draw();
  }

  function handlePointerOut() {
    state.hovered = false;
    draw();
  }

  root.on("pointerover", handlePointerOver);
  root.on("pointerout", handlePointerOut);
  root.on("pointerdown", activate);
  hit.on("pointerover", handlePointerOver);
  hit.on("pointerout", handlePointerOut);
  hit.on("pointerdown", activate);

  root.add(hintText ? [bg, accentBar, text, hintText, hit] : [bg, accentBar, text, hit]);
  addToParent(parent, root);
  draw();

  return {
    root,
    bg,
    text,
    hintText,
    hit,
    activate,
    isEnabled() {
      return state.enabled;
    },
    setSelected(value) {
      state.selected = Boolean(value);
      draw();
    },
    setFocused(value) {
      state.selected = Boolean(value);
      draw();
    },
    setEnabled(value) {
      state.enabled = Boolean(value);
      state.pressing = false;
      root.disableInteractive();
      hit.disableInteractive();
      if (state.enabled) {
        root.setInteractive(
          new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
          Phaser.Geom.Rectangle.Contains
        );
        hit.setInteractive({ useHandCursor: true });
      }
      draw();
    },
    setLabel(value) {
      if (!text?.active) return;
      text.setText(value);
    },
    setHint(value) {
      if (hintText && !hintText.active) return;
      hintText?.setText(value);
    },
    setVisible(value) {
      root.setVisible(value);
    },
    destroy() {
      root.destroy(true);
    },
  };
}

export function createIconButton(scene, options = {}) {
  return createButton(scene, {
    width: options.width ?? 42,
    height: options.height ?? 42,
    fontSize: options.fontSize ?? "18px",
    ...options,
  });
}

export function createTogglePair(scene, options = {}) {
  const {
    x = 0,
    y = 0,
    label = "",
    value = true,
    onChange = null,
    parent = null,
    depth = UI_THEME.depthOverlay + 1,
    scrollFactor = 0,
  } = options;

  const root = scene.add.container(x, y);
  setTreeDepth(root, depth);
  setTreeScroll(root, scrollFactor);

  const labelText = scene.add.text(-190, 0, label, {
    fontFamily: UI_THEME.fontBody,
    fontSize: "15px",
    color: UI_COLORS.white,
  }).setOrigin(0, 0.5);
  root.add(labelText);

  let current = Boolean(value);
  const onBtn = createButton(scene, {
    x: -28,
    y: 0,
    width: 78,
    height: 34,
    label: "ON",
    accent: UI_COLORS.borderGood,
    labelColor: UI_COLORS.success,
    parent: root,
    onClick: () => setValue(true),
  });
  const offBtn = createButton(scene, {
    x: 66,
    y: 0,
    width: 78,
    height: 34,
    label: "OFF",
    accent: UI_COLORS.borderBad,
    labelColor: UI_COLORS.danger,
    parent: root,
    onClick: () => setValue(false),
  });

  function refresh() {
    onBtn.setSelected(current);
    offBtn.setSelected(!current);
  }

  function setValue(next, silent = false) {
    current = Boolean(next);
    refresh();
    if (!silent) onChange?.(current);
  }

  addToParent(parent, root);
  refresh();

  return {
    root,
    onBtn,
    offBtn,
    setValue,
    getValue() {
      return current;
    },
    setVisible(value) {
      root.setVisible(value);
    },
    destroy() {
      root.destroy(true);
    },
  };
}

export function createSlider(scene, options = {}) {
  const state = {
    value: Phaser.Math.Clamp(options.value ?? 1, 0, 1),
    selected: Boolean(options.selected),
    enabled: options.enabled !== false,
    dragging: false,
  };

  const {
    x = 0,
    y = 0,
    width = 360,
    height = 42,
    label = "",
    parent = null,
    depth = UI_THEME.depthOverlay + 1,
    scrollFactor = 0,
    accent = UI_COLORS.borderSel,
    onChange = null,
    formatValue = value => `${Math.round(value * 100)}%`,
    step = 0.05,
  } = options;

  const root = scene.add.container(x, y);
  setTreeDepth(root, depth);
  setTreeScroll(root, scrollFactor);

  const labelText = scene.add.text(-width / 2, -14, label, {
    fontFamily: UI_THEME.fontBody,
    fontSize: "13px",
    fontStyle: "bold",
    color: UI_COLORS.white,
  }).setOrigin(0, 0.5);

  const valueText = scene.add.text(width / 2, -14, formatValue(state.value), {
    fontFamily: UI_THEME.fontBody,
    fontSize: "12px",
    color: UI_COLORS.gold,
  }).setOrigin(1, 0.5);

  const track = scene.add.graphics();
  const fill = scene.add.graphics();
  const thumb = scene.add.rectangle(0, 10, 12, 24, accent, 1);
  const hit = scene.add.rectangle(0, 10, width, height, 0x000000, 0)
    .setInteractive({ useHandCursor: true });

  function draw() {
    const alpha = state.enabled ? 1 : 0.45;
    const border = state.selected ? accent : UI_COLORS.borderDim;
    const trackW = width;
    const trackX = -trackW / 2;
    const fillW = Math.max(4, trackW * state.value);

    track.clear();
    track.fillStyle(UI_COLORS.cardBase, alpha);
    track.fillRoundedRect(trackX, 2, trackW, 16, 5);
    track.lineStyle(state.selected ? 2 : 1, border, alpha);
    track.strokeRoundedRect(trackX, 2, trackW, 16, 5);

    fill.clear();
    fill.fillStyle(accent, alpha);
    fill.fillRoundedRect(trackX, 2, fillW, 16, 5);

    thumb.x = trackX + trackW * state.value;
    thumb.setAlpha(alpha);
    labelText.setAlpha(alpha);
    valueText.setAlpha(alpha);
    valueText.setText(formatValue(state.value));
  }

  function setValue(value, silent = false) {
    state.value = Phaser.Math.Clamp(value, 0, 1);
    draw();
    if (!silent) onChange?.(state.value);
  }

  function valueFromPointer(pointer) {
    const matrix = root.getWorldTransformMatrix();
    const local = matrix.applyInverse(pointer.x, pointer.y);
    return (local.x + width / 2) / width;
  }

  function onPointerMove(pointer) {
    if (!state.dragging || !state.enabled) return;
    setValue(valueFromPointer(pointer));
  }

  function onPointerUp() {
    state.dragging = false;
  }

  hit.on("pointerdown", pointer => {
    if (!state.enabled) return;
    state.dragging = true;
    scene.soundSystem?.playUiSelect?.();
    setValue(valueFromPointer(pointer));
  });
  hit.on("pointerover", () => {
    if (!state.enabled) return;
    state.selected = true;
    draw();
  });
  hit.on("pointerout", () => {
    if (state.dragging) return;
    state.selected = false;
    draw();
  });
  scene.input.on("pointermove", onPointerMove);
  scene.input.on("pointerup", onPointerUp);

  root.add([labelText, valueText, track, fill, thumb, hit]);
  addToParent(parent, root);
  draw();

  return {
    root,
    activate() {
      if (!state.enabled) return false;
      setValue(state.value + step);
      return true;
    },
    adjust(direction) {
      if (!state.enabled) return false;
      setValue(state.value + step * direction);
      scene.soundSystem?.playUiSelect?.();
      return true;
    },
    isEnabled() {
      return state.enabled;
    },
    getValue() {
      return state.value;
    },
    setValue,
    setSelected(value) {
      state.selected = Boolean(value);
      draw();
    },
    setFocused(value) {
      state.selected = Boolean(value);
      draw();
    },
    setEnabled(value) {
      state.enabled = Boolean(value);
      hit.disableInteractive();
      if (state.enabled) hit.setInteractive({ useHandCursor: true });
      draw();
    },
    setLabel(value) {
      labelText.setText(value);
    },
    setVisible(value) {
      root.setVisible(value);
    },
    destroy() {
      scene.input.off("pointermove", onPointerMove);
      scene.input.off("pointerup", onPointerUp);
      root.destroy(true);
    },
  };
}

export function createTabBar(scene, options = {}) {
  const {
    x = 0,
    y = 0,
    tabs = [],
    activeIndex = 0,
    parent = null,
    depth = UI_THEME.depthOverlay + 1,
    spacing = 126,
    onChange = null,
  } = options;

  const root = scene.add.container(x, y);
  setTreeDepth(root, depth);
  setTreeScroll(root, 0);

  let active = activeIndex;
  const startX = -((tabs.length - 1) * spacing) / 2;
  const buttons = tabs.map((label, index) => createButton(scene, {
    x: startX + index * spacing,
    y: 0,
    width: 112,
    height: 32,
    label,
    fontSize: "12px",
    accent: UI_COLORS.borderSel,
    parent: root,
    onClick: () => setActive(index),
  }));

  function setActive(index, silent = false) {
    active = Phaser.Math.Clamp(index, 0, Math.max(0, tabs.length - 1));
    buttons.forEach((button, i) => button.setSelected(i === active));
    if (!silent) onChange?.(active);
  }

  addToParent(parent, root);
  setActive(active, true);

  return {
    root,
    buttons,
    setActive,
    getActive() {
      return active;
    },
    destroy() {
      root.destroy(true);
    },
  };
}

export function createSelectableCard(scene, options = {}) {
  return createButton(scene, {
    align: "left",
    width: options.width ?? 240,
    height: options.height ?? 120,
    fontSize: options.fontSize ?? "13px",
    ...options,
  });
}

export function createKeybindRow(scene, options = {}) {
  const {
    x = 0,
    y = 0,
    width = 330,
    label = "",
    description = "",
    keyLabel = "",
    parent = null,
    depth = UI_THEME.depthOverlay + 1,
    onCapture = null,
    onReset = null,
  } = options;

  const root = scene.add.container(x, y);
  setTreeDepth(root, depth);
  setTreeScroll(root, 0);

  const labelText = scene.add.text(-width / 2, -8, label, {
    fontFamily: UI_THEME.fontBody,
    fontSize: "12px",
    fontStyle: "bold",
    color: UI_COLORS.white,
  }).setOrigin(0, 0.5);

  const descText = description
    ? scene.add.text(-width / 2, 10, description, {
        fontFamily: UI_THEME.fontBody,
        fontSize: "9px",
        color: UI_COLORS.hint,
      }).setOrigin(0, 0.5)
    : null;

  const bindButton = createButton(scene, {
    x: width / 2 - 72,
    y: 0,
    width: 92,
    height: 30,
    label: keyLabel,
    accent: UI_COLORS.borderSel,
    fontSize: "11px",
    parent: root,
    onClick: () => onCapture?.(api),
  });

  const resetButton = createButton(scene, {
    x: width / 2 - 14,
    y: 0,
    width: 28,
    height: 30,
    label: "R",
    accent: UI_COLORS.borderHov,
    fontSize: "10px",
    parent: root,
    onClick: () => onReset?.(api),
  });

  const statusText = scene.add.text(width / 2, 18, "", {
    fontFamily: UI_THEME.fontBody,
    fontSize: "9px",
    color: UI_COLORS.danger,
  }).setOrigin(1, 0.5);

  root.add(descText ? [labelText, descText, statusText] : [labelText, statusText]);
  addToParent(parent, root);

  const api = {
    root,
    bindButton,
    resetButton,
    activate() {
      return bindButton.activate();
    },
    isEnabled() {
      return bindButton.isEnabled();
    },
    setSelected(value) {
      bindButton.setSelected(value);
    },
    setFocused(value) {
      bindButton.setFocused(value);
    },
    setEnabled(value) {
      bindButton.setEnabled(value);
      resetButton.setEnabled(value);
    },
    setLabel(value) {
      bindButton.setLabel(value);
    },
    setStatus(value, color = UI_COLORS.danger) {
      if (!statusText?.active) return;
      try {
        statusText.setText(value || "");
        statusText.setColor(color);
      } catch (_) {
        // Text textures may already be invalid during scene/row teardown.
      }
    },
    flashStatus(value, color = UI_COLORS.danger) {
      if (!statusText?.active || !scene?.tweens) return;
      this.setStatus(value, color);
      scene.tweens.killTweensOf(statusText);
      statusText.setAlpha(1);
      scene.tweens.add({
        targets: statusText,
        alpha: 0,
        delay: 1300,
        duration: 500,
        ease: "Power1.in",
        onComplete: () => {
          if (!statusText?.active) return;
          try {
            statusText.setText("");
            statusText.setAlpha(1);
          } catch (_) {
            // Ignore late tween completion after text texture disposal.
          }
        },
      });
    },
    setVisible(value) {
      root.setVisible(value);
    },
    destroy() {
      scene.tweens?.killTweensOf?.(statusText);
      root.destroy(true);
    },
  };

  return api;
}

export function createHintLegend(scene, options = {}) {
  const {
    x = 0,
    y = 0,
    text = "",
    depth = UI_THEME.depthOverlay + 1,
    scrollFactor = 0,
    parent = null,
    color = UI_COLORS.hint,
    fontSize = "12px",
  } = options;

  const label = scene.add.text(x, y, text, {
    fontFamily: UI_THEME.fontBody,
    fontSize,
    color,
    align: "center",
  }).setOrigin(0.5);
  label.setDepth(depth).setScrollFactor(scrollFactor);
  addToParent(parent, label);
  return label;
}

export function createFocusController(scene, options = {}) {
  let items = (options.items || []).filter(Boolean);
  let index = Phaser.Math.Clamp(options.index ?? 0, 0, Math.max(0, items.length - 1));
  const wrap = options.wrap !== false;
  const enabled = () => options.enabled?.() ?? true;

  function isItemEnabled(item) {
    return item?.isEnabled?.() ?? true;
  }

  function applyFocus() {
    items.forEach((item, i) => {
      try { item?.setFocused?.(i === index); } catch (_) {}
    });
    options.onFocus?.(index, items[index]);
  }

  function move(delta) {
    if (!enabled() || items.length === 0) return;
    let next = index;
    for (let tries = 0; tries < items.length; tries++) {
      next += delta;
      if (wrap) {
        next = (next + items.length) % items.length;
      } else {
        next = Phaser.Math.Clamp(next, 0, items.length - 1);
      }
      if (isItemEnabled(items[next])) {
        index = next;
        scene.soundSystem?.playUiSelect?.();
        applyFocus();
        return;
      }
    }
  }

  function activate() {
    if (!enabled()) return;
    items[index]?.activate?.();
  }

  function adjustOrMove(delta) {
    if (!enabled()) return;
    const current = items[index];
    if (current?.adjust?.(delta)) return;
    move(delta);
  }

  const handlers = [
    ["keydown-UP", () => move(-1)],
    ["keydown-W", () => move(-1)],
    ["keydown-LEFT", () => options.onHorizontal ? options.onHorizontal(-1) : adjustOrMove(-1)],
    ["keydown-A", () => options.onHorizontal ? options.onHorizontal(-1) : adjustOrMove(-1)],
    ["keydown-DOWN", () => move(1)],
    ["keydown-S", () => move(1)],
    ["keydown-RIGHT", () => options.onHorizontal ? options.onHorizontal(1) : adjustOrMove(1)],
    ["keydown-D", () => options.onHorizontal ? options.onHorizontal(1) : adjustOrMove(1)],
    ["keydown-ENTER", activate],
    ["keydown-SPACE", activate],
    ["keydown-ESC", () => { if (enabled()) options.onCancel?.(); }],
  ];
  handlers.forEach(([event, handler]) => scene.input.keyboard.on(event, handler));
  applyFocus();

  return {
    setItems(nextItems, nextIndex = 0) {
      items.forEach(item => {
        try { item?.setFocused?.(false); } catch (_) {}
      });
      items = (nextItems || []).filter(Boolean);
      index = Phaser.Math.Clamp(nextIndex, 0, Math.max(0, items.length - 1));
      applyFocus();
    },
    setIndex(nextIndex) {
      index = Phaser.Math.Clamp(nextIndex, 0, Math.max(0, items.length - 1));
      applyFocus();
    },
    move,
    activate,
    destroy() {
      handlers.forEach(([event, handler]) => scene.input.keyboard.off(event, handler));
      items.forEach(item => item?.setFocused?.(false));
    },
  };
}
