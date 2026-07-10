/* global SPRITE_AUDIT_CONFIG */

const SpriteAuditData = (() => {
  const imageCache = new Map();
  const [defaultWidth, defaultHeight] = SPRITE_AUDIT_CONFIG.frameSize;

  function assetUrl(path) {
    return `${SPRITE_AUDIT_CONFIG.assetRoot}${encodeURI(path)}`;
  }

  function getAnimation(id) {
    return SPRITE_AUDIT_CONFIG.animations.find((animation) => animation.id === id) || null;
  }

  function getViewOptions(animation) {
    return animation?.views || [{ id: "source", label: `Source: ${animation?.orientation || "unclassified"}`, flipX: false }];
  }

  function getView(animation, viewId) {
    const options = getViewOptions(animation);
    return options.find((view) => view.id === viewId) || options[0];
  }

  function loadImage(path) {
    if (imageCache.has(path)) return imageCache.get(path);
    const task = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${path}`));
      image.src = assetUrl(path);
    });
    imageCache.set(path, task);
    return task;
  }

  async function getFrameCanvas(animation, frameIndex) {
    const index = Math.max(0, Math.min(animation.frames - 1, frameIndex));
    if (Array.isArray(animation.files)) {
      const image = await loadImage(animation.files[index]);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d", { willReadFrequently: true }).drawImage(image, 0, 0);
      return canvas;
    }

    const image = await loadImage(animation.file);
    const width = animation.frameWidth || defaultWidth;
    const height = animation.frameHeight || defaultHeight;
    const column = index % animation.columns;
    const row = Math.floor(index / animation.columns);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d", { willReadFrequently: true }).drawImage(image, column * width, row * height, width, height, 0, 0, width, height);
    return canvas;
  }

  function drawBackdrop(context, width, height, matte) {
    if (matte === "black") {
      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, height);
      return;
    }
    if (matte === "white") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      return;
    }
    const cell = Math.max(8, Math.round(Math.min(width, height) / 14));
    context.fillStyle = "#353a40";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#1d2126";
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        if (((x / cell) + (y / cell)) % 2 === 0) context.fillRect(x, y, cell, cell);
      }
    }
  }

  function drawError(canvas, message) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#2a1517";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f2a19a";
    context.font = "12px sans-serif";
    context.fillText("Asset failed to load", 8, 22);
    context.fillStyle = "#e8c5c0";
    context.fillText(message.slice(0, 32), 8, 42);
  }

  async function drawFrame(canvas, animation, frameIndex, flipX, matte) {
    try {
      const frame = await getFrameCanvas(animation, frameIndex);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      drawBackdrop(context, width, height, matte);
      const scale = Math.min((width * 0.92) / frame.width, (height * 0.92) / frame.height);
      const drawWidth = frame.width * scale;
      const drawHeight = frame.height * scale;
      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;
      context.save();
      context.imageSmoothingEnabled = true;
      if (flipX) {
        context.translate(width, 0);
        context.scale(-1, 1);
      }
      context.drawImage(frame, drawX, drawY, drawWidth, drawHeight);
      context.restore();
      return measureFrame(frame);
    } catch (error) {
      drawError(canvas, error.message);
      return null;
    }
  }

  function measureFrame(frame) {
    const context = frame.getContext("2d", { willReadFrequently: true });
    const width = frame.width;
    const height = frame.height;
    const { data } = context.getImageData(0, 0, width, height);
    let left = width;
    let right = -1;
    let top = height;
    let bottom = -1;
    let semiNeutralPixels = 0;
    let opaqueNeutralPixels = 0;
    let nonTransparentPixels = 0;

    for (let pixel = 0; pixel < data.length; pixel += 4) {
      const alpha = data[pixel + 3];
      if (alpha > 12) {
        const x = (pixel / 4) % width;
        const y = Math.floor((pixel / 4) / width);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        nonTransparentPixels += 1;
      }
      const red = data[pixel];
      const green = data[pixel + 1];
      const blue = data[pixel + 2];
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
      const lightness = (red + green + blue) / 3;
      if (chroma < 18 && lightness > 28 && lightness < 230) {
        if (alpha > 12 && alpha < 245) semiNeutralPixels += 1;
        if (alpha >= 245) opaqueNeutralPixels += 1;
      }
    }

    const hasBounds = right >= left && bottom >= top;
    const centerX = hasBounds ? (left + right) / 2 : null;
    const centerY = hasBounds ? (top + bottom) / 2 : null;
    return {
      dimensions: `${width}×${height}`,
      bounds: hasBounds ? { left, top, right, bottom } : null,
      centerOffsetX: centerX === null ? null : centerX - width / 2,
      centerOffsetY: centerY === null ? null : centerY - height / 2,
      semiNeutralPixels,
      opaqueNeutralPixels,
      nonTransparentPixels,
    };
  }

  return Object.freeze({
    assetUrl,
    getAnimation,
    getFrameCanvas,
    getView,
    getViewOptions,
    drawFrame,
  });
})();
