import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { PlayerInput } from "../player/PlayerInput.js";
import { getCelestialActionBarAbilityState } from
  "../world/playScene/CelestialActionBarRuntime.js";
import { CELESTIAL_ACTION_BAR_ENTRY_IDS } from "../values/celestialActionBar.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";

const key = () => ({ isDown: false });
const keys = {
  left: key(),
  right: key(),
  aimLeft: key(),
  aimRight: key(),
  aimUp: key(),
  aimDown: key(),
  jump: key(),
  mine: key(),
  reset: key(),
  shift: key(),
  q: key(),
  thunderStrike: key(),
};
const input = new PlayerInput({}, { getKeys: () => keys });
const body = {
  x: 0,
  y: 0,
  w: 31,
  h: 75,
  vx: 0,
  vy: 0,
  setFlightActive(value) { this.flightActive = value; },
};
const abilities = new PlayerAbilities(
  {
    scene: {
      floatingTextSystem: { getUnlockedConstellations: () => [] },
      hudSystem: { flashStatus() {} },
    },
  },
  null,
  { tileSize: 94, flightSpeedPxPerSec: 252 },
  {
    isGemPowerUnlocked: () => true,
    isQuickslashUnlocked: () => true,
    getUpgradeEffects: () => ({}),
  },
  body,
);
// Celestial Engines unlock from Level 3, where level progression supplies the
// first 30 GP above the 100 GP base capacity.
abilities.setProgressionGemPowerMaxBonus(30);
abilities.gemPower = 130;
abilities.setAbilityAssetReadiness({
  isReady: () => true,
  ensure: async () => ({ ready: true }),
});

const engineScene = {
  upgradeSystem: { godModeActive: false },
  starHeartProgressionSystem: { getSnapshot: () => ({ godMode: false }) },
  celestialTalentProgressionSystem: {
    getSnapshot: () => ({
      unlockedAbilityIds: [CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR],
      branches: [],
    }),
  },
  celestialEngineController: {
    isEngineActive: () => false,
    isActivationAvailable: () => true,
  },
  playerController: { abilities },
};

const result = document.querySelector("#result");
const status = document.querySelector("#status");
let combinedSnapshot = null;

function update() {
  abilities.update(1 / 60, input, true, true);
  const engineState = getCelestialActionBarAbilityState(
    engineScene,
    CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR,
  );
  const snapshot = {
    quickslashActive: abilities.isQuickslashActive(),
    flying: abilities.isFlying(),
    bodyFlightActive: body.flightActive === true,
    baseFlightSpeed: 252,
    effectiveFlightSpeed: abilities.getEffectiveFlightSpeed(),
    quickslashMovementBonus: abilities.getQuickslashMovementBonus(),
    expectedMovementBonus: PLAYER_ABILITIES_CONFIG.quickslashMovementBonusPxPerSec,
    gemPower: abilities.getGemPowerExact(),
    starEngineUnlocked: engineState.unlocked,
    starEngineAvailable: engineState.available,
    starEngineUnavailableReason: engineState.unavailableReason,
  };
  if (snapshot.quickslashActive && snapshot.flying) combinedSnapshot = snapshot;
  const proof = combinedSnapshot || snapshot;
  const passed = Boolean(
    combinedSnapshot
    && combinedSnapshot.bodyFlightActive
    && combinedSnapshot.effectiveFlightSpeed
      === combinedSnapshot.baseFlightSpeed + combinedSnapshot.expectedMovementBonus
    && combinedSnapshot.starEngineAvailable,
  );
  result.textContent = passed
    ? "PASS — Q + Flight + Star talent composition is live"
    : "Waiting for simultaneous Flight + Quickslash input…";
  result.dataset.result = passed ? "pass" : "waiting";
  status.textContent = JSON.stringify(proof, null, 2);
}

window.addEventListener("keydown", event => {
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") keys.shift.isDown = true;
  if (event.code === "KeyQ") keys.q.isDown = true;
  if (event.code === "KeyD") {
    keys.right.isDown = true;
    keys.aimRight.isDown = true;
  }
  update();
});

window.addEventListener("keyup", event => {
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") keys.shift.isDown = false;
  if (event.code === "KeyQ") keys.q.isDown = false;
  if (event.code === "KeyD") {
    keys.right.isDown = false;
    keys.aimRight.isDown = false;
  }
  update();
});

document.body.focus();
update();
