import { drawSignature, rgba } from "./BiomeMotionEffects.js";

const TAU = Math.PI * 2;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrap = value => ((value % 1) + 1) % 1;

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${source}`));
    image.src = source;
  });
}

export class BiomeMotionRenderer {
  constructor(canvas, onStateChange = () => {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.onStateChange = onStateChange;
    this.motionEnabled = true;
    this.darknessEnabled = true;
    this.groundEnabled = true;
    this.intensity = 0.72;
    this.elapsed = 0;
    this.lastFrame = performance.now();
    this.card = null;
    this.background = null;
    this.ground = null;
    this.particles = [];
    this.loadToken = 0;
    this.lastReportedMotionTime = -1;
    this.pointer = { x: 0.5, y: 0.53 };
    this.running = false;
    this.canvas.dataset.motionEnabled = "true";
    this.canvas.dataset.darknessEnabled = "true";
    this.canvas.dataset.groundEnabled = "true";
    this.canvas.dataset.intensity = String(this.intensity);
    this.canvas.dataset.motionTime = "0";
    this.canvas.addEventListener("pointermove", event => this.handlePointer(event));
  }

  async setCard(card, materialPath) {
    const token = ++this.loadToken;
    this.card = card;
    this.canvas.dataset.motionKind = card.motion.kind;
    this.background = null;
    this.ground = null;
    this.buildParticles();
    this.onStateChange("loading");

    try {
      const [background, ground] = await Promise.all([
        loadImage(card.art),
        loadImage(materialPath),
      ]);
      if (token !== this.loadToken) return;
      this.background = background;
      this.ground = ground;
      this.onStateChange("ready");
    } catch (error) {
      if (token !== this.loadToken) return;
      this.onStateChange("error", error);
    }
  }

  setMotionEnabled(enabled) {
    this.motionEnabled = enabled;
    this.canvas.dataset.motionEnabled = String(enabled);
  }

  setDarknessEnabled(enabled) {
    this.darknessEnabled = enabled;
    this.canvas.dataset.darknessEnabled = String(enabled);
  }

  setGroundEnabled(enabled) {
    this.groundEnabled = enabled;
    this.canvas.dataset.groundEnabled = String(enabled);
  }

  setIntensity(value) {
    this.intensity = clamp(value, 0, 1);
    this.canvas.dataset.intensity = String(this.intensity);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    requestAnimationFrame(time => this.frame(time));
  }

  handlePointer(event) {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    this.pointer.y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
  }

  buildParticles() {
    if (!this.card) return;
    const random = seededRandom(hashString(this.card.id));
    this.particles = Array.from({ length: this.card.motion.particleCount }, (_, index) => ({
      x: random(),
      y: random(),
      depth: 0.35 + random() * 0.65,
      size: 0.7 + random() * 2.6,
      phase: random() * TAU,
      speed: 0.6 + random() * 0.85,
      index,
    }));
  }

  frame(time) {
    if (!this.running) return;
    const delta = Math.min(50, time - this.lastFrame);
    this.lastFrame = time;
    if (this.motionEnabled) this.elapsed += delta * (0.25 + this.intensity * 0.75);
    const reportedMotionTime = Math.floor(this.elapsed / 100) * 100;
    if (reportedMotionTime !== this.lastReportedMotionTime) {
      this.lastReportedMotionTime = reportedMotionTime;
      this.canvas.dataset.motionTime = String(reportedMotionTime);
    }
    this.draw();
    requestAnimationFrame(nextTime => this.frame(nextTime));
  }

  draw() {
    const { context: ctx, canvas, card } = this;
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = "#03050a";
    ctx.fillRect(0, 0, width, height);
    if (!card || !this.background) return;

    const period = card.motion.periodMs;
    const cycle = (this.elapsed % period) / period;
    const wave = Math.sin(cycle * TAU);
    const strength = this.motionEnabled ? this.intensity : 0;
    const shift = card.motion.parallaxPx * strength;
    const scale = 1.018 + wave * 0.0025 * strength;

    ctx.save();
    ctx.translate(width / 2 + wave * shift, height / 2 + Math.cos(cycle * TAU) * shift * 0.32);
    ctx.scale(scale, scale);
    ctx.drawImage(this.background, -width / 2, -height / 2, width, height);
    ctx.restore();

    this.drawAtmosphere(cycle, strength);
    drawSignature(ctx, canvas, card, cycle, strength);
    this.drawParticles(strength);
    if (this.groundEnabled && this.ground) this.drawGround();
    if (this.darknessEnabled) this.drawDarkness();
    this.drawVignette();
  }

  drawAtmosphere(cycle, strength) {
    const { context: ctx, canvas, card } = this;
    const pulse = 0.5 + 0.5 * Math.sin(cycle * TAU);
    const gradient = ctx.createRadialGradient(
      canvas.width * 0.52, canvas.height * 0.48, 0,
      canvas.width * 0.52, canvas.height * 0.48, canvas.width * 0.52
    );
    gradient.addColorStop(0, rgba(card.secondary, 0.025 + pulse * 0.045 * strength));
    gradient.addColorStop(0.52, rgba(card.accent, 0.016 + pulse * 0.025 * strength));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  drawParticles(strength) {
    const { context: ctx, canvas, card } = this;
    const seconds = this.elapsed / 1000;
    const speed = card.motion.particleSpeed;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const particle of this.particles) {
      const travel = seconds * speed * particle.speed * 0.1;
      let x = particle.x;
      let y = particle.y;
      if (card.direction === "up") y = wrap(y - travel);
      if (card.direction === "down") y = wrap(y + travel);
      if (card.direction === "side") x = wrap(x + travel);
      if (card.direction === "orbit") {
        const angle = particle.phase + travel * TAU;
        x = 0.68 + Math.cos(angle) * (0.08 + particle.x * 0.23);
        y = 0.3 + Math.sin(angle) * (0.06 + particle.y * 0.18);
      }
      x = wrap(x + Math.sin(seconds * 0.4 + particle.phase) * card.motion.particleDrift * 0.025);
      const alpha = (0.08 + particle.depth * 0.28) * strength;
      ctx.fillStyle = rgba(particle.index % 4 ? card.accent : card.secondary, alpha);
      const px = x * canvas.width;
      const py = y * canvas.height;
      if (card.motion.kind === "rain" || card.motion.kind === "shimmer") {
        ctx.fillRect(px, py, Math.max(1, particle.size * 0.5), particle.size * 8);
      } else if (card.motion.kind === "steam") {
        ctx.beginPath();
        ctx.arc(px, py, particle.size * 8, 0, TAU);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, particle.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawGround() {
    const { context: ctx, canvas, card } = this;
    const width = canvas.width;
    const height = canvas.height;
    const pattern = ctx.createPattern(this.ground, "repeat");
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.88);
    ctx.lineTo(width * 0.13, height * 0.84);
    ctx.lineTo(width * 0.26, height * 0.89);
    ctx.lineTo(width * 0.43, height * 0.85);
    ctx.lineTo(width * 0.58, height * 0.9);
    ctx.lineTo(width * 0.76, height * 0.83);
    ctx.lineTo(width, height * 0.87);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = pattern || "#11131a";
    ctx.fillRect(0, height * 0.8, width, height * 0.2);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, height * 0.8, width, height * 0.2);
    ctx.restore();

    ctx.strokeStyle = rgba(card.accent, 0.23);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.88);
    ctx.lineTo(width * 0.13, height * 0.84);
    ctx.lineTo(width * 0.26, height * 0.89);
    ctx.lineTo(width * 0.43, height * 0.85);
    ctx.lineTo(width * 0.58, height * 0.9);
    ctx.lineTo(width * 0.76, height * 0.83);
    ctx.lineTo(width, height * 0.87);
    ctx.stroke();
  }

  drawDarkness() {
    const { context: ctx, canvas } = this;
    const x = canvas.width * this.pointer.x;
    const y = canvas.height * this.pointer.y;
    const light = ctx.createRadialGradient(x, y, 38, x, y, canvas.width * 0.31);
    light.addColorStop(0, "rgba(0,0,0,0)");
    light.addColorStop(0.32, "rgba(0,0,0,0.18)");
    light.addColorStop(0.68, "rgba(0,0,0,0.62)");
    light.addColorStop(1, "rgba(0,0,0,0.86)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawVignette() {
    const { context: ctx, canvas } = this;
    const vignette = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.2,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.72
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.54)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
