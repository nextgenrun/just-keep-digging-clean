export const UI_FONTS = Object.freeze({
  display: '"Barlow Semi Condensed", Bahnschrift SemiCondensed, Trebuchet MS, sans-serif',
  body: '"Barlow Semi Condensed", Bahnschrift, Trebuchet MS, sans-serif',
  mono: "Cascadia Mono, Consolas, monospace",
});

export const UI_FONT_BOOT = Object.freeze({
  family: "Barlow Semi Condensed",
  regularWeight: 400,
  semiboldWeight: 600,
  boldWeight: 700,
  probeSizePx: 16,
  readinessTimeoutMs: 2000,
});

export async function waitForUiFonts(
  documentRef = globalThis.document,
  config = UI_FONT_BOOT,
) {
  const fonts = documentRef?.fonts;
  if (!fonts?.load) return false;
  const family = `"${config.family}"`;
  const loads = Promise.all([
    fonts.load(`${config.regularWeight} ${config.probeSizePx}px ${family}`),
    fonts.load(`${config.semiboldWeight} ${config.probeSizePx}px ${family}`),
    fonts.load(`${config.boldWeight} ${config.probeSizePx}px ${family}`),
  ]);
  let timeoutId = null;
  const timeout = new Promise(resolve => {
    timeoutId = globalThis.setTimeout(resolve, config.readinessTimeoutMs, false);
  });
  const loaded = await Promise.race([loads.then(() => true, () => false), timeout]);
  if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
  return loaded === true;
}

export const UI_MODAL_LAYOUT = Object.freeze({
  margin: 24,
  compactMargin: 14,
  headerHeight: 82,
  footerHeight: 54,
  contentPadding: 22,
  cornerRadius: 9,
  cardRadius: 7,
  backdropAlpha: 0.82,
  enterDurationMs: 180,
  exitDurationMs: 130,
});

export const PAUSE_MENU_LAYOUT = Object.freeze({
  maxWidth: 1160,
  maxHeight: 680,
  tabRowHeight: 32,
  tabRowOffsetY: 20,
  bodyTopOffset: 56,
  tabGap: 8,
  tabButtonMaxWidth: 112,
  tabButtonMinWidth: 48,
});

export const SAVE_TRANSFER_UI = Object.freeze({
  fileAccept: ".json,application/json",
  startMenu: Object.freeze({
    buttonRowY: 548,
    buttonWidth: 220,
    buttonHeight: 42,
    buttonGap: 18,
    startPromptY: 604,
    dividerY: 638,
    hintY: 660,
    importPanelWidth: 500,
    importPanelHeight: 260,
    importPanelTextInsetX: 30,
    importPanelTitleInsetY: 38,
    importPanelDescriptionOffsetY: -16,
    importPanelButtonOffsetY: 50,
    importPanelFooterInsetY: 24,
  }),
  pause: Object.freeze({
    compactBodyHeight: 300,
    horizontalInset: 18,
    standardActionTop: 112,
    compactActionTop: 68,
    standardBottomInset: 18,
    compactBottomInset: 12,
    statusReserve: 24,
    standardButtonGap: 10,
    compactButtonGap: 6,
    minButtonHeight: 34,
    maxButtonHeight: 52,
    maxButtonWidth: 560,
  }),
  copy: Object.freeze({
    startExport: "EXPORT SAVE",
    startImport: "IMPORT SAVE",
    pauseTitle: "MANUAL SAVE TOOLS",
    pauseDescription: "Export a portable copy or import one into this slot.",
    pauseSafety: "Imports create a safety backup, then reload the selected slot.",
    saveNow: "SAVE NOW",
    saveAndExport: "SAVE + EXPORT FILE",
    importAndReload: "IMPORT FILE + RELOAD",
  }),
});

