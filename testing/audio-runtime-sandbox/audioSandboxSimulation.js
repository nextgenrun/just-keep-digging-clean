const MATERIALS = {
  dirt: { name: "Dirt", color: "#765539", edge: "#bb8050" },
  stone: { name: "Stone", color: "#4c525b", edge: "#98a1a9" },
  gold: { name: "Gold", color: "#5e4a22", edge: "#f0c45f" }
};

export class AudioSandboxSimulation {
  constructor(canvas, audioActions, report) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.audio = audioActions;
    this.report = report;
    this.keys = new Set();
    this.player = { x: 122, y: 334, vx: 0, vy: 0, width: 58, height: 70, grounded: true, flight: false, airborne: false };
    this.blocks = ["dirt", "stone", "gold"].map((type, index) => ({ type, x: 300 + index * 164, y: 374, width: 120, height: 120, hits: 0 }));
    this.selected = "dirt";
    this.lastTime = performance.now();
    this.lastStep = 0;
    this.stepIndex = 0;
    this.lastFlightMotion = 0;
    this.background = new Image();
    this.background.src = "../../sprites/backgrounds/world-scenic-facade-v1/level1-amber-crystal-seamless.webp";
    this.character = new Image();
    this.character.src = "../../sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-idle-sheet.webp";
    this.bindInput();
    requestAnimationFrame((time) => this.frame(time));
  }

  bindInput() {
    window.addEventListener("keydown", (event) => {
      if (["INPUT", "BUTTON"].includes(event.target.tagName)) return;
      if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (event.repeat) return;
      if (event.code === "Space") this.jump();
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") this.startFlight();
      if (event.code === "KeyE") this.digSelected();
      if (event.code === "Digit1") this.selectMaterial("dirt");
      if (event.code === "Digit2") this.selectMaterial("stone");
      if (event.code === "Digit3") this.selectMaterial("gold");
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") this.stopFlight();
    });
    this.canvas.addEventListener("pointerdown", (event) => {
      const point = this.canvasPoint(event);
      const block = this.blocks.find((candidate) => point.x >= candidate.x && point.x <= candidate.x + candidate.width && point.y >= candidate.y && point.y <= candidate.y + candidate.height);
      if (!block) return;
      this.selectMaterial(block.type);
      this.dig(block);
    });
  }

  canvasPoint(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (this.canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (this.canvas.height / bounds.height)
    };
  }

  selectMaterial(type) {
    if (!MATERIALS[type]) return;
    this.selected = type;
    document.querySelectorAll("[data-material]").forEach((button) => button.classList.toggle("is-active", button.dataset.material === type));
    this.report(`Target: ${MATERIALS[type].name}`, "selection");
  }

  digSelected() {
    this.dig(this.blocks.find((block) => block.type === this.selected));
  }

  dig(block) {
    if (!block) return;
    const playerCenter = this.player.x + this.player.width / 2;
    const blockCenter = block.x + block.width / 2;
    if (Math.abs(playerCenter - blockCenter) > 245) {
      this.report(`Move closer to the ${MATERIALS[block.type].name.toLowerCase()} block`, "blocked");
      this.audio.action("blocked", { material: block.type });
      return;
    }
    block.hits += 1;
    const breaks = block.hits >= 3;
    this.audio.action("dig", { material: block.type, breaks });
    this.report(`${MATERIALS[block.type].name} ${breaks ? "break" : `hit ${block.hits}/3`}`, "dig");
    if (breaks) setTimeout(() => { block.hits = 0; }, 900);
  }

  jump() {
    if (!this.player.grounded || this.player.flight) return;
    this.player.vy = -480;
    this.player.grounded = false;
    this.player.airborne = true;
    this.audio.action("jump");
    this.report("Jump · runtime has no dedicated jump SFX", "movement");
  }

  startFlight() {
    if (this.player.flight) return;
    this.player.flight = true;
    this.player.grounded = false;
    this.player.airborne = true;
    this.player.vy = Math.min(this.player.vy, -110);
    this.audio.action("flight-start");
    this.report("Flight engaged · hold W/S", "flight");
  }

  stopFlight() {
    if (!this.player.flight) return;
    this.player.flight = false;
    this.audio.action("flight-stop");
    this.report("Flight released", "flight");
  }

  update(delta, now) {
    const left = this.keys.has("KeyA") || this.keys.has("ArrowLeft");
    const right = this.keys.has("KeyD") || this.keys.has("ArrowRight");
    const direction = Number(right) - Number(left);
    const acceleration = this.player.flight ? 560 : (this.player.grounded ? 1050 : 520);
    this.player.vx += direction * acceleration * delta;
    this.player.vx *= this.player.grounded ? 0.84 ** (delta * 60) : 0.97 ** (delta * 60);
    this.player.vx = Math.max(-250, Math.min(250, this.player.vx));
    if (this.player.flight) {
      const vertical = Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")) - Number(this.keys.has("KeyW") || this.keys.has("ArrowUp"));
      this.player.vy += vertical * 680 * delta;
      this.player.vy *= 0.91 ** (delta * 60);
      this.player.vy = Math.max(-230, Math.min(230, this.player.vy));
      if (now - this.lastFlightMotion > 1350 && (direction || vertical)) {
        this.audio.action("flight-motion", { pan: direction * 0.35 });
        this.lastFlightMotion = now;
      }
    } else {
      this.player.vy += 1200 * delta;
    }
    this.player.x += this.player.vx * delta;
    this.player.y += this.player.vy * delta;
    this.player.x = Math.max(24, Math.min(this.canvas.width - this.player.width - 24, this.player.x));
    const floor = 444 - this.player.height;
    if (this.player.y >= floor) {
      const landingSpeed = this.player.vy;
      this.player.y = floor;
      this.player.vy = 0;
      if (!this.player.flight) this.player.grounded = true;
      if (this.player.airborne && landingSpeed > 170) {
        this.audio.action("landing");
        this.report("Landing · candidate slot / current runtime silent", "movement");
      }
      this.player.airborne = false;
    }
    if (direction && this.player.grounded && now - this.lastStep > 900) {
      this.audio.action("footstep", { index: this.stepIndex++, pan: direction * 0.16 });
      this.lastStep = now;
    }
  }

  draw(time) {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.background.complete && this.background.naturalWidth) {
      ctx.globalAlpha = 0.34;
      ctx.drawImage(this.background, 0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
    }
    const haze = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    haze.addColorStop(0, "rgba(5,12,17,.16)");
    haze.addColorStop(1, "rgba(3,7,10,.9)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "#151a1d";
    ctx.fillRect(0, 444, this.canvas.width, 96);
    ctx.fillStyle = "#293136";
    ctx.fillRect(0, 444, this.canvas.width, 3);
    this.blocks.forEach((block) => this.drawBlock(block));
    this.drawPlayer(time);
  }

  drawBlock(block) {
    const ctx = this.context;
    const material = MATERIALS[block.type];
    ctx.fillStyle = material.color;
    ctx.fillRect(block.x, block.y, block.width, block.height);
    ctx.strokeStyle = block.type === this.selected ? "#f2c46d" : material.edge;
    ctx.lineWidth = block.type === this.selected ? 5 : 2;
    ctx.strokeRect(block.x + 2, block.y + 2, block.width - 4, block.height - 4);
    if (block.hits) {
      ctx.strokeStyle = "rgba(255,255,255,.72)";
      ctx.lineWidth = 2;
      for (let index = 0; index < block.hits; index += 1) {
        const cx = block.x + 60;
        const cy = block.y + 28 + index * 22;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 17, cy + 17);
        ctx.lineTo(cx + 5, cy + 34);
        ctx.lineTo(cx + 24, cy + 15);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(3,7,10,.75)";
    ctx.fillRect(block.x + 10, block.y + 82, 100, 26);
    ctx.fillStyle = "#f4ead9";
    ctx.font = "600 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${material.name} · ${block.hits}/3`, block.x + 60, block.y + 100);
  }

  drawPlayer(time) {
    const ctx = this.context;
    const { x, y, width, height, flight } = this.player;
    if (flight) {
      ctx.fillStyle = "rgba(94,231,216,.16)";
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height + 20, 18, 34, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.character.complete && this.character.naturalWidth >= 256) {
      const columns = Math.max(1, Math.floor(this.character.naturalWidth / 256));
      const frame = Math.floor(time / 110) % columns;
      ctx.drawImage(this.character, frame * 256, 0, 256, 256, x - 20, y - 18, 98, 98);
    } else {
      ctx.fillStyle = "#8e6b48";
      ctx.fillRect(x + 8, y + 18, width - 16, height - 18);
      ctx.fillStyle = "#d9c09a";
      ctx.fillRect(x + 16, y + 28, width - 32, 10);
    }
    ctx.fillStyle = "#f2c46d";
    ctx.font = "700 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(flight ? "FLIGHT" : "SURVIVOR", x + width / 2, y - 8);
  }

  frame(now) {
    const delta = Math.min(0.033, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(delta, now);
    this.draw(now);
    requestAnimationFrame((time) => this.frame(time));
  }

  snapshot() {
    return { player: { ...this.player }, selected: this.selected, blocks: this.blocks.map((block) => ({ type: block.type, hits: block.hits })) };
  }
}
