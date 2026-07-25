(() => {
  'use strict';

  const FRAME_COUNT = 51;
  const COLUMNS = 16;
  const CELL = 341;
  const BASE_FPS = 14;
  const sources = {
    old: '../../../sprites/character/character-v8/runtime/legacy-walk-clean-sheet.webp',
    new: '../../unreal-legacy-miner-walk/Renders/legacy-miner-unreal-walk-sheet.webp',
  };

  const canvases = [document.querySelector('#old-canvas'), document.querySelector('#new-canvas')];
  const contexts = canvases.map((canvas) => canvas.getContext('2d'));
  const images = [new Image(), new Image()];
  const ready = [false, false];
  let frame = 0;
  let playing = true;
  let speed = 1;
  let accumulator = 0;
  let previousTime = performance.now();

  const playButton = document.querySelector('#play');
  const frameInput = document.querySelector('#frame');
  const speedInput = document.querySelector('#speed');
  const status = document.querySelector('#status');
  const checkerButton = document.querySelector('#checker');

  function draw() {
    const sourceX = (frame % COLUMNS) * CELL;
    const sourceY = Math.floor(frame / COLUMNS) * CELL;
    contexts.forEach((context, index) => {
      context.clearRect(0, 0, CELL, CELL);
      if (ready[index]) {
        context.drawImage(images[index], sourceX, sourceY, CELL, CELL, 0, 0, CELL, CELL);
      }
    });
    frameInput.value = String(frame);
    status.value = `frame ${String(frame + 1).padStart(2, '0')}/51 · ${(BASE_FPS * speed).toFixed(speed === 1 ? 0 : 2)} fps · 120° right-facing`;
  }

  function setFrame(nextFrame) {
    frame = (nextFrame + FRAME_COUNT) % FRAME_COUNT;
    accumulator = 0;
    draw();
  }

  function setPlaying(nextPlaying) {
    playing = nextPlaying;
    playButton.textContent = playing ? 'Pause' : 'Play';
  }

  function tick(time) {
    const delta = Math.min(100, time - previousTime);
    previousTime = time;
    if (playing) {
      accumulator += delta;
      const frameDuration = 1000 / (BASE_FPS * speed);
      while (accumulator >= frameDuration) {
        accumulator -= frameDuration;
        frame = (frame + 1) % FRAME_COUNT;
      }
      draw();
    }
    requestAnimationFrame(tick);
  }

  images.forEach((image, index) => {
    image.onload = () => { ready[index] = true; draw(); };
    image.onerror = () => { status.value = `asset failed: ${image.src}`; };
    image.src = index === 0 ? sources.old : sources.new;
  });

  playButton.addEventListener('click', () => setPlaying(!playing));
  document.querySelector('#restart').addEventListener('click', () => { setFrame(0); setPlaying(true); });
  document.querySelector('#previous').addEventListener('click', () => { setPlaying(false); setFrame(frame - 1); });
  document.querySelector('#next').addEventListener('click', () => { setPlaying(false); setFrame(frame + 1); });
  frameInput.addEventListener('input', () => { setPlaying(false); setFrame(Number(frameInput.value)); });
  speedInput.addEventListener('input', () => { speed = Number(speedInput.value); accumulator = 0; draw(); });
  checkerButton.addEventListener('click', () => {
    const enabled = !document.body.classList.contains('checker');
    document.body.classList.toggle('checker', enabled);
    checkerButton.setAttribute('aria-pressed', String(enabled));
  });

  draw();
  requestAnimationFrame(tick);
})();
