import { GAME_WIKI } from "../../values/gameWiki.js";

export function openGameWiki(openWindow = globalThis.open, config = GAME_WIKI) {
  if (typeof openWindow !== "function") return false;
  try {
    const openedWindow = openWindow.call(
      globalThis,
      config.url,
      config.target,
      config.windowFeatures,
    );
    openedWindow?.opener && (openedWindow.opener = null);
    return true;
  } catch (_error) {
    return false;
  }
}
