import { LOADING_MINING_MINIGAME_CONFIG } from "../../values/loadingMiningMinigame.js";

function clampIndex(value, maximum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(maximum, Math.floor(numeric)));
}

export class LoadingMiningMinigameState {
  constructor({
    config = LOADING_MINING_MINIGAME_CONFIG,
    random = Math.random,
  } = {}) {
    this.config = config;
    this.random = typeof random === "function" ? random : Math.random;
    this.materials = config.assets.materials;
    this.materialById = new Map(this.materials.map(material => [material.id, material]));
    this.rows = config.layout.board.rows;
    this.columns = config.layout.board.columns;
    this.board = [];
    this.selected = { row: 1, column: Math.floor(this.columns / 2) };
    this.blocksMined = 0;
    this.currentChain = 0;
    this.bestChain = 0;
    this.lastBreakAt = Number.NEGATIVE_INFINITY;
    this.reset();
  }

  reset() {
    this.blocksMined = 0;
    this.currentChain = 0;
    this.bestChain = 0;
    this.lastBreakAt = Number.NEGATIVE_INFINITY;

    const openingMaterials = this._shuffledMaterials();
    let openingIndex = 0;
    this.board = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.columns }, () => {
        const featured = openingMaterials[openingIndex++];
        return this._createCell(featured || this._chooseWeightedMaterial());
      }),
    );
    this.select(this.selected.row, this.selected.column);
    return this.getSnapshot();
  }

  _shuffledMaterials() {
    const materials = [...this.materials];
    for (let index = materials.length - 1; index > 0; index -= 1) {
      const swapIndex = clampIndex(this.random() * (index + 1), index);
      [materials[index], materials[swapIndex]] = [materials[swapIndex], materials[index]];
    }
    return materials;
  }

  _chooseWeightedMaterial() {
    const totalWeight = this.materials.reduce(
      (total, entry) => total + Math.max(0, Number(entry.weight) || 0),
      0,
    );
    let roll = this.random() * totalWeight;
    for (const entry of this.materials) {
      roll -= Math.max(0, Number(entry.weight) || 0);
      if (roll <= 0) return entry;
    }
    return this.materials[0];
  }

  _createCell(material) {
    return {
      material,
      hp: material.hp,
      maxHp: material.hp,
    };
  }

  select(row, column) {
    this.selected.row = clampIndex(row, this.rows - 1);
    this.selected.column = clampIndex(column, this.columns - 1);
    return this.getSelectedCell();
  }

  moveSelection(deltaRow, deltaColumn) {
    const row = (this.selected.row + deltaRow + this.rows) % this.rows;
    const column = (this.selected.column + deltaColumn + this.columns) % this.columns;
    return this.select(row, column);
  }

  getCell(row, column) {
    return this.board[row]?.[column] || null;
  }

  getSelectedCell() {
    return this.getCell(this.selected.row, this.selected.column);
  }

  mineSelected(nowMs) {
    return this.mine(this.selected.row, this.selected.column, nowMs);
  }

  mine(row, column, nowMs = 0) {
    const selected = this.select(row, column);
    if (!selected) return null;

    selected.hp = Math.max(0, selected.hp - 1);
    const damageRatio = 1 - selected.hp / selected.maxHp;
    if (selected.hp > 0) {
      return Object.freeze({
        kind: "hit",
        row: this.selected.row,
        column: this.selected.column,
        material: selected.material,
        hp: selected.hp,
        maxHp: selected.maxHp,
        damageRatio,
      });
    }

    const now = Number.isFinite(nowMs) ? nowMs : 0;
    const chained = now - this.lastBreakAt <= this.config.timing.chainWindowMs;
    this.currentChain = chained ? this.currentChain + 1 : 1;
    this.bestChain = Math.max(this.bestChain, this.currentChain);
    this.lastBreakAt = now;
    this.blocksMined += 1;

    const brokenMaterial = selected.material;
    const changedRows = [];
    for (let targetRow = this.selected.row; targetRow > 0; targetRow -= 1) {
      this.board[targetRow][this.selected.column] = this.board[targetRow - 1][this.selected.column];
      changedRows.push(targetRow);
    }
    this.board[0][this.selected.column] = this._createCell(this._chooseWeightedMaterial());
    changedRows.push(0);

    return Object.freeze({
      kind: "break",
      row: this.selected.row,
      column: this.selected.column,
      material: brokenMaterial,
      damageRatio: 1,
      changedRows: Object.freeze(changedRows),
      blocksMined: this.blocksMined,
      currentChain: this.currentChain,
      bestChain: this.bestChain,
      pickaxeTierIndex: this.getPickaxeTierIndex(),
    });
  }

  getPickaxeTierIndex() {
    const tiers = this.config.assets.pickaxeTiers;
    let tierIndex = 0;
    for (let index = 1; index < tiers.length; index += 1) {
      if (this.bestChain < tiers[index].minBestChain) break;
      tierIndex = index;
    }
    return tierIndex;
  }

  getSnapshot() {
    const selected = this.getSelectedCell();
    return Object.freeze({
      revision: this.config.revision,
      rows: this.rows,
      columns: this.columns,
      selected: Object.freeze({ ...this.selected }),
      selectedMaterialId: selected?.material?.id || "",
      selectedHp: selected?.hp || 0,
      blocksMined: this.blocksMined,
      currentChain: this.currentChain,
      bestChain: this.bestChain,
      pickaxeTierIndex: this.getPickaxeTierIndex(),
    });
  }
}
