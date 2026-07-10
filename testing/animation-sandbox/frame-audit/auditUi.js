/* global SPRITE_AUDIT_CONFIG, SpriteAuditData, SpriteAuditFeedback */

(() => {
  const elements = {
    animation: document.getElementById("animation-select"),
    animationMeta: document.getElementById("animation-meta"),
    animationTitle: document.getElementById("animation-title"),
    copy: document.getElementById("copy-feedback"),
    currentLabel: document.getElementById("current-preview-label"),
    detail: document.getElementById("detail-canvas"),
    download: document.getElementById("download-feedback"),
    facing: document.getElementById("facing-select"),
    feedbackCount: document.getElementById("feedback-count"),
    feedbackList: document.getElementById("feedback-list"),
    frameGrid: document.getElementById("frame-grid"),
    issue: document.getElementById("issue-select"),
    matte: document.getElementById("matte-select"),
    metrics: document.getElementById("metrics"),
    mirror: document.getElementById("mirror-canvas"),
    mirrorLabel: document.getElementById("opposite-preview-label"),
    next: document.getElementById("next-frame"),
    note: document.getElementById("issue-note"),
    piskelSource: document.getElementById("piskel-source"),
    play: document.getElementById("play-toggle"),
    previous: document.getElementById("previous-frame"),
    remove: document.getElementById("remove-issue"),
    save: document.getElementById("save-issue"),
    selectedSource: document.getElementById("selected-source"),
    selectedTitle: document.getElementById("selected-title"),
    status: document.getElementById("load-status"),
    targetList: document.getElementById("target-list"),
    transition: document.getElementById("transition-select"),
    transitionCodeRef: document.getElementById("transition-code-ref"),
    transitionStrip: document.getElementById("transition-strip"),
    view: document.getElementById("view-select"),
  };

  const state = {
    animationId: SPRITE_AUDIT_CONFIG.animations[0].id,
    frame: 0,
    isPlaying: false,
    matte: "checker",
    timer: null,
    transitionId: null,
    viewId: "source",
  };
  let gridVersion = 0;
  let inspectorVersion = 0;

  function activeAnimation() {
    return SpriteAuditData.getAnimation(state.animationId);
  }

  function activeView() {
    return SpriteAuditData.getView(activeAnimation(), state.viewId);
  }

  function setStatus(message) {
    elements.status.textContent = message;
  }

  function option(value, label) {
    const item = document.createElement("option");
    item.value = value;
    item.textContent = label;
    return item;
  }

  function selectedIssue() {
    return SpriteAuditFeedback.find({
      animationId: state.animationId,
      frame: state.frame,
      transitionId: state.transitionId,
      viewId: state.viewId,
    }, elements.issue.value);
  }

  function refreshIssueForm() {
    const issue = selectedIssue();
    elements.note.value = issue?.note || "";
    elements.facing.value = issue?.expectedFacing || "not-applicable";
  }

  function refreshViewOptions() {
    const animation = activeAnimation();
    const options = SpriteAuditData.getViewOptions(animation);
    if (!options.some((view) => view.id === state.viewId)) state.viewId = options[0].id;
    elements.view.replaceChildren(...options.map((view) => option(view.id, view.label)));
    elements.view.value = state.viewId;
  }

  function updateGridSelection() {
    document.querySelectorAll(".frame-button").forEach((button) => {
      button.classList.toggle("selected", Number(button.dataset.frame) === state.frame);
    });
  }

  async function renderGrid() {
    const renderVersion = ++gridVersion;
    const animation = activeAnimation();
    const view = activeView();
    elements.frameGrid.replaceChildren();
    elements.animationTitle.textContent = animation.label;
    elements.animationMeta.textContent = `${animation.frames} frames · ${animation.fps} fps · source faces ${animation.orientation}`;
    const jobs = [];

    for (let frame = 0; frame < animation.frames; frame += 1) {
      const button = document.createElement("button");
      const canvas = document.createElement("canvas");
      const caption = document.createElement("span");
      button.type = "button";
      button.className = "frame-button";
      button.dataset.frame = String(frame);
      button.setAttribute("aria-label", `${animation.label}, frame ${frame + 1}`);
      canvas.width = 96;
      canvas.height = 96;
      caption.textContent = `Frame ${String(frame + 1).padStart(2, "0")}`;
      button.append(canvas, caption);
      if (frame === state.frame) button.classList.add("selected");
      if (SpriteAuditFeedback.hasFrameIssue(animation.id, frame)) button.classList.add("flagged");
      if (SPRITE_AUDIT_CONFIG.reportedTargets.some((target) => target.animationId === animation.id)) button.classList.add("flagged");
      button.addEventListener("click", () => selectFrame(frame));
      elements.frameGrid.append(button);
      jobs.push(SpriteAuditData.drawFrame(canvas, animation, frame, view.flipX, state.matte));
    }

    await Promise.all(jobs);
    if (renderVersion === gridVersion) setStatus(`${animation.frames} live frames rendered. Saved notes remain in this browser until exported.`);
  }

  function metricsMarkup(metrics) {
    if (!metrics) return "<span class=\"muted\">Metrics are unavailable because the source asset did not load.</span>";
    const bounds = metrics.bounds
      ? `${metrics.bounds.left},${metrics.bounds.top} → ${metrics.bounds.right},${metrics.bounds.bottom}`
      : "empty";
    const center = metrics.centerOffsetX === null
      ? "n/a"
      : `${metrics.centerOffsetX.toFixed(1)}, ${metrics.centerOffsetY.toFixed(1)} px`;
    return [
      `<span>Source <strong>${metrics.dimensions}</strong></span>`,
      `<span>Alpha bounds <strong>${bounds}</strong></span>`,
      `<span>Bounds centre offset <strong>${center}</strong></span>`,
      `<span>Visible pixels <strong>${metrics.nonTransparentPixels.toLocaleString()}</strong></span>`,
      `<span>Neutral semi-alpha <strong>${metrics.semiNeutralPixels.toLocaleString()}</strong></span>`,
      `<span>Neutral opaque <strong>${metrics.opaqueNeutralPixels.toLocaleString()}</strong></span>`,
    ].join("");
  }

  async function renderInspector() {
    const renderVersion = ++inspectorVersion;
    const animation = activeAnimation();
    const view = activeView();
    elements.selectedTitle.textContent = `${animation.label} · frame ${state.frame + 1}`;
    elements.selectedSource.textContent = animation.file || animation.files[state.frame];
    elements.currentLabel.textContent = view.label;
    elements.mirrorLabel.textContent = view.flipX ? "Unflipped counterpart" : "Flipped counterpart";
    elements.piskelSource.textContent = animation.piskelSource
      ? `${animation.sourceStatus}: ${animation.piskelSource}`
      : "No Piskel review source is mapped for this live asset.";
    const metrics = await SpriteAuditData.drawFrame(elements.detail, animation, state.frame, view.flipX, state.matte);
    await SpriteAuditData.drawFrame(elements.mirror, animation, state.frame, !view.flipX, state.matte);
    if (renderVersion !== inspectorVersion) return;
    elements.metrics.innerHTML = metricsMarkup(metrics);
    refreshIssueForm();
  }

  function selectFrame(frame, transitionId = null, viewId = null) {
    const animation = activeAnimation();
    state.frame = Math.max(0, Math.min(animation.frames - 1, frame));
    state.transitionId = transitionId;
    if (viewId) state.viewId = viewId;
    refreshViewOptions();
    updateGridSelection();
    renderInspector();
  }

  function renderFeedbackList() {
    const issues = SpriteAuditFeedback.list();
    elements.feedbackCount.textContent = `${issues.length} saved note${issues.length === 1 ? "" : "s"}`;
    elements.feedbackList.replaceChildren();
    if (issues.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No frame notes saved yet.";
      elements.feedbackList.append(empty);
      return;
    }
    issues.forEach((issue) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "feedback-item";
      item.innerHTML = `<strong>${issue.animationLabel} · frame ${issue.frame + 1} · ${issue.issueType}</strong>${issue.note || "No written observation."}`;
      item.addEventListener("click", () => {
        state.animationId = issue.animationId;
        state.frame = issue.frame;
        state.viewId = issue.viewId;
        state.transitionId = issue.transitionId || null;
        elements.animation.value = state.animationId;
        refreshViewOptions();
        renderGrid();
        renderInspector();
      });
      elements.feedbackList.append(item);
    });
  }

  function renderTargets() {
    elements.targetList.replaceChildren();
    SPRITE_AUDIT_CONFIG.reportedTargets.forEach((target) => {
      const item = document.createElement("div");
      item.className = "target";
      item.innerHTML = `<strong>${target.label}</strong>${target.expected}<br><code>${target.codeRef}</code>`;
      item.addEventListener("click", () => {
        state.animationId = target.animationId;
        state.frame = 0;
        state.transitionId = null;
        elements.animation.value = state.animationId;
        refreshViewOptions();
        renderGrid();
        renderInspector();
      });
      elements.targetList.append(item);
    });
  }

  async function renderTransition() {
    const transition = SPRITE_AUDIT_CONFIG.transitions.find((entry) => entry.id === elements.transition.value);
    elements.transitionCodeRef.textContent = transition?.codeRef || "";
    elements.transitionStrip.replaceChildren();
    if (!transition) return;
    const jobs = [];
    transition.steps.forEach((step) => {
      const animation = SpriteAuditData.getAnimation(step.animationId);
      const view = SpriteAuditData.getView(animation, step.viewId);
      step.frames.forEach((frame) => {
        const button = document.createElement("button");
        const canvas = document.createElement("canvas");
        const caption = document.createElement("span");
        button.type = "button";
        button.className = "transition-frame";
        canvas.width = 72;
        canvas.height = 72;
        caption.textContent = `${animation.label} ${frame + 1}`;
        button.append(canvas, caption);
        button.addEventListener("click", () => {
          state.animationId = animation.id;
          elements.animation.value = animation.id;
          state.viewId = step.viewId;
          refreshViewOptions();
          renderGrid();
          selectFrame(frame, transition.id, step.viewId);
        });
        elements.transitionStrip.append(button);
        jobs.push(SpriteAuditData.drawFrame(canvas, animation, frame, view.flipX, state.matte));
      });
    });
    await Promise.all(jobs);
  }

  function stopPlayback() {
    state.isPlaying = false;
    if (state.timer) window.clearTimeout(state.timer);
    state.timer = null;
    elements.play.textContent = "Play";
  }

  function playbackTick() {
    if (!state.isPlaying) return;
    const animation = activeAnimation();
    selectFrame((state.frame + 1) % animation.frames);
    state.timer = window.setTimeout(playbackTick, 1000 / animation.fps);
  }

  function togglePlayback() {
    if (state.isPlaying) return stopPlayback();
    state.isPlaying = true;
    elements.play.textContent = "Pause";
    playbackTick();
  }

  function saveIssue() {
    const animation = activeAnimation();
    const view = activeView();
    const note = elements.note.value.trim();
    if (!note) return setStatus("Add an observation before saving a frame note.");
    const target = SPRITE_AUDIT_CONFIG.reportedTargets.find((entry) => entry.animationId === animation.id);
    const transition = SPRITE_AUDIT_CONFIG.transitions.find((entry) => entry.id === state.transitionId);
    SpriteAuditFeedback.upsert({
      animationId: animation.id,
      animationLabel: animation.label,
      expectedFacing: elements.facing.value,
      frame: state.frame,
      issueType: elements.issue.value,
      note,
      piskelSource: animation.piskelSource || null,
      runtimeCodeRef: transition?.codeRef || target?.codeRef || null,
      runtimeFile: animation.file || animation.files[state.frame],
      sourceOrientation: animation.orientation,
      transitionId: state.transitionId,
      viewId: view.id,
      viewLabel: view.label,
    });
    renderFeedbackList();
    renderGrid();
    setStatus("Frame note saved locally. Export it when the review pass is complete.");
  }

  async function copyFeedback() {
    const content = JSON.stringify(SpriteAuditFeedback.exportPacket(), null, 2);
    try {
      await navigator.clipboard.writeText(content);
      setStatus("Feedback JSON copied to the clipboard.");
    } catch {
      setStatus("Clipboard access was blocked. Use Download feedback JSON instead.");
    }
  }

  function downloadFeedback() {
    const blob = new Blob([JSON.stringify(SpriteAuditFeedback.exportPacket(), null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "sprite-frame-audit-feedback.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    setStatus("Feedback JSON download started.");
  }

  function bindEvents() {
    elements.animation.addEventListener("change", () => {
      stopPlayback();
      state.animationId = elements.animation.value;
      state.frame = 0;
      state.transitionId = null;
      state.viewId = "source";
      refreshViewOptions();
      renderGrid();
      renderInspector();
    });
    elements.view.addEventListener("change", () => { state.viewId = elements.view.value; renderGrid(); renderInspector(); });
    elements.matte.addEventListener("change", () => { state.matte = elements.matte.value; renderGrid(); renderInspector(); renderTransition(); });
    elements.issue.addEventListener("change", refreshIssueForm);
    elements.transition.addEventListener("change", () => { state.transitionId = elements.transition.value; renderTransition(); refreshIssueForm(); });
    elements.previous.addEventListener("click", () => selectFrame((state.frame - 1 + activeAnimation().frames) % activeAnimation().frames));
    elements.next.addEventListener("click", () => selectFrame((state.frame + 1) % activeAnimation().frames));
    elements.play.addEventListener("click", togglePlayback);
    elements.save.addEventListener("click", saveIssue);
    elements.remove.addEventListener("click", () => { SpriteAuditFeedback.remove({ animationId: state.animationId, frame: state.frame, transitionId: state.transitionId, viewId: state.viewId }, elements.issue.value); refreshIssueForm(); renderFeedbackList(); renderGrid(); });
    elements.copy.addEventListener("click", copyFeedback);
    elements.download.addEventListener("click", downloadFeedback);
  }

  async function initialise() {
    elements.animation.replaceChildren(...SPRITE_AUDIT_CONFIG.animations.map((animation) => option(animation.id, animation.label)));
    elements.animation.value = state.animationId;
    elements.issue.replaceChildren(...SPRITE_AUDIT_CONFIG.issueTypes.map((issue) => option(issue, issue)));
    elements.transition.replaceChildren(...SPRITE_AUDIT_CONFIG.transitions.map((transition) => option(transition.id, transition.label)));
    state.transitionId = SPRITE_AUDIT_CONFIG.transitions[0].id;
    elements.transition.value = state.transitionId;
    refreshViewOptions();
    bindEvents();
    renderFeedbackList();
    renderTargets();
    await Promise.all([renderGrid(), renderInspector(), renderTransition()]);
  }

  initialise();
})();
