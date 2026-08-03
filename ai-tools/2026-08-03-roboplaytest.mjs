import { parseRoboplaytestConfig } from "./roboplaytest/2026-08-03-roboplaytest-config.mjs";
import { GameDriver } from "./roboplaytest/2026-08-03-roboplaytest-driver.mjs";
import { RoboplaytestReport } from "./roboplaytest/2026-08-03-roboplaytest-report.mjs";
import { runRoboplaytestScenarios } from "./roboplaytest/2026-08-03-roboplaytest-scenarios.mjs";
import { createRoboplaytestSession } from "./roboplaytest/2026-08-03-roboplaytest-session.mjs";

const config = parseRoboplaytestConfig();
if (config.help) {
  console.log(config.helpText);
  process.exitCode = 0;
} else {
  const report = new RoboplaytestReport(config);
  let session = null;
  let finalSnapshot = null;
  let result = null;
  try {
    session = await createRoboplaytestSession(config);
    const driver = new GameDriver({ config, report, session });
    await runRoboplaytestScenarios(driver);
    finalSnapshot = await driver.snapshot().catch(() => null);
    const starlightLifecycle = report.phases.find(phase => phase.id === "starlight-assets")?.result;
    const starlightRelease = report.phases.find(phase => phase.id === "starlight-release")?.result;
    for (const finding of finalSnapshot?.health?.findings || []) {
      const lazyReleaseMismatch = finding.key?.startsWith?.("starlight-talent-tree-invariant")
        && starlightLifecycle?.active?.ready === true
        && starlightRelease?.released?.viewOpen === false;
      const severity = lazyReleaseMismatch ? "warning" : finding.severity === "error" ? "error" : "warning";
      const message = lazyReleaseMismatch
        ? "Runtime canary flags the closed Starlight view after its verified lazy assets were intentionally released."
        : finding.message || finding.key;
      report.addIssue(severity, lazyReleaseMismatch ? "starlight-canary" : "runtime-canary", message, finding);
    }
    for (const error of finalSnapshot?.uiErrors || []) {
      report.addIssue("error", "runtime-ui", error.message || String(error), error);
    }
    const performance = finalSnapshot?.health?.performance;
    if (performance?.textureMemory?.overBudget) {
      report.addIssue(
        "warning",
        "runtime-performance",
        `Decoded texture estimate ${performance.textureMemory.estimatedMiB.toFixed(1)} MiB exceeds the ${performance.textureMemory.highWatermarkMiB} MiB watermark.`,
        performance.textureMemory,
      );
    }
    if (performance?.frameMs?.p95 > config.performanceThresholds.frameP95WarningMs) {
      report.addIssue(
        "warning",
        "runtime-performance",
        `Headless frame-time p95 was ${performance.frameMs.p95} ms.`,
        performance.frameMs,
      );
    }
    if (performance?.onePercentLowFps < config.performanceThresholds.onePercentLowWarningFps) {
      report.addIssue(
        "warning",
        "runtime-performance",
        `Headless one-percent-low was ${performance.onePercentLowFps} FPS.`,
        performance,
      );
    }
    if ((performance?.assetLoads?.failed || 0) > 0) {
      report.addIssue("error", "runtime-assets", `${performance.assetLoads.failed} runtime asset loads failed.`, performance.assetLoads);
    }
    if ((performance?.saves?.failedFlushes || 0) > 0) {
      report.addIssue("error", "runtime-save", `${performance.saves.failedFlushes} save flushes failed.`, performance.saves);
    }
  } catch (error) {
    report.addIssue("fatal", "runner", error.message || String(error), error.stack || null);
  } finally {
    result = report.finalize({
      browserEvents: session?.browserEvents || [],
      finalSnapshot,
    });
    await session?.close?.();
  }

  console.log(JSON.stringify({
    status: result.report.status,
    report: result.reportPath,
    summary: result.summaryPath,
    issues: result.report.issues.length,
  }, null, 2));
  process.exitCode = result.report.status === "fail" ? 1 : 0;
}
