// Presentation-only save-menu art contract. This module intentionally owns no
// save data, file transfer, input, navigation, or gameplay behavior.
const ROOT = "sprites/UI/save-menu-v1";

export const SAVE_MENU_PRESENTATION = Object.freeze({
  artEnabledByDefault: true,
  query: Object.freeze({
    param: "saveMenuArt",
    disabledValue: "0",
  }),
  slot: Object.freeze({
    displayWidthPx: 290,
    displayHeightPx: 200,
    idleKey: "save-menu-slot-idle-v1",
    idlePath: `${ROOT}/save-slot-idle-v1.png`,
    selectedKey: "save-menu-slot-selected-v1",
    selectedPath: `${ROOT}/save-slot-selected-v1.png`,
    textLayout: Object.freeze({
      horizontalSafeInsetPx: 31,
      headerOffsetYPx: 25,
      headerFontSizePx: 11,
      headerMinimumFontSizePx: 10,
      headerMaxWidthPx: 126,
      modeOffsetYPx: -37,
      modeFontSizePx: 12,
      modeMaxWidthPx: 216,
      summaryOffsetYPx: 10,
      summaryFontSizePx: 12,
      summaryMinimumFontSizePx: 10,
      summaryMaxWidthPx: 216,
      summaryLineSpacingPx: 2,
    }),
  }),
  modal: Object.freeze({
    confirm: Object.freeze({
      key: "save-menu-modal-confirm-v1",
      path: `${ROOT}/save-modal-confirm-v1.png`,
    }),
    backup: Object.freeze({
      key: "save-menu-modal-backup-v1",
      path: `${ROOT}/save-modal-backup-v1.png`,
    }),
    import: Object.freeze({
      key: "save-menu-modal-import-v1",
      path: `${ROOT}/save-modal-import-v1.png`,
    }),
  }),
  choice: Object.freeze({
    idleKey: "save-menu-choice-idle-v1",
    idlePath: `${ROOT}/save-choice-idle-v1.png`,
    selectedKey: "save-menu-choice-selected-v1",
    selectedPath: `${ROOT}/save-choice-selected-v1.png`,
  }),
  button: Object.freeze({
    idleKey: "main-menu-button-idle-v1",
    idlePath: "sprites/UI/main-menu-v1/main-menu-button-idle-v1.png",
    selectedKey: "main-menu-button-selected-v1",
    selectedPath: "sprites/UI/main-menu-v1/main-menu-button-selected-v1.png",
  }),
});

export function resolveSaveMenuArtEnabled(search = globalThis.location?.search || "") {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  return SAVE_MENU_PRESENTATION.artEnabledByDefault
    && params.get(SAVE_MENU_PRESENTATION.query.param)
      !== SAVE_MENU_PRESENTATION.query.disabledValue;
}

export function getSaveMenuAssetEntries() {
  const { slot, modal, choice, button } = SAVE_MENU_PRESENTATION;
  return [
    [slot.idleKey, slot.idlePath],
    [slot.selectedKey, slot.selectedPath],
    [modal.confirm.key, modal.confirm.path],
    [modal.backup.key, modal.backup.path],
    [modal.import.key, modal.import.path],
    [choice.idleKey, choice.idlePath],
    [choice.selectedKey, choice.selectedPath],
    [button.idleKey, button.idlePath],
    [button.selectedKey, button.selectedPath],
  ];
}
