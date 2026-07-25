(() => {
  const review = window.GROUND_STRIKE_REVIEW;
  const root = document.getElementById("groundStrikeReview");
  if (!review || !root) return;
  if (!review.reviewOnly || review.productionChanged) {
    throw new Error("Ground-strike review data must remain isolated from production.");
  }

  const byId = (id) => document.getElementById(id);
  const elements = {
    grid: byId("groundStrikeReviewGrid"),
    status: byId("groundStrikeReviewStatus"),
    playPause: byId("groundStrikeReviewPlayPause"),
    restart: byId("groundStrikeReviewRestart"),
    speed: byId("groundStrikeReviewSpeed"),
    scrub: byId("groundStrikeReviewScrub"),
    readout: byId("groundStrikeReviewReadout"),
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const imagesByVariant = new Map();
  let loadedCount = 0;
  let failedCount = 0;
  let frameIndex = 0;
  let playing = !reduceMotion;
  let lastFrameTime = performance.now();

  const rootAssetUrl = (relativePath) => `../../../${encodeURI(relativePath)}`;
  const framePath = (variantId, frameNumber) => review.framePathTemplate
    .replace("{id}", variantId)
    .replace("{frame}", String(frameNumber).padStart(4, "0"));
  const totalFrames = review.frameCount * review.variants.length;

  elements.grid.innerHTML = review.variants.map((variant) => `
    <article class="ground-strike-review-card${variant.rejected ? " rejected" : ""}" data-ground-strike-review="${variant.id}">
      <header>
        <span class="review-number">${variant.number}</span>
        <div><h3>${variant.label}</h3><p>${variant.note}</p></div>
      </header>
      <div class="ground-strike-review-stage">
        <canvas width="448" height="448" aria-label="${variant.label} ground-strike animation"></canvas>
        <span class="review-contact-badge">Contact frame</span>
      </div>
      <p class="review-description">${variant.description}</p>
    </article>
  `).join("");

  const cards = Array.from(elements.grid.querySelectorAll("[data-ground-strike-review]"));
  const canvasByVariant = new Map(cards.map((card) => [
    card.dataset.groundStrikeReview,
    card.querySelector("canvas"),
  ]));

  function setStatus(message, state = "") {
    elements.status.textContent = message;
    elements.status.className = `ground-strike-review-status ${state}`.trim();
  }

  function updateLoadingStatus() {
    const finished = loadedCount + failedCount;
    setStatus(`Loading review frames ${finished}/${totalFrames}${failedCount ? ` · ${failedCount} failed` : ""}`);
  }

  function loadFrame(variantId, frameNumber) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        loadedCount += 1;
        updateLoadingStatus();
        resolve(image);
      };
      image.onerror = () => {
        failedCount += 1;
        updateLoadingStatus();
        resolve(null);
      };
      image.src = rootAssetUrl(framePath(variantId, frameNumber));
    });
  }

  function drawFrame() {
    const frameNumber = frameIndex + 1;
    review.variants.forEach((variant) => {
      const canvas = canvasByVariant.get(variant.id);
      const context = canvas?.getContext("2d");
      const image = imagesByVariant.get(variant.id)?.[frameIndex];
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (image) context.drawImage(image, 0, 0, canvas.width, canvas.height);
    });
    const isContact = frameNumber === review.contactFrame;
    root.classList.toggle("at-contact", isContact);
    elements.scrub.value = String(frameNumber);
    elements.readout.value = `Frame ${frameNumber}/${review.frameCount}${isContact ? " · hand contact" : ""}`;
  }

  function stepFrame(delta = 1) {
    frameIndex = (frameIndex + delta + review.frameCount) % review.frameCount;
    lastFrameTime = performance.now();
    drawFrame();
  }

  function animate(timestamp) {
    if (playing && loadedCount + failedCount === totalFrames) {
      const fps = review.frameRate * Number(elements.speed.value);
      if (timestamp - lastFrameTime >= 1000 / fps) stepFrame(1);
    }
    requestAnimationFrame(animate);
  }

  async function preload() {
    updateLoadingStatus();
    await Promise.all(review.variants.map(async (variant) => {
      const frames = await Promise.all(
        Array.from({ length: review.frameCount }, (_, index) => loadFrame(variant.id, index + 1)),
      );
      imagesByVariant.set(variant.id, frames);
    }));
    elements.playPause.disabled = false;
    elements.restart.disabled = false;
    elements.scrub.disabled = false;
    elements.speed.disabled = false;
    setStatus(
      failedCount
        ? `Review ready with ${failedCount} missing frame${failedCount === 1 ? "" : "s"}`
        : review.decisionLabel,
      failedCount ? "warning" : "rejected",
    );
    elements.playPause.textContent = playing ? "Pause all" : "Play all";
    drawFrame();
  }

  elements.playPause.addEventListener("click", () => {
    playing = !playing;
    elements.playPause.textContent = playing ? "Pause all" : "Play all";
    lastFrameTime = performance.now();
  });
  elements.restart.addEventListener("click", () => {
    frameIndex = 0;
    lastFrameTime = performance.now();
    drawFrame();
  });
  elements.scrub.addEventListener("input", () => {
    frameIndex = Math.max(0, Math.min(review.frameCount - 1, Number(elements.scrub.value) - 1));
    playing = false;
    elements.playPause.textContent = "Play all";
    drawFrame();
  });
  elements.speed.addEventListener("input", () => {
    lastFrameTime = performance.now();
  });

  elements.scrub.max = String(review.frameCount);
  elements.scrub.value = "1";
  elements.playPause.textContent = "Loading…";
  requestAnimationFrame(animate);
  preload();
})();
