import fs from "node:fs";
import path from "node:path";

function safeName(value) {
  return String(value).replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function durationMs(startedAt, finishedAt) {
  return Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());
}

export function buildSummaryMarkdown(report) {
  const counts = report.issues.reduce((map, issue) => {
    map[issue.severity] = (map[issue.severity] || 0) + 1;
    return map;
  }, {});
  const categories = report.phases.reduce((map, phase) => {
    const key = phase.category || "critical";
    const entry = map.get(key) || { total: 0, passed: 0 };
    entry.total += 1;
    if (phase.status === "pass") entry.passed += 1;
    map.set(key, entry);
    return map;
  }, new Map());
  const lines = [
    "# Dig Game RoboPlaytest",
    "",
    `- Status: **${report.status.toUpperCase()}**`,
    `- URL: ${report.url}`,
    `- Duration: ${report.durationMs} ms`,
    `- Profile: ${report.profile || "critical"}`,
    `- Phases: ${report.phases.filter(item => item.status === "pass").length}/${report.phases.length} passed`,
    `- Issues: ${counts.fatal || 0} fatal, ${counts.error || 0} error, ${counts.warning || 0} warning`,
    "",
    "## Coverage",
    "",
    report.profile === "deep"
      ? "Fresh menu, movement, Flight, and mining probes use real keyboard input. Deep audits cover runtime collaborators, the full WorldModel, economy and save contracts, supported UI surfaces, onboarding disclosure, weather and lighting, cave hazards, random events, Hardcore rules, Starlight lazy assets, depth visuals, and the live 100m–5000m progression path. Accelerated positioning is identified per phase."
      : "Fresh menu/save flow and starter mining use real keyboard input. The long 100m–5000m progression span is accelerated through the live DepthGate, Upgrade, Heavenblocks, Crafting, Journey, renderer, and runtime-health systems.",
    "",
    "### Coverage groups",
    "",
  ];
  for (const [category, value] of categories) {
    lines.push(`- ${category}: ${value.passed}/${value.total} passed`);
  }
  lines.push(
    "",
    "## Phases",
    "",
  );
  for (const phase of report.phases) {
    const accelerated = phase.accelerated ? " · accelerated setup" : "";
    lines.push(`- ${phase.status === "pass" ? "PASS" : "FAIL"} — [${phase.category || "critical"}] ${phase.title} (${phase.durationMs} ms${accelerated})`);
  }
  lines.push("", "## Issues", "");
  if (!report.issues.length) lines.push("No automated issues found.");
  else report.issues.forEach(issue => lines.push(`- **${issue.severity.toUpperCase()}** [${issue.source}] ${issue.message}`));
  lines.push("", "## Artifacts", "");
  report.phases.forEach(phase => {
    if (phase.screenshot?.path) lines.push(`- ${path.basename(phase.screenshot.path)}`);
  });
  lines.push("- report.json", "- browser-events.json", "");
  return `${lines.join("\n")}\n`;
}

export class RoboplaytestReport {
  constructor(config) {
    fs.mkdirSync(config.output, { recursive: true });
    this.config = config;
    this.startedAt = new Date().toISOString();
    this.phases = [];
    this.issues = [];
  }

  beginPhase(id, title, accelerated = false, category = "critical") {
    const phase = { id, title, category, accelerated, status: "running", startedAt: new Date().toISOString() };
    this.phases.push(phase);
    return phase;
  }

  finishPhase(phase, status, details = {}) {
    phase.status = status;
    phase.finishedAt = new Date().toISOString();
    phase.durationMs = durationMs(phase.startedAt, phase.finishedAt);
    Object.assign(phase, details);
  }

  screenshotPath(phase) {
    const index = String(this.phases.indexOf(phase) + 1).padStart(2, "0");
    return path.join(this.config.output, `${index}-${safeName(phase.id)}.png`);
  }

  addIssue(severity, source, message, evidence = null) {
    const duplicate = this.issues.some(issue => (
      issue.severity === severity && issue.source === source && issue.message === message
    ));
    if (!duplicate) this.issues.push({ severity, source, message, evidence });
  }

  finalize({ browserEvents = [], finalSnapshot = null } = {}) {
    for (const event of browserEvents) {
      const errorLike = event.kind === "pageerror"
        || event.kind === "console:error"
        || event.kind === "http";
      this.addIssue(errorLike ? "error" : "warning", event.kind, event.message, event);
    }
    const finishedAt = new Date().toISOString();
    const hasErrors = this.issues.some(issue => ["fatal", "error"].includes(issue.severity));
    const hasWarnings = this.issues.some(issue => issue.severity === "warning");
    const status = hasErrors || (this.config.failOnWarning && hasWarnings) ? "fail" : hasWarnings ? "warning" : "pass";
    const report = {
      schema: this.config.schema,
      runId: this.config.runId,
      status,
      url: this.config.url,
      startedAt: this.startedAt,
      finishedAt,
      durationMs: durationMs(this.startedAt, finishedAt),
      mode: this.config.profile === "deep" ? "deep-system-playtest" : "accelerated-critical-path",
      profile: this.config.profile || "critical",
      saveIsolation: "fresh-browser-context+jkd-e2e-save-suppression",
      phases: this.phases,
      issues: this.issues,
      finalSnapshot,
    };
    const reportPath = path.join(this.config.output, "report.json");
    const summaryPath = path.join(this.config.output, "summary.md");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(this.config.output, "browser-events.json"), `${JSON.stringify(browserEvents, null, 2)}\n`);
    fs.writeFileSync(summaryPath, buildSummaryMarkdown(report));
    return { report, reportPath, summaryPath };
  }
}
