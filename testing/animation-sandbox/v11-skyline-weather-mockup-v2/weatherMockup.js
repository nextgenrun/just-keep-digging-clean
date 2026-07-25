const W = 1001;
const H = 430;
const deep = document.getElementById('deep-canvas').getContext('2d');
const rotor = document.getElementById('rotor-canvas').getContext('2d');
const front = document.getElementById('front-canvas').getContext('2d');
const stage = document.getElementById('skyline-stage');
const motion = document.getElementById('motion-toggle');
const cycleToggle = document.getElementById('cycle-toggle');
const timeInput = document.getElementById('time');
const timeValue = document.getElementById('time-value');
const weatherInput = document.getElementById('weather');
const intensityInput = document.getElementById('intensity');
const intensityValue = document.getElementById('intensity-value');
const status = document.getElementById('status');
const grade = document.getElementById('grade');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const presets = {
  clear:  { clouds: .35, wind: .42, rain: 0, snow: 0, fog: .03, dark: 0 },
  cloudy: { clouds: .78, wind: .72, rain: 0, snow: 0, fog: .12, dark: .08 },
  rain:   { clouds: 1.05, wind: 1.05, rain: .68, snow: 0, fog: .18, dark: .18 },
  storm:  { clouds: 1.28, wind: 1.65, rain: 1, snow: 0, fog: .24, dark: .32 },
  fog:    { clouds: .55, wind: .28, rain: 0, snow: 0, fog: .82, dark: .08 },
  snow:   { clouds: .88, wind: .82, rain: 0, snow: .9, fog: .34, dark: .1 },
};

const cloudBands = [
  { x: -280, y: 126, w: 370, h: 38, speed: 7, alpha: .12, color: '#abc7d8' },
  { x: 80, y: 183, w: 520, h: 58, speed: 13, alpha: .17, color: '#668aa4' },
  { x: 480, y: 102, w: 420, h: 45, speed: 9, alpha: .13, color: '#9bb8cb' },
  { x: 730, y: 222, w: 470, h: 68, speed: 21, alpha: .19, color: '#38566d' },
  { x: 980, y: 162, w: 330, h: 45, speed: 17, alpha: .15, color: '#7696aa' },
  { x: 300, y: 250, w: 430, h: 76, speed: 25, alpha: .14, color: '#273f52' },
];
const stars = Array.from({ length: 72 }, (_, i) => ({ x: (i * 89 + 31) % W, y: 18 + (i * 53) % 235, r: .45 + (i % 4) * .24, p: i * .77 }));
const rain = Array.from({ length: 170 }, (_, i) => ({ x: (i * 73) % W, y: (i * 137) % H, l: 8 + (i % 6) * 4, s: 250 + (i % 9) * 21 }));
const snow = Array.from({ length: 100 }, (_, i) => ({ x: (i * 97) % W, y: (i * 61) % H, r: 1 + (i % 4) * .55, s: 22 + (i % 8) * 5, p: i * .83 }));
const windows = [[101,352],[176,354],[298,349],[421,350],[471,352],[535,347],[582,357],[637,356],[762,361],[918,365],[955,358]];
const chimneys = [{x:419,y:332,p:.3},{x:551,y:324,p:1.7},{x:644,y:337,p:2.8},{x:921,y:349,p:4.1}];
let enabled = motion.checked && !reduceMotion;
let elapsed = 0;
let last = performance.now();

function daylight(hour) {
  return Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
}

