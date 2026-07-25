(() => {
  const data = window.ANIMATION_INVENTORY;
  if (!data) throw new Error("Animation inventory data is missing. Run build-inventory.mjs first.");

  const byId = (id) => document.getElementById(id);
  const elements = {
    generated: byId("generated"), currentCount: byId("currentCount"), runtimeCount: byId("runtimeCount"),
    assetCount: byId("assetCount"), setCount: byId("setCount"), search: byId("search"),
    runtimeScope: byId("runtimeScope"), assetScope: byId("assetScope"), runtimeRows: byId("runtimeRows"),
    assetRows: byId("assetRows"), runtimeResultCount: byId("runtimeResultCount"), assetResultCount: byId("assetResultCount"),
    assetDetail: byId("assetDetail"), sourceCount: byId("sourceCount"), sourceSites: byId("sourceSites"),
    canvas: byId("animationCanvas"), viewerStatus: byId("viewerStatus"), viewerTitle: byId("viewerTitle"),
    viewerProfile: byId("viewerProfile"), viewerPath: byId("viewerPath"), previousFrame: byId("previousFrame"),
    playPause: byId("playPause"), nextFrame: byId("nextFrame"), playbackSpeed: byId("playbackSpeed"),
    frameReadout: byId("frameReadout"),
  };

  const ctx = elements.canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let selectedDirectory = "";
  let selectedRuntimeKey = "";
  let activeEntry = null;
  let activeImage = null;
  let activeSequence = [];
  let activeFrameIndex = 0;
  let playing = !reduceMotion;
  let lastFrameTime = 0;
  let assetPreviewTimer = 0;

  const FLIGHT_TRAIL_PREVIEW_KEY = "survival-ual-player-v1-flight-travel-loop-anim";
  const statusLabels = { "current-default": "Current default", "global-runtime": "Global runtime", "alternate-profile": "Alternate" };
  const scopeLabels = {
    "production-runtime-assets": "Production runtime", "production-source-assets": "Production source",
    "testing-review": "Testing / review", archived: "Archived", "documentation-reference": "Documentation",
    "supporting-assets": "Supporting",
  };
  const rasterExtensions = new Set(["png", "webp", "gif", "jpg", "jpeg"]);
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const formatNumber = (value) => Number(value || 0).toLocaleString();
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  };
  const matches = (haystack, query) => !query || haystack.toLowerCase().includes(query);
  const assetUrl = (relativePath) => `../../../${encodeURI(relativePath)}`;

  function filteredRuntime() {
    const query = elements.search.value.trim().toLowerCase();
    const scope = elements.runtimeScope.value;
    return data.runtimeAnimations.filter((entry) => {
      if (scope !== "all" && entry.status !== scope) return false;
      return matches([entry.key, entry.profile, entry.sheet, entry.assetPath, entry.sourceClip, entry.sourceFile].join(" "), query);
    });
  }

  function filteredAssets() {
    const query = elements.search.value.trim().toLowerCase();
    const scope = elements.assetScope.value;
    return data.projectAssetSets.filter((set) => {
      if (scope !== "all" && set.scope !== scope) return false;
      return matches(`${set.directory} ${set.scope} ${set.files.map((file) => file.name).join(" ")}`, query);
    });
  }

  function renderRuntime() {
    const rows = filteredRuntime();
    elements.runtimeResultCount.value = `${formatNumber(rows.length)} of ${formatNumber(data.runtimeAnimations.length)} keys`;
    elements.runtimeRows.innerHTML = rows.length ? rows.map((entry) => `
      <tr data-runtime-key="${escapeHtml(entry.key)}" class="${entry.key === selectedRuntimeKey ? "selected" : ""}">
        <td><span class="badge ${escapeHtml(entry.status)}">${escapeHtml(statusLabels[entry.status] || entry.status)}</span></td>
        <td>${escapeHtml(entry.profile)}</td>
        <td><code>${escapeHtml(entry.key)}</code>${entry.sourceClip ? `<br><span class="muted">${escapeHtml(entry.sourceClip)}</span>` : ""}</td>
        <td>${formatNumber(entry.frames)}</td><td>${formatNumber(entry.frameRate)}</td>
        <td>${entry.repeat === -1 ? "Loop" : "One shot"}</td>
        <td><code>${escapeHtml(entry.assetPath || entry.sheet || entry.sourceFile)}</code></td>
      </tr>`).join("") : '<tr><td class="empty" colspan="7">No runtime animations match these filters.</td></tr>';
  }

  function drawFlightFootTrails(drawX, drawY, dw, dh) {
    const pulse = activeFrameIndex * 0.7;
    const origins = [
      { x: drawX + dw * 0.075, y: drawY + dh * 0.47 },
      { x: drawX + dw * 0.09, y: drawY + dh * 0.66 },
    ];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    origins.forEach((origin, footIndex) => {
      for (let particleIndex = 0; particleIndex < 7; particleIndex += 1) {
        const progress = particleIndex / 6;
        const jitter = Math.sin(pulse + particleIndex * 1.4 + footIndex * 2.2);
        const x = origin.x - 8 - progress * 70;
        const y = origin.y + jitter * (3 + progress * 5);
        const radius = 7 - progress * 4.5;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.4);
        glow.addColorStop(0, `rgba(230, 248, 255, ${0.9 - progress * 0.45})`);
        glow.addColorStop(0.35, `rgba(98, 182, 255, ${0.78 - progress * 0.45})`);
        glow.addColorStop(1, "rgba(42, 111, 255, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  function drawActiveFrame() {
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    if (!activeEntry || !activeImage?.complete || !activeImage.naturalWidth || !activeSequence.length) return;
    const fw = Number(activeEntry.frameWidth) || activeImage.naturalWidth;
    const fh = Number(activeEntry.frameHeight) || activeImage.naturalHeight;
    const columns = Math.max(1, Math.floor(activeImage.naturalWidth / fw));
    const sheetFrame = Number(activeSequence[activeFrameIndex]) || 0;
    const sx = (sheetFrame % columns) * fw;
    const sy = Math.floor(sheetFrame / columns) * fh;
    const scale = Math.min((elements.canvas.width - 40) / fw, (elements.canvas.height - 40) / fh);
    const dw = fw * scale;
    const dh = fh * scale;
    const isFlightPreview = activeEntry.key === FLIGHT_TRAIL_PREVIEW_KEY;
    const drawX = (elements.canvas.width - dw) / 2 + (isFlightPreview ? 48 : 0);
    const drawY = (elements.canvas.height - dh) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (isFlightPreview) drawFlightFootTrails(drawX, drawY, dw, dh);
    ctx.drawImage(activeImage, sx, sy, fw, fh, drawX, drawY, dw, dh);
    elements.frameReadout.value = `Frame ${activeFrameIndex + 1}/${activeSequence.length} · sheet cell ${sheetFrame} · ${fw}×${fh}px · ${activeEntry.frameRate || 0} fps${isFlightPreview ? " · live twin-foot trail preview" : ""}`;
  }

  function setViewerStatus(message, type = "") {
    elements.viewerStatus.textContent = message;
    elements.viewerStatus.className = `viewer-status ${type}`.trim();
  }

  function selectRuntime(entry) {
    if (!entry) return;
    selectedRuntimeKey = entry.key;
    activeEntry = entry;
    activeFrameIndex = 0;
    lastFrameTime = performance.now();
    activeSequence = Array.isArray(entry.frameSequence) && entry.frameSequence.length
      ? entry.frameSequence
      : Array.from({ length: Math.max(1, entry.frames || 1) }, (_, index) => index);
    elements.viewerTitle.textContent = entry.key;
    elements.viewerProfile.textContent = `${statusLabels[entry.status] || entry.status} · ${entry.profile} · ${entry.repeat === -1 ? "runtime loop" : "runtime one-shot"}${entry.key === FLIGHT_TRAIL_PREVIEW_KEY ? " · twin-foot particles" : ""}`;
    elements.viewerPath.textContent = entry.assetPath || `No spritesheet path recorded for ${entry.sheet}`;
    elements.frameReadout.value = "Loading first frame…";
    elements.playPause.textContent = playing ? "Pause" : "Play";
    renderRuntime();
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    if (!entry.assetPath) {
      activeImage = null;
      setViewerStatus("Sheet path unavailable", "error");
      elements.frameReadout.value = "This runtime entry has no visual sheet path.";
      return;
    }
    setViewerStatus("Loading sheet…");
    const image = new Image();
    activeImage = image;
    image.onload = () => {
      if (activeImage !== image) return;
      setViewerStatus(playing ? "Playing" : "Paused", "ready");
      drawActiveFrame();
    };
    image.onerror = () => {
      if (activeImage !== image) return;
      setViewerStatus("Could not load sheet", "error");
      elements.frameReadout.value = `Missing or unsupported asset: ${entry.assetPath}`;
    };
    image.src = assetUrl(entry.assetPath);
  }

  function stepFrame(delta) {
    if (!activeSequence.length) return;
    activeFrameIndex = (activeFrameIndex + delta + activeSequence.length) % activeSequence.length;
    lastFrameTime = performance.now();
    drawActiveFrame();
  }

  function animate(timestamp) {
    if (playing && activeImage?.complete && activeSequence.length > 1) {
      const fps = Math.max(1, Number(activeEntry?.frameRate) || 8) * Number(elements.playbackSpeed.value);
      if (timestamp - lastFrameTime >= 1000 / fps) stepFrame(1);
    }
    requestAnimationFrame(animate);
  }

  function renderAssets() {
    const sets = filteredAssets();
    elements.assetResultCount.value = `${formatNumber(sets.length)} of ${formatNumber(data.projectAssetSets.length)} directories`;
    elements.assetRows.innerHTML = sets.length ? sets.map((set) => `
      <tr data-directory="${escapeHtml(set.directory)}" class="${set.directory === selectedDirectory ? "selected" : ""}">
        <td><span class="badge">${escapeHtml(scopeLabels[set.scope] || set.scope)}</span></td>
        <td><code>${escapeHtml(set.directory)}</code></td><td>${formatNumber(set.fileCount)}</td>
        <td>${formatNumber(set.sheetCount)}</td><td>${formatNumber(set.source3dCount)}</td><td>${formatBytes(set.totalBytes)}</td>
      </tr>`).join("") : '<tr><td class="empty" colspan="6">No project asset directories match these filters.</td></tr>';
    if (selectedDirectory && !sets.some((set) => set.directory === selectedDirectory)) {
      selectedDirectory = "";
      renderDetail(null);
    }
  }

  function renderDetail(set) {
    window.clearInterval(assetPreviewTimer);
    if (!set) {
      elements.assetDetail.innerHTML = '<p class="muted">Select an asset directory to visually inspect every image in it.</p>';
      return;
    }
    const images = set.files.filter((file) => rasterExtensions.has(file.extension));
    elements.assetDetail.innerHTML = `
      <p class="eyebrow">${escapeHtml(scopeLabels[set.scope] || set.scope)}</p><h3>${escapeHtml(set.directory)}</h3>
      ${images.length ? `<figure class="asset-preview"><img id="assetPreviewImage" alt="Visual asset from ${escapeHtml(set.directory)}"><figcaption id="assetPreviewName"></figcaption></figure>
        <div class="asset-preview-controls"><button id="assetPrevious" type="button">◀</button><button id="assetToggle" type="button">Pause</button><button id="assetNext" type="button">▶</button><output id="assetPreviewCount"></output></div>` : '<p class="muted">No browser-viewable raster image in this directory.</p>'}
      <dl><dt>Files</dt><dd>${formatNumber(set.fileCount)}</dd><dt>Total size</dt><dd>${formatBytes(set.totalBytes)}</dd>
        <dt>Sheets</dt><dd>${formatNumber(set.sheetCount)}</dd><dt>3D sources</dt><dd>${formatNumber(set.source3dCount)}</dd>
        <dt>Manifests</dt><dd>${formatNumber(set.manifestCount)}</dd></dl>
      <ol class="file-list">${set.files.map((file) => `<li><code>${escapeHtml(file.name)}</code> <span class="muted">${formatBytes(file.bytes)}</span></li>`).join("")}</ol>`;
    if (!images.length) return;
    let index = Math.max(0, images.findIndex((file) => `${set.directory}/${file.name}` === set.representative));
    let cycling = images.length > 1 && !reduceMotion;
    const show = (delta = 0) => {
      index = (index + delta + images.length) % images.length;
      const file = images[index];
      byId("assetPreviewImage").src = assetUrl(`${set.directory}/${file.name}`);
      byId("assetPreviewName").textContent = file.name;
      byId("assetPreviewCount").value = `${index + 1}/${images.length}`;
    };
    const restartTimer = () => {
      window.clearInterval(assetPreviewTimer);
      if (cycling) assetPreviewTimer = window.setInterval(() => show(1), 1100);
      byId("assetToggle").textContent = cycling ? "Pause" : "Play";
    };
    byId("assetPrevious").addEventListener("click", () => show(-1));
    byId("assetNext").addEventListener("click", () => show(1));
    byId("assetToggle").addEventListener("click", () => { cycling = !cycling; restartTimer(); });
    show();
    restartTimer();
  }

  function renderSources() {
    elements.sourceCount.textContent = `(${data.sourceSites.length})`;
    elements.sourceSites.innerHTML = data.sourceSites.map((site) => `<li><code>${escapeHtml(site.file)}:${site.line}</code> <span class="muted">${escapeHtml(site.excerpt)}</span></li>`).join("");
  }

  function renderAll() { renderRuntime(); renderAssets(); }

  elements.generated.textContent = `Generated ${new Date(data.generatedAt).toLocaleString()} · default profile: ${data.defaultProfileLabel}`;
  elements.currentCount.textContent = formatNumber(data.summary.currentDefaultAnimations);
  elements.runtimeCount.textContent = formatNumber(data.runtimeAnimations.length);
  elements.assetCount.textContent = formatNumber(data.summary.projectAnimationFiles);
  elements.setCount.textContent = formatNumber(data.summary.projectAssetSets);
  elements.search.addEventListener("input", renderAll);
  elements.runtimeScope.addEventListener("change", renderRuntime);
  elements.assetScope.addEventListener("change", renderAssets);
  elements.runtimeRows.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-runtime-key]");
    if (row) selectRuntime(data.runtimeAnimations.find((entry) => entry.key === row.dataset.runtimeKey));
  });
  elements.assetRows.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-directory]");
    if (!row) return;
    selectedDirectory = row.dataset.directory;
    renderAssets();
    renderDetail(data.projectAssetSets.find((candidate) => candidate.directory === selectedDirectory));
  });
  elements.previousFrame.addEventListener("click", () => stepFrame(-1));
  elements.nextFrame.addEventListener("click", () => stepFrame(1));
  elements.playPause.addEventListener("click", () => {
    playing = !playing;
    elements.playPause.textContent = playing ? "Pause" : "Play";
    setViewerStatus(playing ? "Playing" : "Paused", "ready");
    lastFrameTime = performance.now();
  });

  renderSources();
  renderAll();
  selectRuntime(data.runtimeAnimations.find((entry) => entry.status === "current-default" && entry.assetPath) || data.runtimeAnimations[0]);
  requestAnimationFrame(animate);
})();
