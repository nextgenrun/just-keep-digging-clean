import { UI_COLORS } from "../../values/uiColors.js";
import { SAVE_TRANSFER_UI, UI_FONTS } from "../../values/uiLayout.js?rev=20260727-save-transfer-v1";
import { createManualSaveFilePicker } from "../components/manualSaveFilePicker.js";
import { createButton } from "../PhaserUiKit.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getSaveTransferPanelMetrics(width, height) {
  const config = SAVE_TRANSFER_UI.pause;
  const compact = height < config.compactBodyHeight;
  const horizontalInset = config.horizontalInset;
  const actionTop = compact ? config.compactActionTop : config.standardActionTop;
  const bottomInset = compact ? config.compactBottomInset : config.standardBottomInset;
  const buttonGap = compact ? config.compactButtonGap : config.standardButtonGap;
  const actionBottom = height - bottomInset - config.statusReserve;
  const availableHeight = Math.max(0, actionBottom - actionTop - buttonGap * 2);
  const buttonHeight = clamp(
    availableHeight / 3,
    config.minButtonHeight,
    config.maxButtonHeight,
  );
  const buttonWidth = Math.min(config.maxButtonWidth, width - horizontalInset * 2);
  const firstButtonY = actionTop + buttonHeight / 2;
  const lastButtonBottom = firstButtonY
    + (buttonHeight + buttonGap) * 2
    + buttonHeight / 2;

  return {
    compact,
    horizontalInset,
    actionTop,
    actionBottom,
    buttonGap,
    buttonHeight,
    buttonWidth,
    firstButtonY,
    lastButtonBottom,
    statusY: height - bottomInset,
  };
}

export function createSaveTransferPanelContent(scene, options = {}) {
  const width = Math.max(240, Number(options.width) || 700);
  const height = Math.max(190, Number(options.height) || 380);
  const metrics = getSaveTransferPanelMetrics(width, height);
  const root = scene.add.container(options.x || 0, options.y || 0);
  options.parent?.add?.(root);

  const surface = scene.add.graphics();
  surface.fillStyle(UI_COLORS.cardBase, 0.98);
  surface.fillRoundedRect(0, 0, width, height, 7);
  surface.lineStyle(2, UI_COLORS.borderSel, 0.96);
  surface.strokeRoundedRect(0, 0, width, height, 7);
  root.add(surface);

  const title = scene.add.text(
    metrics.horizontalInset,
    metrics.compact ? 13 : 17,
    SAVE_TRANSFER_UI.copy.pauseTitle,
    {
      fontFamily: UI_FONTS.display,
      fontSize: metrics.compact ? "14px" : "17px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    },
  );
  root.add(title);

  const slot = scene.add.text(
    width - metrics.horizontalInset,
    metrics.compact ? 14 : 18,
    `SLOT ${options.slotId || 1}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      fontStyle: "bold",
      color: UI_COLORS.gold,
    },
  ).setOrigin(1, 0);
  root.add(slot);

  const description = scene.add.text(
    metrics.horizontalInset,
    metrics.compact ? 38 : 49,
    metrics.compact
      ? SAVE_TRANSFER_UI.copy.pauseSafety
      : `${SAVE_TRANSFER_UI.copy.pauseDescription}\n${SAVE_TRANSFER_UI.copy.pauseSafety}`,
    {
      fontFamily: UI_FONTS.mono,
      fontSize: metrics.compact ? "9px" : "11px",
      color: UI_COLORS.body,
      lineSpacing: 5,
      wordWrap: { width: width - metrics.horizontalInset * 2 },
    },
  );
  root.add(description);

  const status = scene.add.text(
    width / 2,
    metrics.statusY,
    "Ready — current save remains local until you choose an action.",
    {
      fontFamily: UI_FONTS.mono,
      fontSize: metrics.compact ? "9px" : "10px",
      color: UI_COLORS.hint,
      align: "center",
      wordWrap: { width: width - metrics.horizontalInset * 2 },
    },
  ).setOrigin(0.5, 1);
  root.add(status);

  let busy = false;
  const controls = [];
  let controlDefinitions = [];

  const setBusy = value => {
    busy = Boolean(value);
    controls.forEach((control, index) => {
      const definition = controlDefinitions[index] || {};
      const enabled = !busy && definition.enabled !== false;
      control.setEnabled(
        enabled,
        busy ? "WORKING" : definition.disabledReason || "",
      );
    });
  };

  const setStatus = (message, success = null) => {
    if (!status?.active) return;
    status.setText(message || "");
    status.setColor(
      success === true
        ? UI_COLORS.success
        : success === false
          ? UI_COLORS.danger
          : UI_COLORS.hint,
    );
  };

  const runAction = async (pendingMessage, action) => {
    if (busy) return false;
    setBusy(true);
    setStatus(pendingMessage);
    try {
      const result = await action?.();
      const success = result?.success !== false && result !== false;
      setStatus(
        result?.message || (success ? "Done." : "That action could not be completed."),
        success,
      );
      return success;
    } catch (error) {
      setStatus(error?.message || "That action could not be completed.", false);
      return false;
    } finally {
      if (root?.active) setBusy(false);
    }
  };

  let filePicker = null;
  const definitions = [
    {
      label: SAVE_TRANSFER_UI.copy.saveNow,
      icon: "journal",
      accent: UI_COLORS.borderGood,
      onClick: () => runAction("Saving current progress...", options.onSave),
    },
    {
      label: SAVE_TRANSFER_UI.copy.saveAndExport,
      icon: "journal",
      accent: UI_COLORS.borderSel,
      onClick: () => runAction("Saving, then preparing the download...", options.onExport),
    },
    {
      label: SAVE_TRANSFER_UI.copy.importAndReload,
      icon: "next",
      accent: UI_COLORS.borderHov,
      onClick: () => filePicker?.open(),
    },
  ];

  definitions.forEach((definition, index) => {
    const control = createButton(scene, {
      x: width / 2,
      y: metrics.firstButtonY + index * (metrics.buttonHeight + metrics.buttonGap),
      width: metrics.buttonWidth,
      height: metrics.buttonHeight,
      label: definition.label,
      icon: definition.icon,
      accent: definition.accent,
      align: "left",
      fontSize: metrics.compact ? "11px" : "13px",
      parent: root,
      onFocus: () => options.onFocus?.(index),
      onClick: definition.onClick,
    });
    control.setEnabled(
      definition.enabled !== false,
      definition.disabledReason || "",
    );
    controls.push(control);
  });
  controlDefinitions = definitions;

  filePicker = createManualSaveFilePicker({
    onSelect: file => runAction(
      "Saving a backup, validating the file, and reloading...",
      () => options.onImport?.(file),
    ),
  });

  return {
    root,
    metrics,
    getControls() {
      return controls;
    },
    setStatus,
    destroy() {
      filePicker.destroy();
      root.destroy(true);
    },
  };
}
