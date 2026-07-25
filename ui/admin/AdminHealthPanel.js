import { RUNTIME_CANARY_CONFIG } from "../../values/runtimeCanaryConfig.js";

function assignStyle(element, style) {
  if (element?.style) Object.assign(element.style, style);
  return element;
}

function makeElement(documentRef, tag, style = null) {
  const element = documentRef.createElement(tag);
  if (style) assignStyle(element, style);
  return element;
}

function matchesHotkey(event, hotkey) {
  return event.code === hotkey.code
    && event.ctrlKey === hotkey.ctrlKey
    && event.shiftKey === hotkey.shiftKey
    && event.altKey === hotkey.altKey;
}

export class AdminHealthPanel {
  constructor(monitor, {
    globalRef = globalThis,
    documentRef = globalThis.document,
    config = RUNTIME_CANARY_CONFIG,
  } = {}) {
    this.monitor = monitor;
    this.globalRef = globalRef;
    this.documentRef = documentRef;
    this.config = config;
    this.root = null;
    this.nodes = {};
    this.expanded = false;
    this.unsubscribe = null;
    this.onKeyDown = event => this._handleKeyDown(event);
  }

  install() {
    this.globalRef.addEventListener?.("keydown", this.onKeyDown);
    if (this._isAuthorized()) this.show();
    this.globalRef[this.config.globals.panel] = this;
    return this;
  }

  show() {
    if (!this.root) this._create();
    this.root.style.display = "block";
    return this;
  }

  hide() {
    if (this.root) this.root.style.display = "none";
    return this;
  }

  toggle() {
    if (!this.root || this.root.style.display === "none") return this.show();
    return this.hide();
  }

  destroy() {
    this.globalRef.removeEventListener?.("keydown", this.onKeyDown);
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.root?.remove?.();
    this.root = null;
    if (this.globalRef[this.config.globals.panel] === this) {
      delete this.globalRef[this.config.globals.panel];
    }
  }

  _isAuthorized() {
    if (this.globalRef[this.config.globals.adminEnabled] === true) return true;
    try {
      const params = new URLSearchParams(this.globalRef.location?.search || "");
      return params.get(this.config.query.adminPanel) === this.config.query.enabledValue;
    } catch (_) {
      return false;
    }
  }

  _handleKeyDown(event) {
    if (!matchesHotkey(event, this.config.hotkey)) return;
    const production = this.globalRef[this.config.globals.production] === true;
    if (this.config.hotkey.debugOnly && production && !this._isAuthorized()) return;
    event.preventDefault?.();
    this.toggle();
  }

  _create() {
    const styles = this.config.ui.styles;
    const labels = this.config.ui.labels;
    this.root = makeElement(this.documentRef, "aside", styles.root);
    this.root.dataset.jkdAdminHealth = "true";
    this.root.setAttribute("role", "status");
    this.root.setAttribute("aria-live", "polite");

    const toggle = makeElement(this.documentRef, "button", styles.toggle);
    toggle.type = "button";
    toggle.addEventListener("click", () => {
      this.expanded = !this.expanded;
      this.nodes.details.style.display = this.expanded ? "block" : "none";
      toggle.setAttribute("aria-expanded", String(this.expanded));
    });
    toggle.setAttribute("aria-expanded", "false");

    const details = makeElement(this.documentRef, "section", styles.details);
    const summary = makeElement(this.documentRef, "div", styles.row);
    const build = makeElement(this.documentRef, "div", styles.row);
    const scenes = makeElement(this.documentRef, "div", styles.row);
    const findings = makeElement(this.documentRef, "div", styles.row);
    const previous = makeElement(this.documentRef, "div", styles.row);
    const eventsTitle = makeElement(this.documentRef, "div", styles.row);
    eventsTitle.textContent = labels.recentEvents;
    const events = makeElement(this.documentRef, "div", styles.events);
    const actions = makeElement(this.documentRef, "div", styles.actions);
    const copy = makeElement(this.documentRef, "button", styles.action);
    const close = makeElement(this.documentRef, "button", styles.action);
    copy.type = "button";
    close.type = "button";
    copy.textContent = labels.copy;
    close.textContent = labels.close;
    copy.addEventListener("click", () => this._copyReport(copy));
    close.addEventListener("click", () => this.hide());
    actions.append(copy, close);
    details.append(summary, build, scenes, findings, previous, eventsTitle, events, actions);
    this.root.append(toggle, details);
    this.documentRef.body?.appendChild?.(this.root);
    this.nodes = { toggle, details, summary, build, scenes, findings, previous, events };
    this.unsubscribe = this.monitor.subscribe(snapshot => this._render(snapshot));
  }

  _render(snapshot) {
    const labels = this.config.ui.labels;
    const color = this.config.ui.statusColors[snapshot.status];
    const statusLabel = labels[snapshot.status] || snapshot.status.toUpperCase();
    this.nodes.toggle.textContent = `${labels.title} · ${statusLabel}`;
    this.nodes.toggle.style.color = color;
    this.root.style.borderColor = color;
    this.nodes.summary.textContent = `${labels.currentFindings}: ${snapshot.findings.length}`;
    this.nodes.build.textContent = `${labels.build}: ${snapshot.buildId} (${snapshot.mode})`;
    const sceneText = snapshot.telemetry.activeScenes.join(", ") || "none";
    this.nodes.scenes.textContent = `${labels.scenes}: ${sceneText} · ${labels.fps}: ${snapshot.telemetry.fps ?? "n/a"}`;
    this.nodes.findings.textContent = snapshot.findings.map(item => item.message).join(" | ");
    this.nodes.findings.style.color = color;
    this.nodes.previous.textContent = snapshot.previousCritical ? labels.previousCritical : "";
    this.nodes.events.replaceChildren();
    const visible = snapshot.events.slice(-this.config.limits.visibleEvents).reverse();
    if (visible.length === 0) {
      const empty = makeElement(this.documentRef, "div", this.config.ui.styles.event);
      empty.textContent = this.config.messages.noRecentEvents;
      this.nodes.events.appendChild(empty);
      return;
    }
    visible.forEach(event => {
      const row = makeElement(this.documentRef, "div", this.config.ui.styles.event);
      row.textContent = `${event.at} · ${event.severity.toUpperCase()} · ${event.message}`;
      row.style.color = this.config.ui.statusColors[
        event.severity === this.config.severity.error
          ? this.config.status.critical
          : event.severity === this.config.severity.warning
            ? this.config.status.degraded
            : this.config.status.healthy
      ];
      this.nodes.events.appendChild(row);
    });
  }

  async _copyReport(button) {
    try {
      const writeText = this.globalRef.navigator?.clipboard?.writeText;
      if (typeof writeText !== "function") throw new Error(this.config.messages.copyFailure);
      await writeText.call(
        this.globalRef.navigator.clipboard,
        JSON.stringify(this.monitor.snapshot(), null, 2),
      );
      button.textContent = this.config.messages.copySuccess;
    } catch (_) {
      button.textContent = this.config.messages.copyFailure;
    }
  }
}

export function installAdminHealthPanel(monitor, options = {}) {
  if (!monitor || (!options.documentRef && !globalThis.document)) return null;
  return new AdminHealthPanel(monitor, options).install();
}