export const SETTINGS_PANEL_LAYOUT = Object.freeze({
  compactWidth: 760,
  compactHeight: 420,
  tabCenterInsetY: 24,
  tabButtonHeight: 32,
  tabButtonWidth: 112,
  compactTabButtonWidth: 88,
  tabGap: 4,
  tabHorizontalInset: 18,
  contentTopInsetY: 56,
  contentBottomInsetY: 10,
  flashBottomInsetY: 18,
  audio: Object.freeze({
    firstRowOffsetY: 38,
    compactFirstRowOffsetY: 32,
    rowGap: 46,
    compactRowGap: 40,
    sliderMaxWidth: 520,
    compactSliderMaxWidth: 470,
    toggleGapY: 9,
    footerBottomInsetY: 30,
  }),
  controls: Object.freeze({
    instructionOffsetY: 3,
    firstRowOffsetY: 36,
    minRowGap: 32,
    rowGap: 37,
    compactRowGap: 33,
    threeColumnMinWidth: 780,
    columnGutter: 20,
  }),
  display: Object.freeze({
    compactReferenceHeight: 314,
    headerOffsetY: 0,
    fullscreenOffsetY: 34,
    fullscreenButtonHeight: 40,
    controlHintsOffsetY: 75,
    cameraShakeOffsetY: 113,
    intensityOffsetY: 156,
    flashOffsetY: 205,
    groupHeaderOffsetY: 228,
    groupStartOffsetY: 252,
    groupRowGap: 38,
    fiveColumnMinWidth: 500,
    threeColumnMinWidth: 360,
    groupHorizontalInset: 12,
    groupButtonMaxWidth: 58,
    groupButtonMinWidth: 38,
    groupButtonHeight: 26,
    groupButtonGap: 6,
    resetBottomInsetY: 19,
    resetButtonMaxWidth: 220,
    resetButtonHeight: 34,
    resetButtonGap: 16,
    shortFullscreenOffsetY: 28,
    shortFullscreenButtonHeight: 36,
    shortControlHintsOffsetY: 62,
    shortCameraShakeOffsetY: 92,
    shortIntensityOffsetY: 129,
    shortFlashOffsetY: 176,
    shortGroupHeaderOffsetY: 198,
    shortGroupStartOffsetY: 222,
    shortPrimaryButtonHeight: 30,
    shortGroupButtonHeight: 22,
    shortResetBottomInsetY: 17,
    shortResetButtonHeight: 30,
  }),
  gameplay: Object.freeze({
    compactReferenceHeight: 314,
    headerOffsetY: 0,
    floatingLabelOffsetY: 29,
    modeButtonOffsetY: 66,
    modeButtonHeight: 40,
    selectedSummaryOffsetY: 91,
    floatingHintOffsetY: 117,
    feedbackStartOffsetY: 160,
    feedbackRowGap: 54,
    feedbackHintOffsetY: 22,
    footerBottomInsetY: 10,
    modeButtonGap: 10,
    modeHorizontalInset: 18,
    modeButtonMaxWidth: 170,
    shortFloatingLabelOffsetY: 24,
    shortModeButtonOffsetY: 56,
    shortModeButtonHeight: 34,
    shortSelectedSummaryOffsetY: 78,
    shortFloatingHintOffsetY: 96,
    shortFeedbackStartOffsetY: 128,
    shortFeedbackRowGap: 40,
    shortFooterBottomInsetY: 8,
  }),
});

export const UI_DEPTHS = Object.freeze({
  hud: 1200,
  menu: 3000,
  modal: 3400,
  notification: 3800,
});

export const SHOP_MERCHANT_PROFILES = Object.freeze({
  gemPowerMerchant: Object.freeze({
    title: "GEM POWER WORKSHOP",
    role: "Aether Engineer",
    greeting: "Shape raw crystal power into flight, endurance, and control.",
  }),
  playerUpgrades: Object.freeze({
    title: "TRAINING HALL",
    role: "Combat Trainer",
    greeting: "Choose a discipline. I will show you exactly what improves next.",
  }),
  gearMerchant: Object.freeze({
    title: "GEAR FORGE",
    role: "Master Smith",
    greeting: "Tools for deeper stone. Check every material before you commit.",
  }),
  moneyMonster: Object.freeze({
    title: "MONEY MONSTER EXCHANGE",
    role: "Licensed Buyer",
    greeting: "Upgrade your market skills or convert gathered resources into money.",
  }),
  magmaMoneyMonster: Object.freeze({
    title: "MOLTEN ARC FORGE",
    role: "Arc Core Smith and Buyer",
    greeting: "Bring attuned Heavenblock parts and deep-world ore. I forge cores or buy surplus stock.",
  }),
  boboMerchant: Object.freeze({
    title: "BOBO'S COUNTER",
    role: "Collector of Useful Things",
    greeting: "Everything here has a purpose. Some purposes are stranger than others.",
  }),
  default: Object.freeze({
    title: "MERCHANT DESK",
    role: "Trader",
    greeting: "Select an item to inspect its effect, price, and requirements.",
  }),
});
