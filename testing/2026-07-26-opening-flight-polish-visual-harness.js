import { ASSET_KEYS } from "../values/assetKeys.js";
import { OPENING_FLIGHT_GOLDEN_FIVE_CONFIG } from "../values/openingFlightArtifact.js";
import { OpeningFlightGoldenFiveRewardRevealView } from "../systems/onboarding/OpeningFlightGoldenFiveRewardRevealView.js";
import { OpeningFlightGoldenFiveRouteView } from "../systems/onboarding/OpeningFlightGoldenFiveRouteView.js";

const VIEWPORT = Object.freeze({ width: 1280, height: 720 });
const BEDROCK_KEY = "opening-flight-polish-bedrock";
const BEDROCK_PATH = "../sprites/tiles/approved-world/bedrock-megalith-lock-v1.png";

class OpeningFlightPolishVisualScene extends Phaser.Scene {
  constructor() {
    super("OpeningFlightPolishVisualScene");
  }

  preload() {
    const opening = ASSET_KEYS.onboarding.openingFlightV2;
    this.load.image(opening.flightRing, `../${opening.paths.flightRing}`);
    this.load.image(opening.ascentCache, `../${opening.paths.ascentCache}`);
    this.load.image(
      opening.objectiveHudFrame,
      `../${opening.paths.objectiveHudFrame}`,
    );
    this.load.image(BEDROCK_KEY, BEDROCK_PATH);
  }

  create() {
    const config = OPENING_FLIGHT_GOLDEN_FIVE_CONFIG;
    const bedrockY = 614;
    this.add.rectangle(
      VIEWPORT.width / 2,
      VIEWPORT.height / 2,
      VIEWPORT.width,
      VIEWPORT.height,
      0x07101f,
    );
    this.add.ellipse(
      VIEWPORT.width / 2,
      bedrockY - 4,
      680,
      120,
      config.palette.cyan,
      0.055,
    );
    for (let x = 405; x <= 875; x += 94) {
      this.add.image(x, bedrockY + 47, BEDROCK_KEY).setDisplaySize(94, 94);
    }

    const fx = { burst() {} };
    this.route = new OpeningFlightGoldenFiveRouteView(this, config, fx);
    this.route.showEscapeRings([
      { x: 150, y: 178 },
      { x: 1130, y: 178 },
    ]);
    this.route.showCache({ x: VIEWPORT.width / 2, y: bedrockY });

    this.rewardReveal = new OpeningFlightGoldenFiveRewardRevealView(this, config);
    this.rewardReveal.show({
      title: config.copy.rewardRevealTitle,
      primary: "+40 GP CAPACITY  •  +125 M",
      resources: "+40 DIRT  •  +25 STONE  •  +12 COPPER",
      footer: "LEVEL 2 GUARANTEED  •  FLIGHT USES GP  •  GP REFILLS WHILE GROUNDED",
    });
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "game",
  width: VIEWPORT.width,
  height: VIEWPORT.height,
  backgroundColor: "#050a13",
  scene: [OpeningFlightPolishVisualScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
