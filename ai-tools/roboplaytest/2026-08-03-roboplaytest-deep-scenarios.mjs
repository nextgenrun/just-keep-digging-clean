import { runDeepCoreScenarios } from "./2026-08-03-roboplaytest-deep-core.mjs";
import {
  runDeepUiScenarios,
  runStarlightScenarios,
} from "./2026-08-03-roboplaytest-deep-ui.mjs";
import { runDeepWorldScenarios } from "./2026-08-03-roboplaytest-deep-world.mjs";
import { runWorldrootScenarios } from "./2026-08-30-roboplaytest-worldroot.mjs";

export async function runEarlyDeepScenarios(driver) {
  await runDeepCoreScenarios(driver);
  await runDeepUiScenarios(driver);
  await runWorldrootScenarios(driver);
}

export async function runLateDeepScenarios(driver) {
  await runDeepWorldScenarios(driver);
  await runStarlightScenarios(driver);
}
