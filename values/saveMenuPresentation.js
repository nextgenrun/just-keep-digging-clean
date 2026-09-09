// Presentation-only save-menu art contract. This module intentionally owns no
// save data, file transfer, input, navigation, or gameplay behavior.
const ROOT = "sprites/UI/save-menu-v1";

export const SAVE_MENU_PRESENTATION = Object.freeze({
  copy: Object.freeze({
    title: "SAVE SLOTS",
    subtitle: "Choose a save to continue or start a new one",
    startPrompt: "CHOOSE A SLOT, THEN PRESS ENTER OR SPACE",
    controlsHint: "1 / 2 / 3: choose  •  Enter / Space: start  •  Del: clear  •  B: backups  •  E: export  •  I: import  •  Esc: back",
    slotPrefix: "SLOT",
    lastPlayedPrefix: "LAST PLAYED",
    runEnded: "RUN ENDED",
    startsWithFlight: "STARTS WITH FLIGHT",
    casual: "CASUAL",
    life: "LIFE",
    lives: "LIVES",
    unknownDate: "Unknown date",
    continue: "CONTINUE",
    newSave: "NEW SAVE",
    selectedContinue: "PRESS ENTER OR SPACE TO CONTINUE",
    selectedNew: "PRESS ENTER OR SPACE TO CHOOSE SAVE RULES",
    endedPrompt: "RUN ENDED  •  EXPORT OR CLEAR THIS SLOT",
    clearQuestion: "Clear save slot {slot}?",
    clearHint: "Y: clear  •  N / Esc: cancel",
    clear: "CLEAR",
    cancel: "CANCEL",
    backupsTitle: "BACKUPS FOR SLOT {slot}",
    backupsAvailable: "backups available",
    lockedBackups: "Hardcore backups",
    noBackups: "No backups available",
    backupPrefix: "Backup",
    restore: "RESTORE",
    hardcoreBackupLock: "HARDCORE LOCKED",
    hardcoreBackupHint: "Hardcore backups cannot rewind lives or restore an ended run.",
    casualBackupHint: "Choose Restore beside any Casual backup.",
    close: "CLOSE",
    importTitle: "IMPORT SAVE",
    importBody: "Choose a save file. This slot is backed up before the imported save replaces it.",
    selectFile: "SELECT FILE",
    jsonOnly: "JSON save files only",
  }),
  baked: Object.freeze({
    cards: Object.freeze({ key: "baked-save-cards-v2", path: "sprites/UI/save-menu-baked-v2/save-cards-original.png" }),
    copy: Object.freeze({ key: "baked-save-copy-v2", path: "sprites/UI/save-menu-baked-v2/save-copy-original.png" }),
  }),
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
      headerSafeTopOffsetYPx: 35,
      headerOffsetYPx: 36,
      headerSafeBottomOffsetYPx: 50,
      headerFontSizePx: 11,
      headerMinimumFontSizePx: 10,
      headerMaxWidthPx: 126,
      dividerOffsetYPx: 52,
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
  const { slot, modal, choice, button, baked } = SAVE_MENU_PRESENTATION;
  return [
    [baked.cards.key, baked.cards.path],
    [baked.copy.key, baked.copy.path],
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
