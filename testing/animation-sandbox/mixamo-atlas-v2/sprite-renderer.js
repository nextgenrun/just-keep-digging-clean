import { CURRENT } from "./current-assets.js";

const images = new Map();
const visible = new WeakSet();
let started = false;

function imageFor(file) {
  if (!images.has(file)) {
    const image = new Image();
    image.src = file;
    images.set(file, image);
  }
  return images.get(file);
}

function frameAt(clip, elapsed) {
  const active = clip.frames.length / clip.fps;
  const pause = clip.loop ? 0 : 0.55;
  const phase = elapsed % (active + pause);
  const index = phase >= active ? clip.frames.length - 1 : Math.floor(phase * clip.fps);
  return clip.frames[Math.min(clip.frames.length - 1, index)];
}

function draw(canvas, clip, elapsed) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const ground = height - 24;
  ctx.clearRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width / 2, height * 0.43, 10, width / 2, height * 0.45, width * 0.55);
  glow.addColorStop(0, "#17323a");
  glow.addColorStop(1, "#071014");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#81d4ca55";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(12, ground + 0.5);
  ctx.lineTo(width - 12, ground + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);

  const image = imageFor(clip.file);
  if (!image.complete || !image.naturalWidth) return;
  const frame = frameAt(clip, elapsed);
  const sourceSize = 256;
  const sourceX = (frame % clip.columns) * sourceSize;
  const sourceY = Math.floor(frame / clip.columns) * sourceSize;
  const inspect = document.body.dataset.scale === "inspect";
  const display = clip.display * (inspect ? 1.46 : 1);
  const x = width / 2 - display / 2;
  const y = ground - display * clip.originY + clip.offsetY * (inspect ? 1.2 : 1);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, x, y, display, display);
}

export function startSpriteRenderer() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
  }, { rootMargin: "180px" });
  document.querySelectorAll("canvas[data-current]").forEach((canvas) => observer.observe(canvas));
  if (started) return;
  started = true;
  const startedAt = performance.now();
  const tick = (now) => {
    const elapsed = (now - startedAt) / 1000;
    document.querySelectorAll("canvas[data-current]").forEach((canvas) => {
      if (!visible.has(canvas)) return;
      const clip = CURRENT[canvas.dataset.current];
      if (clip) draw(canvas, clip, elapsed);
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
