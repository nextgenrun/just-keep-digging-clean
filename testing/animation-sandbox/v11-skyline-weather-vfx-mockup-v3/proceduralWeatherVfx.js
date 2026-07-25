(function registerProceduralWeatherVfx() {
  function drawCloud(ctx, cloud, state) {
    const travel = state.W + cloud.w * 2;
    const x = ((cloud.x + state.t * cloud.speed * state.p.wind) % travel) - cloud.w;
    ctx.save();
    ctx.globalAlpha = cloud.alpha * state.p.clouds * state.intensity;
    ctx.filter = `blur(${7 + cloud.h * .09}px)`;
    ctx.fillStyle = cloud.color;
    for (let n = 0; n < 9; n += 1) {
      const u = n / 8;
      ctx.beginPath();
      ctx.ellipse(x + u * cloud.w, cloud.y - Math.sin(u * Math.PI) * cloud.h * .38, cloud.w * .15, cloud.h * (.35 + (n % 3) * .08), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSmoke(state) {
    if (state.p.rain > .7) return;
    for (const chimney of state.chimneys) for (let n = 0; n < 4; n += 1) {
      const life = (state.t * .25 + chimney.p + n * .24) % 1;
      state.front.globalAlpha = (1 - life) * .18 * state.intensity;
      state.front.fillStyle = '#a9bdc8';
      state.front.filter = 'blur(4px)';
      state.front.beginPath();
      state.front.arc(chimney.x + life * 30 * state.p.wind + Math.sin(state.t + chimney.p + n) * 5, chimney.y - life * 58, 4 + life * 9, 0, Math.PI * 2);
      state.front.fill();
    }
    state.front.globalAlpha = 1;
    state.front.filter = 'none';
  }

  function drawPrecipitation(state) {
    if (state.p.rain) {
      state.front.strokeStyle = `rgba(173,213,234,${.24 * state.p.rain * state.intensity})`;
      state.front.lineWidth = 1.25;
      state.rain.forEach((drop) => {
        const y = (drop.y + state.t * drop.s) % (state.H + 50) - 25;
        const x = (drop.x + state.t * 34 * state.p.wind) % state.W;
        state.front.beginPath(); state.front.moveTo(x, y); state.front.lineTo(x - 5 * state.p.wind, y + drop.l); state.front.stroke();
      });
    }
    if (state.p.snow) {
      state.snow.forEach((flake) => {
        const y = (flake.y + state.t * flake.s) % (state.H + 15) - 8;
        const x = (flake.x + Math.sin(state.t * .9 + flake.p) * 18 * state.p.wind) % state.W;
        state.front.fillStyle = `rgba(238,248,255,${.38 + .32 * Math.sin(state.t + flake.p) ** 2})`;
        state.front.beginPath(); state.front.arc(x, y, flake.r, 0, Math.PI * 2); state.front.fill();
      });
    }
    if (state.p.fog) {
      for (let n = 0; n < 3; n += 1) {
        const x = ((state.t * (5 + n * 3) * state.p.wind + n * 360) % 1450) - 320;
        const gradient = state.front.createRadialGradient(x, 330, 10, x, 330, 260);
        gradient.addColorStop(0, `rgba(181,204,215,${.16 * state.p.fog * state.intensity})`);
        gradient.addColorStop(1, 'rgba(150,183,201,0)');
        state.front.fillStyle = gradient; state.front.fillRect(x - 270, 240, 540, 190);
      }
    }
  }

  function drawLightning(state) {
    if (state.weather !== 'storm') return;
    const pulse = state.t % 7.4;
    if (pulse > .18) return;
    const alpha = (1 - pulse / .18) * .68 * state.intensity;
    state.front.fillStyle = `rgba(193,220,255,${alpha * .28})`; state.front.fillRect(0, 0, state.W, state.H);
    state.front.strokeStyle = `rgba(226,239,255,${alpha})`; state.front.lineWidth = 2;
    state.front.beginPath(); state.front.moveTo(782, 26); state.front.lineTo(748, 91); state.front.lineTo(767, 91); state.front.lineTo(731, 164); state.front.stroke();
  }

  window.SKYLINE_PROCEDURAL_VFX = Object.freeze({
    drawDeep(state) { state.cloudBands.forEach((cloud) => drawCloud(state.deep, cloud, state)); },
    drawFront(state) { drawSmoke(state); drawPrecipitation(state); drawLightning(state); },
  });
}());
