import { STARTUP_IMAGE_VARIANTS } from "../../values/startupImageVariants.js";

// Substitute compact delivery bytes without changing texture keys, pixels sizes or frames.
export function installStartupImageVariants(scene) {
  const substitute = (_key, type, _loader, file) => {
    if (type !== "image" || typeof file?.url !== "string") return;
    const match = file.url.match(/^([^?#]+)(.*)$/);
    const replacement = STARTUP_IMAGE_VARIANTS[match[1]];
    if (replacement) file.url = replacement + match[2];
  };
  scene.load.on("addfile", substitute);
  scene.events.once("shutdown", () => scene.load.off("addfile", substitute));
}
