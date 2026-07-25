import { scenarioById, LAB_VIEW } from "./labConfig.js";

function card(label, value, tone = "") {
  return `<div class="telemetry-card ${tone}"><span>${label}</span><strong>${value}</strong></div>`;
}

export class LabTelemetry {
  constructor(telemetryElement, trackElement) {
    this.telemetryElement = telemetryElement;
    this.trackElement = trackElement;
    this.events = [];
    this.previous = {};
  }

  clear() {
    this.events = [];
    this.previous = {};
    this._renderEvents();
  }

  record(type, message, time = 0) {
    this.events.unshift({ type, message, time });
    this.events = this.events.slice(0, LAB_VIEW.eventLimit);
    this._renderEvents();
  }

  _renderEvents() {
    if (this.events.length === 0) {
      this.trackElement.innerHTML = '<li class="empty">Run a scenario to record transitions, contacts and foot plants.</li>';
      return;
    }
    this.trackElement.innerHTML = this.events.map((event) => `
      <li data-type="${event.type}"><time>${event.time.toFixed(2)}s</time><span>${event.message}</span></li>
    `).join("");
  }

  update(snapshot, state, renderMeta) {
    const segmentKey = `${snapshot.segment.start}:${snapshot.segment.id}`;
    if (segmentKey !== this.previous.segmentKey) {
      this.record("phase", `${snapshot.segment.phase} → ${snapshot.segment.clip.label}`, snapshot.elapsedSeconds);
      if (renderMeta.markerCoverage !== "complete") {
        const ratio = `${renderMeta.markerFrameCount}/${renderMeta.markerExpectedFrames}`;
        this.record("missing", `Rig markers ${renderMeta.markerCoverage}: ${snapshot.segment.clip.actionId} · ${ratio}`, snapshot.elapsedSeconds);
      }
    }
    const frameKey = `${segmentKey}:${snapshot.sequenceIndex}`;
    if (renderMeta.footstep && frameKey !== this.previous.footstepFrameKey) {
      this.record("foot", `Foot plant · sequence ${snapshot.sequenceIndex + 1}`, snapshot.elapsedSeconds);
      this.previous.footstepFrameKey = frameKey;
    }
    if (renderMeta.contact.reached && this.previous.contactSegment !== segmentKey) {
      this.record(
        renderMeta.contact.valid ? "contact" : "miss",
        `${renderMeta.contact.status} · ${renderMeta.contact.markerName || "no marker"}`,
        snapshot.elapsedSeconds,
      );
      this.previous.contactSegment = segmentKey;
    }
    if (snapshot.wrapped) this.record("loop", "Scenario restarted", 0);
    this.previous.segmentKey = segmentKey;

    const clip = snapshot.segment.clip;
    const durationMs = snapshot.segment.duration * 1000;
    const markerTone = !renderMeta.markerFrameAvailable
      ? "danger"
      : renderMeta.markerCoverage === "partial" ? "warn" : "good";
    const markerLabel = `${renderMeta.markerCoverage} · ${renderMeta.markerFrameCount}/${renderMeta.markerExpectedFrames}`
      + (renderMeta.markerCoverage === "partial" ? ` · frame ${renderMeta.markerFrameAvailable ? "available" : "missing"}` : "");
    const duplicateTone = state.scenarioId === "ladder" ? "warn" : "";
    this.telemetryElement.innerHTML = [
      card("Phase", snapshot.segment.phase),
      card("Production action", clip.actionId),
      card("Frame", `${snapshot.sourceFrame} · seq ${snapshot.sequenceIndex + 1}/${clip.frames.length}`),
      card("Cadence", `${snapshot.segment.timeScale.toFixed(2)}×`),
      card("Velocity", `${snapshot.segment.speed.toFixed(0)} px/s`),
      card("Phase duration", `${durationMs.toFixed(0)} ms`),
      card("Rig metadata", markerLabel, markerTone),
      card("Contact", `${renderMeta.contact.status}${Number.isInteger(renderMeta.contact.sequenceIndex) ? ` · cue ${renderMeta.contact.sequenceIndex + 1}` : ""}`, renderMeta.contact.valid ? "good" : renderMeta.contact.reached ? "danger" : ""),
      card("Draft body", `${state.bodyWidthPx} × ${state.bodyHeightPx}px`),
      card("Facing", renderMeta.flipX ? "left / flipX" : "right / source"),
      card("Scenario truth", state.scenarioId === "ladder" ? "Walk and run share Jog_Fwd_Loop" : scenarioById(state.scenarioId).description, duplicateTone),
    ].join("");
  }

  exportEvidence() {
    return this.events.slice().reverse();
  }
}
