const WIDTH = 1001;
const HEIGHT = 430;
const canvas = document.getElementById('motion-canvas');
const context = canvas.getContext('2d');
const stage = document.getElementById('skyline-stage');
const motionToggle = document.getElementById('motion-toggle');
const intensityInput = document.getElementById('intensity');
const intensityValue = document.getElementById('intensity-value');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let enabled = motionToggle.checked && !reduceMotion;
let intensity = Number(intensityInput.value);
let previousTime = performance.now();
let elapsed = 0;

const clouds = [
  { x: -120, y: 150, width: 300, height: 42, speed: 32, alpha: .18, color: '#789bbd' },
  { x: 140, y: 205, width: 380, height: 52, speed: 18, alpha: .24, color: '#52799d' },
  { x: 520, y: 128, width: 270, height: 38, speed: 42, alpha: .15, color: '#86a8c5' },
  { x: 760, y: 232, width: 340, height: 46, speed: 24, alpha: .21, color: '#496f92' },
  { x: 960, y: 184, width: 245, height: 34, speed: 36, alpha: .16, color: '#7598b7' },
];

const stars = Array.from({ length: 82 }, (_, index) => ({
  x: (index * 83 + 37) % WIDTH,
  y: 16 + ((index * 47) % 238),
  radius: .45 + (index % 4) * .22,
  phase: index * .73,
}));

const chimneys = [
  { x: 419, y: 333, phase: .3 },
  { x: 551, y: 325, phase: 1.7 },
  { x: 644, y: 337, phase: 2.8 },
  { x: 921, y: 350, phase: 4.1 },
];

const windows = [
  [101, 352], [176, 354], [422, 350], [536, 347], [637, 356], [762, 361], [918, 365],
];

function drawCloud(cloud, time) {
  const travel = WIDTH + cloud.width * 2;
  const x = ((cloud.x + time * cloud.speed) % travel) - cloud.width;
  context.save();
  context.globalAlpha = cloud.alpha * intensity;
  context.filter = `blur(${9 + cloud.height * .12}px)`;
  context.fillStyle = cloud.color;
  for (let index = 0; index < 7; index += 1) {
    const u = index / 6;
    const lift = Math.sin(u * Math.PI) * cloud.height * .45;
    context.beginPath();
    context.ellipse(x + u * cloud.width, cloud.y - lift, cloud.width * .18, cloud.height * (.42 + .18 * Math.sin(index)), 0, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawStars(time) {
  context.save();
  context.fillStyle = '#c7e8ff';
  for (const star of stars) {
    const pulse = .18 + .56 * Math.max(0, Math.sin(time * 1.65 + star.phase));
    context.globalAlpha = pulse * intensity;
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawSmoke(time) {
  context.save();
  context.fillStyle = '#9ab1c3';
  context.filter = 'blur(5px)';
  for (const chimney of chimneys) {
    for (let index = 0; index < 4; index += 1) {
      const life = (time * .28 + chimney.phase + index * .24) % 1;
      context.globalAlpha = (1 - life) * .19 * intensity;
      context.beginPath();
      context.arc(chimney.x + Math.sin(time + chimney.phase + index) * 8 + life * 14, chimney.y - life * 62, 5 + life * 9, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawWindowLight(time) {
  for (let index = 0; index < windows.length; index += 1) {
    const [x, y] = windows[index];
    const alpha = (.045 + .06 * (1 + Math.sin(time * 1.05 + index)) / 2) * intensity;
    const glow = context.createRadialGradient(x, y, 0, x, y, 22);
    glow.addColorStop(0, `rgba(255, 179, 78, ${alpha * 3})`);
    glow.addColorStop(1, 'rgba(255, 156, 52, 0)');
    context.fillStyle = glow;
    context.fillRect(x - 22, y - 22, 44, 44);
  }
}

function drawMoonHaze(time) {
  const pulse = .72 + .28 * Math.sin(time * .85);
  const glow = context.createRadialGradient(151, 102, 4, 151, 102, 72);
  glow.addColorStop(0, `rgba(198, 229, 255, ${.18 * pulse * intensity})`);
  glow.addColorStop(.35, `rgba(107, 169, 215, ${.11 * pulse * intensity})`);
  glow.addColorStop(1, 'rgba(74, 128, 172, 0)');
  context.fillStyle = glow;
  context.fillRect(76, 27, 150, 150);
}

function drawWindmill(x, y, radius, phase, time) {
  context.save();
  context.translate(x, y);
  context.rotate(time * .34 + phase);
  context.strokeStyle = `rgba(186, 158, 116, ${.26 * intensity})`;
  context.fillStyle = `rgba(112, 91, 66, ${.18 * intensity})`;
  context.lineWidth = 2.2;
  for (let arm = 0; arm < 4; arm += 1) {
    context.rotate(Math.PI / 2);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(radius, 0);
    context.stroke();
    context.beginPath();
    context.moveTo(radius * .34, -3);
    context.lineTo(radius, -7);
    context.lineTo(radius, 7);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawShootingStar(time) {
  const life = time % 8;
  if (life > 1.25) return;
  const x = 260 + life * 430;
  const y = 42 + life * 90;
  const alpha = Math.sin((life / 1.25) * Math.PI) * .55 * intensity;
  const streak = context.createLinearGradient(x - 95, y - 38, x, y);
  streak.addColorStop(0, 'rgba(161, 213, 255, 0)');
  streak.addColorStop(1, `rgba(224, 243, 255, ${alpha})`);
  context.strokeStyle = streak;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x - 95, y - 38);
  context.lineTo(x, y);
  context.stroke();
}

function render(now) {
  const delta = Math.min(50, now - previousTime) / 1000;
  previousTime = now;
  if (enabled) elapsed += delta;
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawMoonHaze(elapsed);
  drawStars(elapsed);
  for (const cloud of clouds) drawCloud(cloud, elapsed);
  drawSmoke(elapsed);
  drawWindowLight(elapsed);
  drawWindmill(720, 330, 42, .2, elapsed);
  drawWindmill(855, 330, 48, 1.1, elapsed);
  drawShootingStar(elapsed);
  requestAnimationFrame(render);
}

motionToggle.addEventListener('change', () => {
  enabled = motionToggle.checked && !reduceMotion;
  stage.classList.toggle('is-paused', !enabled);
});

intensityInput.addEventListener('input', () => {
  intensity = Number(intensityInput.value);
  intensityValue.value = `${intensity.toFixed(1)}×`;
});

if (reduceMotion) {
  motionToggle.checked = false;
  stage.classList.add('is-paused');
}

requestAnimationFrame(render);
