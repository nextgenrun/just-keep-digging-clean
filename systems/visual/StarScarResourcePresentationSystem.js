import { STAR_SANCTUARY_CONFIG } from "../../values/starSanctuary.js";
import { StarScarResourceCollapseFxSystem } from
  "./StarScarResourceCollapseFxSystem.js";

export class StarScarResourcePresentationSystem {
  constructor(
    scene,
    worldModel,
    territorySystem,
    config = STAR_SANCTUARY_CONFIG,
  ) {
    this.scene = scene;
    this.config = config;
    this.owners = [...new Set([
      scene.worldRenderer,
      scene.levelOneGroundFacadeSystem,
      scene.worldScenicFacadeSystem,
    ].filter(Boolean))];
    this.provider = ({ tileX, tileY } = {}) => {
      const runtime = this.scene?._starSanctuaryRuntime;
      if (runtime?.system?.enabled !== true) return false;
      return runtime?.view?.isResourceCollapsedAt?.(
        tileX,
        tileY,
        this.scene?.time?.now || 0,
      ) ?? (runtime?.system?.isResourceDepletedAt?.(tileX, tileY) === true);
    };
    this.collapseFx = new StarScarResourceCollapseFxSystem(
      scene,
      worldModel,
      territorySystem,
      config,
    );
    this.runtimeReady = false;
    this.activeSiteKey = "";
    this.nextRefreshAt = 0;
  }

  create() {
    for (const owner of this.owners) {
      owner.setResourceDepletionProvider?.(this.provider);
    }
    this._refresh();
    return true;
  }

  update(nowMs) {
    const runtime = this.scene?._starSanctuaryRuntime;
    const ready = Boolean(runtime?.system?.enabled && runtime?.view);
    if (ready !== this.runtimeReady) {
      this.runtimeReady = ready;
      this._refresh();
    }
    const spread = ready ? runtime.view.activeSpread : null;
    const siteKey = spread?.siteKey || "";
    const interval = Math.max(
      1,
      Number(
        this.config.scar.resourceDepletion.presentation.refreshIntervalMs,
      ) || 1,
    );
    if (siteKey && siteKey !== this.activeSiteKey) {
      this.activeSiteKey = siteKey;
      this.collapseFx.play({
        key: siteKey,
        tx: spread.tx,
        ty: spread.ty,
      });
      this.nextRefreshAt = nowMs + interval;
      this._refresh();
    }
    if (spread && nowMs >= this.nextRefreshAt) {
      this.nextRefreshAt = nowMs + interval;
      this._refresh();
    }
    if (!spread && this.activeSiteKey) {
      this.activeSiteKey = "";
      this._refresh();
    }
  }

  _refresh() {
    for (const owner of this.owners) {
      owner.invalidateResourcePresentation?.();
    }
  }

  getSnapshot() {
    return {
      runtimeReady: this.runtimeReady,
      spreadActive: Boolean(this.activeSiteKey),
      ...this.collapseFx.getSnapshot(),
    };
  }

  destroy() {
    for (const owner of this.owners) {
      if (owner.resourceDepletionProvider === this.provider) {
        owner.setResourceDepletionProvider?.(null);
      }
    }
    this.collapseFx.destroy();
    this.owners = [];
    this.provider = null;
    this.scene = null;
  }
}
