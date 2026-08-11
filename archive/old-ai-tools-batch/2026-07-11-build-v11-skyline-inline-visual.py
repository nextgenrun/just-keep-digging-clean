"""Build the inline v11 skyline motion mockup from the exact authored source crop."""

from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sprites" / "backgrounds" / "world-v11-test" / "level-1-band-01-ground-row-65-master.png"
TARGET = Path(r"C:\Users\Mila\.codex\visualizations\2026\07\11\019f511f-df8a-7170-8ada-c0eed87ca795\v11-skyline-motion-v2.html")


def encoded_skyline() -> str:
    with Image.open(SOURCE) as source:
        crop = source.convert("RGB").crop((0, 0, 1001, 430))
        buffer = BytesIO()
        crop.save(buffer, format="WEBP", quality=84, method=6)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def build_fragment(image_data: str) -> str:
    return f'''<div id="v11-skyline-motion-v2-vis">
  <div class="viz-controls" aria-label="Skyline motion controls">
    <label class="form-check form-switch">
      <input class="form-check-input" id="v11-motion-v2-toggle" type="checkbox" checked>
      <span class="form-check-label">Motion</span>
    </label>
    <label class="form-label" for="v11-motion-v2-intensity">Intensity <output id="v11-motion-v2-value">1.6×</output></label>
    <input class="form-range" id="v11-motion-v2-intensity" type="range" min="0" max="3" step="0.1" value="1.6">
  </div>
  <div class="v11-sky-field" role="img" aria-label="Exact v11 town skyline crop with drifting clouds, star twinkle, chimney smoke, and breathing window light">
    <img alt="" src="data:image/webp;base64,{image_data}">
    <canvas width="1001" height="430" aria-hidden="true"></canvas>
  </div>
</div>
<style>
  #v11-skyline-motion-v2-vis {{ width: 100%; color: var(--foreground); }}
  #v11-skyline-motion-v2-vis .viz-controls {{ margin-bottom: 12px; }}
  #v11-skyline-motion-v2-vis .form-range {{ max-width: 260px; }}
  #v11-skyline-motion-v2-vis .v11-sky-field {{ position: relative; overflow: hidden; width: 100%; aspect-ratio: 1001 / 430; border: 1px solid var(--border); border-radius: 10px; background: var(--muted); }}
  #v11-skyline-motion-v2-vis .v11-sky-field img,
  #v11-skyline-motion-v2-vis .v11-sky-field canvas {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
  #v11-skyline-motion-v2-vis .v11-sky-field img {{ object-fit: cover; }}
  @media (max-width: 520px) {{ #v11-skyline-motion-v2-vis .form-range {{ width: 100%; max-width: none; }} }}
</style>
<script>
(() => {{
  const root = document.getElementById('v11-skyline-motion-v2-vis');
  const canvas = root.querySelector('canvas');
  const context = canvas.getContext('2d');
  const toggle = root.querySelector('#v11-motion-v2-toggle');
  const slider = root.querySelector('#v11-motion-v2-intensity');
  const output = root.querySelector('#v11-motion-v2-value');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let enabled = !reduceMotion;
  let intensity = 1.6;
  let elapsed = 0;
  let previous = performance.now();
  const clouds = [
    [-120,150,300,42,32,.18,'#789bbd'], [140,205,380,52,18,.24,'#52799d'],
    [520,128,270,38,42,.15,'#86a8c5'], [760,232,340,46,24,.21,'#496f92'],
    [960,184,245,34,36,.16,'#7598b7']
  ];
  const stars = Array.from({{ length: 82 }}, (_, i) => [
    (i * 83 + 37) % 1001, 16 + ((i * 47) % 238), .45 + (i % 4) * .22, i * .73
  ]);
  const chimneys = [[419,333,.3],[551,325,1.7],[644,337,2.8],[921,350,4.1]];
  const windows = [[101,352],[176,354],[422,350],[536,347],[637,356],[762,361],[918,365]];

  function cloud(item) {{
    const [start,y,width,height,speed,alpha,color] = item;
    const x = ((start + elapsed * speed) % (1001 + width * 2)) - width;
    context.save();
    context.globalAlpha = alpha * intensity;
    context.filter = `blur(${{9 + height * .12}}px)`;
    context.fillStyle = color;
    for (let i = 0; i < 7; i += 1) {{
      const u = i / 6;
      context.beginPath();
      context.ellipse(x + u * width, y - Math.sin(u * Math.PI) * height * .45, width * .18, height * (.42 + .18 * Math.sin(i)), 0, 0, Math.PI * 2);
      context.fill();
    }}
    context.restore();
  }}

  function moonHaze() {{
    const pulse = .72 + .28 * Math.sin(elapsed * .85);
    const glow = context.createRadialGradient(151,102,4,151,102,72);
    glow.addColorStop(0, `rgba(198,229,255,${{.18 * pulse * intensity}})`);
    glow.addColorStop(.35, `rgba(107,169,215,${{.11 * pulse * intensity}})`);
    glow.addColorStop(1, 'rgba(74,128,172,0)');
    context.fillStyle = glow; context.fillRect(76,27,150,150);
  }}

  function windmill(x,y,radius,phase) {{
    context.save(); context.translate(x,y); context.rotate(elapsed * .34 + phase);
    context.strokeStyle = `rgba(186,158,116,${{.26 * intensity}})`;
    context.fillStyle = `rgba(112,91,66,${{.18 * intensity}})`;
    context.lineWidth = 2.2;
    for (let arm = 0; arm < 4; arm += 1) {{
      context.rotate(Math.PI / 2);
      context.beginPath(); context.moveTo(0,0); context.lineTo(radius,0); context.stroke();
      context.beginPath(); context.moveTo(radius * .34,-3); context.lineTo(radius,-7); context.lineTo(radius,7); context.closePath(); context.fill();
    }}
    context.restore();
  }}

  function shootingStar() {{
    const life = elapsed % 8;
    if (life > 1.25) return;
    const x = 260 + life * 430;
    const y = 42 + life * 90;
    const alpha = Math.sin((life / 1.25) * Math.PI) * .55 * intensity;
    const streak = context.createLinearGradient(x - 95,y - 38,x,y);
    streak.addColorStop(0,'rgba(161,213,255,0)');
    streak.addColorStop(1,`rgba(224,243,255,${{alpha}})`);
    context.strokeStyle = streak; context.lineWidth = 2;
    context.beginPath(); context.moveTo(x - 95,y - 38); context.lineTo(x,y); context.stroke();
  }}

  function draw() {{
    context.clearRect(0, 0, 1001, 430);
    moonHaze();
    context.fillStyle = '#c7e8ff';
    for (const [x,y,r,phase] of stars) {{
      context.globalAlpha = (.18 + .56 * Math.max(0, Math.sin(elapsed * 1.65 + phase))) * intensity;
      context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill();
    }}
    context.globalAlpha = 1;
    clouds.forEach(cloud);
    context.save(); context.fillStyle = '#9ab1c3'; context.filter = 'blur(5px)';
    for (const [x,y,phase] of chimneys) {{
      for (let i = 0; i < 4; i += 1) {{
        const life = (elapsed * .28 + phase + i * .24) % 1;
        context.globalAlpha = (1 - life) * .19 * intensity;
        context.beginPath(); context.arc(x + Math.sin(elapsed + phase + i) * 8 + life * 14, y - life * 62, 5 + life * 9, 0, Math.PI * 2); context.fill();
      }}
    }}
    context.restore();
    windows.forEach(([x,y], i) => {{
      const a = (.045 + .06 * (1 + Math.sin(elapsed * 1.05 + i)) / 2) * intensity;
      const glow = context.createRadialGradient(x,y,0,x,y,22);
      glow.addColorStop(0, `rgba(255,179,78,${{a * 3}})`); glow.addColorStop(1, 'rgba(255,156,52,0)');
      context.fillStyle = glow; context.fillRect(x - 22, y - 22, 44, 44);
    }});
    windmill(720,330,42,.2);
    windmill(855,330,48,1.1);
    shootingStar();
  }}

  function frame(now) {{
    const delta = Math.min(50, now - previous) / 1000;
    previous = now;
    if (enabled) elapsed += delta;
    draw();
    requestAnimationFrame(frame);
  }}

  toggle.checked = enabled;
  toggle.addEventListener('change', () => {{ enabled = toggle.checked && !reduceMotion; }});
  slider.addEventListener('input', () => {{ intensity = Number(slider.value); output.value = `${{intensity.toFixed(1)}}×`; }});
  requestAnimationFrame(frame);
}})();
</script>
'''


def main() -> None:
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(build_fragment(encoded_skyline()), encoding="utf-8")
    print(TARGET)
    print(TARGET.stat().st_size)


if __name__ == "__main__":
    main()
