import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { PlayerInput } from "../player/PlayerInput.js";
import {
  RANDOM_EVENT_TYPE_ORDER,
  RANDOM_EVENT_TYPES,
  resolveRandomEventFlags,
} from "../values/randomWorldEvents.js";

const key = isDown => ({ isDown });
const keys = {
  left: key(false),
  right: key(false),
  aimLeft: key(false),
  aimRight: key(false),
  aimUp: key(false),
  aimDown: key(false),
  jump: key(false),
  mine: key(false),
  reset: key(false),
  shift: key(false),
  q: key(false),
  thunderStrike: key(false),
};
const scene = {
  debrisShieldSystem: { isInputCaptured: () => true },
};
const input = new PlayerInput(scene, { getKeys: () => keys });
const sprite = {
  scene: { floatingTextSystem: { getUnlockedConstellations: () => [] } },
};
const body = {
  x: 0,
  y: 0,
  w: 31,
  h: 75,
  vx: 0,
  setFlightActive() {},
};
const upgrades = {
  isGemPowerUnlocked: () => false,
  isQuickslashUnlocked: () => true,
  getUpgradeEffects: () => ({}),
};
const abilities = new PlayerAbilities(sprite, null, { tileSize: 94 }, upgrades, body);
abilities.gemPower = 100;

const result = document.querySelector("#result");
const status = document.querySelector("#status");
const flags = resolveRandomEventFlags("?moneyMonsterRush=1");
let activations = 0;
let activeOnLastKeyDown = false;

function snapshot() {
  const rushSchedulable = RANDOM_EVENT_TYPE_ORDER.includes(
    RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH,
  );
  const passed = activations > 0 && !rushSchedulable && flags.moneyMonsterRush === false;
  result.textContent = passed ? "PASS — held Q reaches Quickslash" : "Waiting for Q input…";
  result.dataset.result = passed ? "pass" : "waiting";
  status.textContent = JSON.stringify({
    activations,
    activeOnLastKeyDown,
    quickslashActive: abilities.isQuickslashActive(),
    rushSchedulable,
    rushFlag: flags.moneyMonsterRush,
    staleDebrisCapturePresent: true,
  }, null, 2);
}

function updateAbility() {
  abilities.update(1 / 60, input, true, true);
}

window.addEventListener("keydown", event => {
  if (event.code !== "KeyQ") return;
  keys.q.isDown = true;
  updateAbility();
  activeOnLastKeyDown = abilities.isQuickslashActive();
  if (activeOnLastKeyDown && !event.repeat) activations += 1;
  snapshot();
});

window.addEventListener("keyup", event => {
  if (event.code !== "KeyQ") return;
  keys.q.isDown = false;
  updateAbility();
  snapshot();
});

document.body.focus();
snapshot();