function drawCloud(ctx, c, t, amount, wind, i) {
  const travel = W + c.w * 2;
  const x = ((c.x + t * c.speed * wind) % travel) - c.w;
  ctx.save();
  ctx.globalAlpha = c.alpha * amount * i;
  ctx.filter = `blur(${7 + c.h * .09}px)`;
  ctx.fillStyle = c.color;
  for (let n = 0; n < 9; n += 1) {
    const u = n / 8;
    ctx.beginPath();
    ctx.ellipse(x + u * c.w, c.y - Math.sin(u * Math.PI) * c.h * .38, c.w * .15, c.h * (.35 + (n % 3) * .08), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSky(t, hour, p, i) {
  deep.clearRect(0, 0, W, H);
  const day = daylight(hour);
  const night = 1 - day;
  if (day > .02) {
    const sky = deep.createLinearGradient(0, 0, 0, 310);
    sky.addColorStop(0, `rgba(70,155,211,${.94 * day})`);
    sky.addColorStop(1, `rgba(137,193,220,${.7 * day})`);
    deep.fillStyle = sky;
    deep.fillRect(0, 0, W, 330);
  }
  const dusk = Math.max(0, 1 - Math.abs(hour - 18.6) / 1.7) + Math.max(0, 1 - Math.abs(hour - 5.6) / 1.5);
  if (dusk > 0) {
    const glow = deep.createLinearGradient(0, 130, 0, 330);
    glow.addColorStop(0, 'rgba(244,129,83,0)');
    glow.addColorStop(1, `rgba(244,129,83,${.33 * Math.min(1,dusk)})`);
    deep.fillStyle = glow; deep.fillRect(0, 110, W, 220);
  }
  deep.fillStyle = '#d9efff';
  for (const s of stars) {
    deep.globalAlpha = night * (.16 + .65 * Math.max(0, Math.sin(t * 1.5 + s.p)));
    deep.beginPath(); deep.arc(s.x, s.y, s.r, 0, Math.PI * 2); deep.fill();
  }
  deep.globalAlpha = 1;
  if (day > .12) {
    const sunX = 80 + ((hour - 6) / 12) * 840;
    const sunY = 190 - Math.sin(((hour - 6) / 12) * Math.PI) * 145;
    const g = deep.createRadialGradient(sunX,sunY,3,sunX,sunY,70);
    g.addColorStop(0,`rgba(255,242,190,${.64*day})`); g.addColorStop(1,'rgba(255,220,130,0)');
    deep.fillStyle=g; deep.fillRect(sunX-75,sunY-75,150,150);
  }
  for (const c of cloudBands) drawCloud(deep, c, t, p.clouds, p.wind, i);
  if (night > .72 && weatherInput.value === 'clear') {
    const life = t % 11;
    if (life < 1.2) {
      const x = 250 + life * 410, y = 55 + life * 78;
      deep.strokeStyle = `rgba(218,240,255,${Math.sin(life/1.2*Math.PI)*.65})`;
      deep.lineWidth = 2; deep.beginPath(); deep.moveTo(x-80,y-28); deep.lineTo(x,y); deep.stroke();
    }
  }
}

function drawRotor(x, y, radius, phase, t, wind) {
  rotor.save(); rotor.translate(x,y); rotor.rotate(t * (.18 + wind * .32) + phase);
  rotor.strokeStyle='rgba(67,48,32,.95)'; rotor.fillStyle='rgba(96,69,42,.9)'; rotor.lineWidth=2.6;
  for (let arm=0; arm<4; arm+=1) {
    rotor.rotate(Math.PI/2); rotor.beginPath(); rotor.moveTo(0,0); rotor.lineTo(radius,0); rotor.stroke();
    rotor.beginPath(); rotor.moveTo(radius*.42,-3); rotor.lineTo(radius,-8); rotor.lineTo(radius,8); rotor.lineTo(radius*.42,3); rotor.closePath(); rotor.fill();
    rotor.strokeStyle='rgba(151,112,70,.38)'; rotor.beginPath(); rotor.moveTo(radius*.55,-3); rotor.lineTo(radius*.92,-6); rotor.stroke(); rotor.strokeStyle='rgba(67,48,32,.95)';
  }
  rotor.fillStyle='#604529'; rotor.beginPath(); rotor.arc(0,0,6,0,Math.PI*2); rotor.fill(); rotor.restore();
}

function drawRotors(t, p) {
  rotor.clearRect(0,0,W,H);
  drawRotor(725,334,36,.2,t,p.wind);
  drawRotor(857,318,34,1.15,t,p.wind);
}

function drawWindows(t, hour, weather, i) {
  const darkness = 1 - daylight(hour);
  windows.forEach(([x,y], n) => {
    const occupied = .56 + .44 * Math.sin(t * (.13 + n*.005) + n*2.1) > .22;
    if (!occupied) return;
    const flicker = .82 + .18 * Math.sin(t * 1.4 + n);
    const a = darkness * flicker * (.24 + (weather==='storm' ? .12 : 0)) * i;
    const g = front.createRadialGradient(x,y,0,x,y,18);
    g.addColorStop(0,`rgba(255,191,91,${Math.min(.7,a)})`); g.addColorStop(1,'rgba(255,145,45,0)');
    front.fillStyle=g; front.fillRect(x-19,y-19,38,38);
  });
}

function drawSmoke(t, p, i) {
  if (p.rain > .7) return;
  for (const c of chimneys) for (let n=0;n<4;n+=1) {
    const life=(t*.25+c.p+n*.24)%1;
    front.globalAlpha=(1-life)*.18*i;
    front.fillStyle='#a9bdc8'; front.filter='blur(4px)'; front.beginPath();
    front.arc(c.x+life*30*p.wind+Math.sin(t+c.p+n)*5,c.y-life*58,4+life*9,0,Math.PI*2); front.fill();
  }
  front.globalAlpha=1; front.filter='none';
}

function drawLife(t, hour, weather, p) {
  const day = daylight(hour);
  if (day > .35 && weather !== 'storm' && weather !== 'rain') {
    front.strokeStyle=`rgba(28,40,46,${day*.65})`; front.lineWidth=1.5;
    for (let n=0;n<5;n+=1) {
      const x=((t*(18+n*2)+n*190)%1150)-60, y=90+n*15+Math.sin(t*1.3+n)*8;
      front.beginPath(); front.arc(x,y,5,3.3,6.05); front.arc(x+10,y,5,3.38,6.1); front.stroke();
    }
  }
  if ((hour>19 || hour<5) && weather==='clear') {
    for (let n=0;n<16;n+=1) {
      const x=70+(n*61)%880+Math.sin(t*.7+n)*12, y=330+(n*17)%58+Math.sin(t*1.1+n)*7;
      const a=.2+.55*Math.max(0,Math.sin(t*1.7+n*2.3));
      front.fillStyle=`rgba(213,255,133,${a})`; front.beginPath(); front.arc(x,y,1.2,0,Math.PI*2); front.fill();
    }
  }
  // Tiny pennants give the settlement a readable wind response.
  [[329,339],[647,326],[948,344]].forEach(([x,y],n)=>{
    front.strokeStyle='rgba(92,63,43,.8)'; front.beginPath(); front.moveTo(x,y); front.lineTo(x,y-17); front.stroke();
    const wave=5+Math.sin(t*4+n)*2*p.wind; front.fillStyle='rgba(177,92,65,.72)'; front.beginPath(); front.moveTo(x,y-16); front.quadraticCurveTo(x+wave,y-14,x+11*p.wind,y-10); front.lineTo(x,y-9); front.closePath(); front.fill();
  });
}

function drawPrecip(t, p, i) {
  if (p.rain) {
    front.strokeStyle=`rgba(173,213,234,${.24*p.rain*i})`; front.lineWidth=1.25;
    rain.forEach(d=>{ const y=(d.y+t*d.s)% (H+50)-25, x=(d.x+t*34*p.wind)%W; front.beginPath(); front.moveTo(x,y); front.lineTo(x-5*p.wind,y+d.l); front.stroke(); });
  }
  if (p.snow) {
    snow.forEach(f=>{ const y=(f.y+t*f.s)%(H+15)-8, x=(f.x+Math.sin(t*.9+f.p)*18*p.wind)%W; front.fillStyle=`rgba(238,248,255,${.38+.32*Math.sin(t+f.p)**2})`; front.beginPath(); front.arc(x,y,f.r,0,Math.PI*2); front.fill(); });
  }
  if (p.fog) {
    for (let n=0;n<3;n+=1) {
      const x=((t*(5+n*3)*p.wind+n*360)%1450)-320;
      const g=front.createRadialGradient(x,330,10,x,330,260);
      g.addColorStop(0,`rgba(181,204,215,${.16*p.fog*i})`); g.addColorStop(1,'rgba(150,183,201,0)'); front.fillStyle=g; front.fillRect(x-270,240,540,190);
    }
  }
}

function drawLightning(t, weather, i) {
  if (weather !== 'storm') return;
  const pulse=t%7.4;
  if (pulse>.18) return;
  const a=(1-pulse/.18)*.68*i;
  front.fillStyle=`rgba(193,220,255,${a*.28})`; front.fillRect(0,0,W,H);
  front.strokeStyle=`rgba(226,239,255,${a})`; front.lineWidth=2; front.beginPath(); front.moveTo(782,26); front.lineTo(748,91); front.lineTo(767,91); front.lineTo(731,164); front.stroke();
}

function updateGrade(hour, weather, p) {
  const day=daylight(hour);
  const night=1-day;
  grade.style.background = day>.2 ? `rgba(114,188,225,${.25*day})` : `rgba(12,25,48,${.3*night+p.dark})`;
  grade.style.mixBlendMode = day>.2 ? 'screen' : 'multiply';
}

function updateLabels(hour, weather, i, p) {
  timeValue.value=`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.round((hour%1)*60)).padStart(2,'0')}`;
  intensityValue.value=`${i.toFixed(1)}×`;
  const wind=p.wind<.5?'soft breeze':p.wind<.9?'steady breeze':p.wind<1.4?'strong west wind':'gale-force west wind';
  status.textContent=`${timeValue.value} · ${weather[0].toUpperCase()+weather.slice(1)} · ${wind} · layered mockup only`;
}

function render(now) {
  const dt=Math.min(50,now-last)/1000; last=now;
  if (enabled) elapsed+=dt;
  if (enabled && cycleToggle.checked) timeInput.value = String((20 + elapsed * .22) % 24);
  const hour=Number(timeInput.value), weather=weatherInput.value, i=Number(intensityInput.value), p=presets[weather];
  drawSky(elapsed,hour,p,i); drawRotors(elapsed,p);
  front.clearRect(0,0,W,H); drawWindows(elapsed,hour,weather,i); drawSmoke(elapsed,p,i); drawLife(elapsed,hour,weather,p); drawPrecip(elapsed,p,i); drawLightning(elapsed,weather,i);
  updateGrade(hour,weather,p); updateLabels(hour,weather,i,p);
  requestAnimationFrame(render);
}

motion.addEventListener('change',()=>{enabled=motion.checked&&!reduceMotion;stage.classList.toggle('is-paused',!enabled);});
if (reduceMotion) { motion.checked=false; enabled=false; stage.classList.add('is-paused'); }
requestAnimationFrame(render);
