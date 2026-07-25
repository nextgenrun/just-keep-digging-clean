(function registerImagegenWeatherVfx() {
  const manifest = window.SKYLINE_VFX_MANIFEST;
  const images = {};
  const cloudActors = [
    { frame: 0, x: -280, y: 95, w: 390, h: 105, speed: 7, alpha: .45 },
    { frame: 1, x: 230, y: 118, w: 340, h: 92, speed: 9, alpha: .42 },
    { frame: 3, x: 30, y: 160, w: 500, h: 145, speed: 13, alpha: .50 },
    { frame: 4, x: 560, y: 145, w: 470, h: 138, speed: 17, alpha: .52 },
    { frame: 6, x: 780, y: 195, w: 560, h: 165, speed: 22, alpha: .55 },
    { frame: 8, x: 350, y: 220, w: 610, h: 175, speed: 25, alpha: .48 },
  ];
  const rainActors = Array.from({ length: 54 }, (_, i) => ({
    x: (i * 91 + 23) % 1100, y: (i * 67) % 500, speed: 210 + (i % 7) * 34,
    frame: i % 3 === 0 ? manifest.frames.rain.distant[i % 4] : manifest.frames.rain.foreground[i % 4],
    scale: .72 + (i % 5) * .07,
  }));
  const snowActors = Array.from({ length: 58 }, (_, i) => ({
    x: (i * 79 + 31) % 1040, y: (i * 61) % 470, speed: 19 + (i % 8) * 4,
    frame: manifest.frames.snow.flakes[i % manifest.frames.snow.flakes.length],
    size: 10 + (i % 6) * 3, phase: i * .73,
  }));

  for (const [key, sheet] of Object.entries(manifest.sheets)) {
    const image = new Image();
    image.src = sheet.src;
    images[key] = image;
  }

  function frameRect(image, sheet, frame) {
    let index = frame;
    for (let row = 0; row < sheet.layoutRows.length; row += 1) {
      const count = sheet.layoutRows[row];
      if (index < count) return { sx: index * image.naturalWidth / count, sy: row * image.naturalHeight / sheet.layoutRows.length, sw: image.naturalWidth / count, sh: image.naturalHeight / sheet.layoutRows.length };
      index -= count;
    }
    return null;
  }

  function drawFrame(ctx, sheetKey, frame, x, y, width, height, alpha = 1, rotation = 0) {
    const image = images[sheetKey];
    const sheet = manifest.sheets[sheetKey];
    if (!image?.complete || !image.naturalWidth) return;
    const source = frameRect(image, sheet, frame);
    if (!source) return;
    ctx.save();
    ctx.globalCompositeOperation = sheet.blend;
    ctx.globalAlpha = alpha;
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(rotation);
    ctx.drawImage(image, source.sx, source.sy, source.sw, source.sh, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function impactY(x) {
    const anchors = [[0,382],[85,352],[170,366],[275,375],[390,352],[500,337],[610,326],[700,361],[790,345],[875,337],[1001,365]];
    for (let i = 1; i < anchors.length; i += 1) {
      if (x <= anchors[i][0]) {
        const [x0,y0] = anchors[i - 1], [x1,y1] = anchors[i];
        return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
      }
    }
    return 365;
  }

  function drawClouds(state) {
    const weatherFrameOffset = state.weather === 'storm' ? 2 : state.weather === 'rain' ? 1 : 0;
    cloudActors.forEach((actor, i) => {
      const travel = state.W + actor.w * 2;
      const x = ((actor.x + state.t * actor.speed * state.p.wind) % travel) - actor.w;
      const frame = Math.min(8, actor.frame + (i > 1 ? weatherFrameOffset : 0));
      drawFrame(state.deep, 'clouds', frame, x, actor.y, actor.w, actor.h, actor.alpha * state.p.clouds * state.intensity);
    });
  }

  function drawSmoke(state) {
    if (state.p.rain > .78) return;
    state.chimneys.forEach((chimney, i) => {
      const life = (state.t * .12 + chimney.p) % 1;
      const size = 54 + life * 38;
      drawFrame(state.front, 'atmosphere', manifest.frames.atmosphere.smoke[i % 4], chimney.x + life * 38 * state.p.wind - size / 2, chimney.y - 25 - life * 64, size, size, (1 - life) * .34 * state.intensity);
    });
  }

  function drawRain(state) {
    if (!state.p.rain) return;
    rainActors.forEach((actor, i) => {
      const x = ((actor.x + state.t * 34 * state.p.wind) % (state.W + 120)) - 60;
      const landing = impactY(x);
      const y = ((actor.y + state.t * actor.speed) % (landing + 120)) - 70;
      const width = (i % 3 === 0 ? 150 : 128) * actor.scale;
      const height = (i % 3 === 0 ? 104 : 142) * actor.scale;
      state.front.save(); state.front.beginPath(); state.front.rect(0, 0, state.W, landing); state.front.clip();
      drawFrame(state.front, 'rain', actor.frame, x, y, width, height, (.30 + state.p.rain * .35) * state.intensity, -.05 * state.p.wind);
      state.front.restore();
    });
    const sheetAlpha = Math.max(0, state.p.rain - .40) * .46 * state.intensity;
    if (sheetAlpha > 0) {
      drawFrame(state.front, 'rain', manifest.frames.rain.sheets[0], -80 + (state.t * 48 * state.p.wind) % 520, 52, 480, 250, sheetAlpha);
      drawFrame(state.front, 'rain', manifest.frames.rain.sheets[1], 510 + (state.t * 32 * state.p.wind) % 320, 76, 500, 270, sheetAlpha * .88);
    }
    drawWaterImpacts(state);
  }

  function drawWaterImpacts(state) {
    const frame = Math.floor(state.t * 8) % manifest.frames.water.splash.length;
    for (let i = 0; i < 8; i += 1) {
      const x = 60 + ((i * 137 + Math.floor(state.t * 34)) % 900);
      const y = impactY(x) - 11;
      drawFrame(state.front, 'water', manifest.frames.water.splash[(frame + i) % 4], x - 35, y - 22, 70, 40, state.p.rain * .54 * state.intensity);
    }
    for (let i = 0; i < 4; i += 1) {
      const x = 135 + i * 238;
      drawFrame(state.front, 'water', manifest.frames.water.ripple[(frame + i) % 4], x - 46, impactY(x) - 11, 92, 28, state.p.rain * .34 * state.intensity);
    }
    // Water frames 8 and 9 are intentionally rejected and never addressed.
  }

  function drawSnow(state) {
    if (!state.p.snow) return;
    snowActors.forEach((actor) => {
      const x = (actor.x + Math.sin(state.t * .8 + actor.phase) * 22 * state.p.wind + state.W) % state.W;
      const y = (actor.y + state.t * actor.speed) % (state.H + 24) - 12;
      drawFrame(state.front, 'snow', actor.frame, x - actor.size / 2, y - actor.size / 2, actor.size, actor.size, (.42 + .2 * Math.sin(state.t + actor.phase) ** 2) * state.intensity, state.t * .18 + actor.phase);
    });
    for (let i = 0; i < 3; i += 1) {
      const x = ((state.t * (18 + i * 4) * state.p.wind + i * 390) % 1400) - 260;
      drawFrame(state.front, 'snow', manifest.frames.snow.powder[i], x, 315 + i * 18, 250, 86, .16 * state.p.snow * state.intensity);
    }
  }

  function drawFog(state) {
    if (!state.p.fog) return;
    for (let i = 0; i < 4; i += 1) {
      const x = ((state.t * (5 + i * 2) * state.p.wind + i * 330) % 1450) - 300;
      const y = 275 + i * 25;
      drawFrame(state.front, 'atmosphere', manifest.frames.atmosphere.fog[i], x, y, 430, 120, (.18 + state.p.fog * .24) * state.intensity);
    }
  }

  function drawLightning(state) {
    if (state.weather !== 'storm') return;
    const pulse = state.t % 7.4;
    if (pulse > .26) return;
    const alpha = (1 - pulse / .26) * .8 * state.intensity;
    drawFrame(state.front, 'lightning', manifest.frames.lightning.flashes[Math.floor(state.t / 7.4) % 4], 540, 25, 420, 220, alpha * .42);
    drawFrame(state.front, 'lightning', manifest.frames.lightning.bolts[Math.floor(state.t / 7.4) % 4], 680, 0, 210, 250, alpha);
    state.front.fillStyle = `rgba(198,224,255,${alpha * .17})`; state.front.fillRect(0, 0, state.W, state.H);
  }

  window.SKYLINE_IMAGEGEN_VFX = Object.freeze({
    drawDeep(state) { drawClouds(state); },
    drawFront(state) { drawSmoke(state); drawRain(state); drawSnow(state); drawFog(state); drawLightning(state); },
  });
}());
