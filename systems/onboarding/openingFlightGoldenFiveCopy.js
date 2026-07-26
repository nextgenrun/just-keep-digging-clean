import { USER_SETTINGS } from "../UserSettings.js";

export function interpolateOpeningFlightCopy(template, keys) {
  return Object.entries(keys).reduce(
    (copy, [token, value]) => copy.replaceAll(`{${token}}`, value),
    template,
  );
}

export function getOpeningFlightKeyLabels() {
  return {
    leftKey: USER_SETTINGS.getKeyLabel("moveLeft"),
    rightKey: USER_SETTINGS.getKeyLabel("moveRight"),
    downKey: USER_SETTINGS.getKeyLabel("aimDown"),
    digKey: USER_SETTINGS.getKeyLabel("dig"),
    flyKey: USER_SETTINGS.getKeyLabel("fly"),
  };
}
