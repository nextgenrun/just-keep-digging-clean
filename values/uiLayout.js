export const UI_FONTS = Object.freeze({
  display: "Bahnschrift SemiCondensed, Trebuchet MS, sans-serif",
  body: "Bahnschrift, Trebuchet MS, sans-serif",
  mono: "Cascadia Mono, Consolas, monospace",
});

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
