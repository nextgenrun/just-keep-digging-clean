// Presentation-only main-menu art contract. This module intentionally owns no
// navigation, input, audio, timing, or gameplay behavior.
export const MAIN_MENU_PRESENTATION = Object.freeze({
  artEnabledByDefault: true,
  query: Object.freeze({
    param: "mainMenuArt",
    disabledValue: "0",
  }),
  button: Object.freeze({
    idleKey: "main-menu-button-idle-v1",
    idlePath: "sprites/UI/main-menu-v1/main-menu-button-idle-v1.png",
    selectedKey: "main-menu-button-selected-v1",
    selectedPath: "sprites/UI/main-menu-v1/main-menu-button-selected-v1.png",
    widthPx: 260,
    heightPx: 52,
  }),
  cursor: Object.freeze({
    insetXPx: 3,
    widthPx: 3,
    heightPx: 34,
  }),
});

export function resolveMainMenuArtEnabled(search = globalThis.location?.search || "") {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  return params.get(MAIN_MENU_PRESENTATION.query.param)
    !== MAIN_MENU_PRESENTATION.query.disabledValue;
}
