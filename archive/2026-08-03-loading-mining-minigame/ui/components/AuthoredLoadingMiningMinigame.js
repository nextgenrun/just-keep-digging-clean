import {
  getLoadingMiningMinigamePreloadAssets,
  LOADING_MINING_MINIGAME_CONFIG,
  resolveLoadingMiningMinigameEnabled,
} from "../../values/loadingMiningMinigame.js";
import { LoadingMiningMinigameState } from
  "../../systems/mining/LoadingMiningMinigameState.js";
import { AuthoredLoadingMiningBoard } from
  "./AuthoredLoadingMiningBoard.js";
import { LoadingMiningMinigameFx } from "./LoadingMiningMinigameFx.js";

export function hasAuthoredLoadingMiningAssets(
  scene,
  config = LOADING_MINING_MINIGAME_CONFIG,
  search = globalThis.location?.search || "",
) {
  return resolveLoadingMiningMinigameEnabled(search, config)
    && getLoadingMiningMinigamePreloadAssets(config, search)
      .every(asset => scene?.textures?.exists?.(asset.key));
}

export class AuthoredLoadingMiningMinigame {
  constructor(scene, {
    config = LOADING_MINING_MINIGAME_CONFIG,
    random = Math.random,
  } = {}) {
    this.scene = scene;
    this.config = config;
    this.state = new LoadingMiningMinigameState({ config, random });
    this.pointerHeld = false;
    this.paused = false;
    this.destroyed = false;
    this.board = new AuthoredLoadingMiningBoard(
      scene,
      config,
      this.state,
      {
        onSelect: (row, column) => this._select(row, column),
        onStartHold: (row, column) => this._startHold(row, column),
      },
    );
    this.root = this.board.root;
    this.cells = this.board.cells;
    this.fx = new LoadingMiningMinigameFx(scene, config, {
      cells: this.board.cells,
      hitChipPool: this.board.hitChipPool,
      debrisPool: this.board.debrisPool,
      breakBurstPool: this.board.breakBurstPool,
      pickaxe: this.board.pickaxe,
      pickaxeGhost: this.board.pickaxeGhost,
      applyCell: view => this.board.applyCell(view),
      onFxUpdate: () => this._publishDiagnostics(),
    });
    this._bindInput();
    this._select(this.state.selected.row, this.state.selected.column);
  }

  _bindInput() {
    this._stopHold = () => { this.pointerHeld = false; };
    this.scene.input.on("pointerup", this._stopHold);
    this.scene.input.on("gameout", this._stopHold);
    this.holdTimer = this.scene.time.addEvent({
      delay: this.config.timing.holdIntervalMs,
      loop: true,
      callback: () => {
        if (this.pointerHeld && !this.paused) this._mine();
      },
    });
    this.keyboardHandlers = {
      "keydown-LEFT": () => this._moveSelection(0, -1),
      "keydown-RIGHT": () => this._moveSelection(0, 1),
      "keydown-UP": () => this._moveSelection(-1, 0),
      "keydown-DOWN": () => this._moveSelection(1, 0),
      "keydown-SPACE": () => this._mine(),
      "keydown-ENTER": () => this._mine(),
    };
    Object.entries(this.keyboardHandlers).forEach(([event, handler]) => {
      this.scene.input.keyboard?.on(event, handler);
    });
    this.scene.events.once("shutdown", this.destroy, this);
  }

  _startHold(row, column) {
    if (this.paused) return;
    this._select(row, column);
    this.pointerHeld = true;
    this._mine();
  }

  _moveSelection(deltaRow, deltaColumn) {
    if (this.paused) return;
    this.state.moveSelection(deltaRow, deltaColumn);
    this._syncSelection();
  }

  _select(row, column) {
    if (this.paused) return;
    this.state.select(row, column);
    this._syncSelection();
  }

  _syncSelection() {
    this.board.syncSelection();
    this._publishDiagnostics();
  }

  _mine() {
    if (this.paused || this.destroyed) return;
    const event = this.state.mineSelected(this.scene.time.now);
    if (!event) return;
    const view = this.board.cells[event.row][event.column];
    this.fx.swingPickaxe(view, event.kind);
    if (event.kind === "hit") {
      this.board.applyCell(view);
      this.fx.animateHit(view);
    } else {
      this.fx.dropColumn(event.column, event.changedRows);
      this.board.updateCounters(event);
      this._syncSelection();
    }
    this._publishDiagnostics();
  }

  _publishDiagnostics() {
    globalThis[this.config.diagnostics.globalKey] = {
      active: !this.destroyed,
      paused: this.paused,
      assetsReady: true,
      visibleToolIcons: this.board.toolIcons.length,
      restingPickaxeVisible: this.board.pickaxe?.visible === true,
      ...this.state.getSnapshot(),
      ...(this.fx?.getSnapshot() || {}),
    };
  }

  setPaused(paused) {
    this.paused = paused === true;
    if (this.paused) this.pointerHeld = false;
    this._publishDiagnostics();
  }

  setVisible(visible) {
    this.root?.setVisible(visible === true);
    this.setPaused(visible !== true);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.paused = true;
    this.pointerHeld = false;
    this.holdTimer?.remove();
    this.fx?.destroy();
    this.scene.input.off("pointerup", this._stopHold);
    this.scene.input.off("gameout", this._stopHold);
    Object.entries(this.keyboardHandlers || {}).forEach(([event, handler]) => {
      this.scene.input.keyboard?.off(event, handler);
    });
    this.scene.events.off("shutdown", this.destroy, this);
    this.board?.destroy();
    this._publishDiagnostics();
  }
}

export function createAuthoredLoadingMiningMinigame(scene, options = {}) {
  const config = options.config ?? LOADING_MINING_MINIGAME_CONFIG;
  if (!hasAuthoredLoadingMiningAssets(
    scene,
    config,
    options.search,
  )) return null;
  return new AuthoredLoadingMiningMinigame(scene, { ...options, config });
}
