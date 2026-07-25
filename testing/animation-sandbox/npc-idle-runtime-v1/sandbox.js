const NPCS = [
  ['Money Monster', 'money-monster-idle-alpha.webm'],
  ['Player Upgrades', 'player-upgrades-idle-alpha.webm'],
  ['Gear Merchant', 'gear-merchant-idle-alpha.webm'],
  ['Bobo Merchant', 'bobo-merchant-idle-alpha.webm'],
  ['Gem Power Merchant', 'gem-power-merchant-idle-alpha.webm'],
];

const BASE = '../../../sprites/npc/npc-v6-animated/merchant-idle';
const SIZE = 230;

class NpcIdleRuntimeScene extends Phaser.Scene {
  constructor() {
    super('NpcIdleRuntimeScene');
  }

  preload() {
    NPCS.forEach(([, filename], index) => this.load.video(`npc-video-${index}`, `${BASE}/${filename}`, true));
  }

  create() {
    this.cameras.main.setBackgroundColor('#0c0911');
    this.drawCheckerboard();
    this.add.text(40, 24, 'NPC IDLE RUNTIME · PHASER VIDEO OBJECTS', {
      fontFamily: 'Consolas, monospace', fontSize: '22px', color: '#f4dfae',
    });
    this.status = this.add.text(1240, 28, 'Loading 0 / 5', {
      fontFamily: 'Consolas, monospace', fontSize: '17px', color: '#8bd4ff',
    }).setOrigin(1, 0);
    this.readyCount = 0;

    NPCS.forEach(([label], index) => {
      const row = index < 3 ? 0 : 1;
      const column = row === 0 ? index : index - 3;
      const x = row === 0 ? 235 + column * 405 : 438 + column * 405;
      const y = row === 0 ? 320 : 610;
      const video = this.add.video(x, y, `npc-video-${index}`).setOrigin(0.5, 1).setDepth(2);
      video.once('created', () => {
        video.setDisplaySize(SIZE, SIZE);
        this.readyCount += 1;
        this.status.setText(`Playing ${this.readyCount} / ${NPCS.length}`);
        if (this.readyCount === NPCS.length) this.status.setColor('#7effaa');
      });
      video.setDisplaySize(SIZE, SIZE);
      video.play(true);
      this.add.text(x, y + 12, label, {
        fontFamily: 'Consolas, monospace', fontSize: '17px', color: '#d9c48f',
      }).setOrigin(0.5, 0).setDepth(3);
    });
  }

  drawCheckerboard() {
    const graphics = this.add.graphics().setDepth(0);
    const size = 40;
    for (let y = 0; y < 720; y += size) {
      for (let x = 0; x < 1280; x += size) {
        graphics.fillStyle(((x / size + y / size) % 2) ? 0x18131f : 0x241c2c, 1);
        graphics.fillRect(x, y, size, size);
      }
    }
    graphics.fillStyle(0x08060b, 0.82);
    graphics.fillRect(0, 0, 1280, 68);
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: 1280,
  height: 720,
  transparent: true,
  render: { antialias: true },
  scene: [NpcIdleRuntimeScene],
});
