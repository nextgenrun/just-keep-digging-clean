import { AUDIO_MIX_REVIEW } from "../../../values/audioMixReview.js";
import { AUDIO_MIX_REVIEW_FLOW } from "../../../values/audioMixReviewFlow.js";
import { buildAudioReviewPanelLayout } from "./audioReviewPanelLayout.js?v=20260901-audio13";

const COLORS = Object.freeze({
  panel: 0x071019,
  card: 0x0c1822,
  border: 0x385267,
  button: 0x172735,
  hover: 0x244158,
  active: 0x5f3a86,
  approved: 0x1c644b,
  rejected: 0x74313c,
  pass: "#7fe2aa",
  danger: "#ff8190",
  warning: "#ffc46b",
  text: "#eaf6ff",
  muted: "#9eb0bd",
});

const cleanSourceLabel = label => label.replace(/^[ABC] · /, "");

export class AudioReviewPanel {
  constructor(
    scene,
    callbacks,
    config = AUDIO_MIX_REVIEW,
    flow = AUDIO_MIX_REVIEW_FLOW,
  ) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.config = config;
    this.flow = flow;
    this.buttons = new Map();
    this.latestSnapshot = null;
    this.lastSyncedCategoryId = null;
    this.lastSyncedItemId = null;
    this.itemCategoryById = new Map();
    this.itemPageByCategory = new Map();
    for (const category of flow.categories) {
      this.itemPageByCategory.set(category.id, 0);
      for (const itemId of category.itemIds) {
        this.itemCategoryById.set(itemId, category.id);
      }
    }
    this._build();
  }

  update(snapshot) {
    this.latestSnapshot = snapshot;
    this._syncItemPage(snapshot);
    this._updateButtons(snapshot);
    this._updateNowPlaying(snapshot);
    this._updateAudibleSignals(snapshot);
    this._updateDecisionSummary(snapshot);
  }

  destroy() {
    this.container.destroy(true);
  }

  _updateButtons(snapshot) {
    const { review } = snapshot;
    const approved = this.flow.decisions.approved;
    const rejected = this.flow.decisions.rejected;
    for (const [id, entry] of this.buttons) {
      let enabled = true;
      if (entry.role === "scenario") {
        const category = this.flow.categories.find(item => item.id === review.categoryId);
        const index = category?.itemIds.indexOf(id) ?? -1;
        const page = this.itemPageByCategory.get(review.categoryId) || 0;
        const visible = this.itemCategoryById.get(id) === review.categoryId
          && Math.floor(index / this.flow.itemPageSize) === page;
        entry.button.setVisible(visible);
        entry.button.input.enabled = visible;
        const decision = review.decisions[id];
        const symbol = decision === approved ? "✓" : decision === rejected ? "×" : "○";
        const scenario = this.config.scenarios[id];
        entry.text.setText(`${symbol} ${scenario.shortLabel || scenario.label}`);
      }
      if (entry.role === "decision") enabled = review.currentItemId !== null;
      if (entry.role === "page") {
        const pageInfo = this._getPageInfo(review.categoryId);
        enabled = id === "page:previous"
          ? pageInfo.page > 0
          : pageInfo.page < pageInfo.pageCount - 1;
        entry.button.input.enabled = enabled;
      }
      entry.button.setAlpha(enabled ? 1 : 0.42);
      entry.background.setFillStyle(this._buttonFill(id, entry.role, snapshot), 0.98);
    }
    const pageInfo = this._getPageInfo(review.categoryId);
    this.itemPageText.setText(
      `PAGE ${pageInfo.page + 1}/${pageInfo.pageCount} · ${pageInfo.itemCount} ITEMS`,
    );
  }

  _updateNowPlaying(snapshot) {
    const { audio, review } = snapshot;
    if (!review.currentItemId) {
      this.currentTitleText.setText("CHOOSE A REVIEW ITEM");
      this.currentMetaText.setText(this.flow.copy.chooseItem);
      this.playStateText.setText(this.flow.copy.noSound).setColor(COLORS.muted);
      return;
    }
    const scenario = this.config.scenarios[review.currentItemId];
    const sourceCollections = [...scenario.loops, ...scenario.oneShots]
      .map(entry => this.config.sources[entry.sourceId]?.collection)
      .filter(Boolean);
    const collection = [...new Set(sourceCollections)].join(" + ");
    this.currentTitleText.setText(scenario.label.toUpperCase());
    this.currentMetaText.setText(
      `${review.currentKind} · ITEM ${review.itemIndex + 1}/${review.categoryItemCount}`
        + (collection ? ` · ${collection}` : ""),
    );
    let state = "READY · CLICK PLAY AGAIN";
    let color = COLORS.pass;
    const liveLoops = audio.activeLoops.filter(loop => !loop.fadingOut && loop.output > 0.0005);
    const latestHit = [...audio.oneShotEvents].reverse().find(
      event => event.scenarioId === snapshot.scenarioId,
    );
    if (audio.audioLocked) {
      state = "AUDIO LOCKED · CLICK PLAY AGAIN OR AN ITEM";
      color = COLORS.warning;
    } else if (audio.muted) {
      state = "MUTED · PRESS M TO HEAR THIS ITEM";
      color = COLORS.warning;
    } else if (liveLoops.length) {
      state = `PLAYING · ${liveLoops.length} LOOP BED${liveLoops.length === 1 ? "" : "S"}`;
    } else if (audio.pendingOneShotCount) {
      state = `PLAYING · ${audio.pendingOneShotCount} HIT${audio.pendingOneShotCount === 1 ? "" : "S"} QUEUED`;
    } else if (latestHit) {
      state = `PLAYED · HIT ${latestHit.sequenceIndex}/${latestHit.sequenceTotal}`;
    }
    this.playStateText.setText(state).setColor(color);
  }

  _updateAudibleSignals(snapshot) {
    const { audio } = snapshot;
    if (!snapshot.review.currentItemId) {
      this.activeText.setText(["Nothing active. Select a named review item."]);
      return;
    }
    const lines = audio.activeLoops
      .filter(loop => loop.output > 0.0005)
      .map(loop => (
        `${loop.fadingOut ? "FADING" : "LOOP"} · ${cleanSourceLabel(loop.label)}`
          + ` · ${loop.output.toFixed(3)}`
      ));
    const latestHit = [...audio.oneShotEvents].reverse().find(
      event => event.scenarioId === snapshot.scenarioId,
    );
    if (latestHit) {
      const source = this.config.sources[latestHit.sourceId];
      const sequence = latestHit.sequenceTotal > 1
        ? `HIT ${latestHit.sequenceIndex}/${latestHit.sequenceTotal}`
        : "LAST HIT";
      lines.push(
        `${sequence} · ${cleanSourceLabel(source.label)} · ${latestHit.output.toFixed(3)}`,
      );
    }
    if (audio.pendingOneShotCount) {
      lines.push(`QUEUED · ${audio.pendingOneShotCount} remaining in this item`);
    }
    this.activeText.setText((lines.length ? lines : ["Ready. Click PLAY AGAIN."]).slice(0, 4));
  }

  _updateDecisionSummary(snapshot) {
    const { review, audio } = snapshot;
    const current = review.currentDecision;
    this.decisionStatusText.setText(
      current ? `STATUS · ${current.toUpperCase()}` : "STATUS · NOT REVIEWED",
    );
    this.decisionStatusText.setColor(
      current === this.flow.decisions.approved
        ? COLORS.pass
        : current === this.flow.decisions.rejected ? COLORS.danger : COLORS.muted,
    );
    const errors = snapshot.loadErrors.length + audio.errors.length;
    this.sessionText.setText([
      `DECISIONS  ${review.summary.approved} APPROVED · ${review.summary.rejected} REJECTED · ${review.summary.open} OPEN`,
      `LIBRARY  ${snapshot.loadedSourceCount}/${snapshot.sourceCount} PLAYABLE · ${snapshot.libraryExpansion?.onlineCandidateCount || 0} ONLINE LEADS`,
      errors
        ? `ERRORS ${errors} · CHECK LOAD / PLAYBACK`
        : `GAIN ${audio.estimatedPeak.toFixed(3)}/${audio.peakBudget.toFixed(2)} ${audio.withinBudget ? "PASS" : "HOT"}`,
    ]);
    this.sessionText.setColor(errors || !audio.withinBudget ? COLORS.danger : COLORS.pass);
  }

  _build() {
    buildAudioReviewPanelLayout(this, COLORS);
  }

  _syncItemPage(snapshot) {
    const { review } = snapshot;
    const categoryChanged = review.categoryId !== this.lastSyncedCategoryId;
    const itemChanged = review.currentItemId !== this.lastSyncedItemId;
    if (categoryChanged) this.itemPageByCategory.set(review.categoryId, 0);
    if (review.itemIndex >= 0 && itemChanged) {
      this.itemPageByCategory.set(
        review.categoryId,
        Math.floor(review.itemIndex / this.flow.itemPageSize),
      );
    }
    this.lastSyncedCategoryId = review.categoryId;
    this.lastSyncedItemId = review.currentItemId;
  }

  _getPageInfo(categoryId) {
    const category = this.flow.categories.find(item => item.id === categoryId);
    const itemCount = category?.itemIds.length || 0;
    const pageCount = Math.max(1, Math.ceil(itemCount / this.flow.itemPageSize));
    const page = Math.max(
      0,
      Math.min(pageCount - 1, this.itemPageByCategory.get(categoryId) || 0),
    );
    return { page, pageCount, itemCount };
  }

  _stepItemPage(offset) {
    const categoryId = this.latestSnapshot?.review?.categoryId;
    if (!categoryId) return false;
    const pageInfo = this._getPageInfo(categoryId);
    const nextPage = Math.max(
      0,
      Math.min(pageInfo.pageCount - 1, pageInfo.page + offset),
    );
    if (nextPage === pageInfo.page) return false;
    this.itemPageByCategory.set(categoryId, nextPage);
    this._updateButtons(this.latestSnapshot);
    return true;
  }

  _buttonFill(id, role, snapshot) {
    if (!snapshot) return COLORS.button;
    const { review } = snapshot;
    if (role === "category" && id === `category:${review.categoryId}`) return COLORS.active;
    if (role === "scenario") {
      if (id === review.currentItemId) return COLORS.active;
      if (review.decisions[id] === this.flow.decisions.approved) return COLORS.approved;
      if (review.decisions[id] === this.flow.decisions.rejected) return COLORS.rejected;
    }
    if (role === "decision" && id === `decision:${review.currentDecision}`) {
      return review.currentDecision === this.flow.decisions.approved
        ? COLORS.approved
        : COLORS.rejected;
    }
    return COLORS.button;
  }

  _section(x, y, label) {
    return this._text(x, y, label, 11, "#8dc8ed", "bold");
  }

  _text(x, y, copy, size, color, style = "normal", width = 330, lineSpacing = 4) {
    const text = this.scene.add.text(x, y, copy, {
      fontFamily: "Arial, sans-serif",
      fontSize: `${size}px`,
      fontStyle: style,
      color,
      lineSpacing,
      wordWrap: { width },
    }).setOrigin(0, 0);
    this.container.add(text);
    return text;
  }

  _button(id, x, y, width, height, label, callback, role) {
    const background = this.scene.add.rectangle(0, 0, width, height, COLORS.button, 0.98)
      .setStrokeStyle(1, COLORS.border, 1);
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
      color: COLORS.text,
      align: "center",
    }).setOrigin(0.5);
    const button = this.scene.add.container(x + width / 2, y + height / 2, [background, text])
      .setSize(width, height)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, width, height),
        Phaser.Geom.Rectangle.Contains,
      )
      .on("pointerover", () => background.setFillStyle(COLORS.hover, 1))
      .on("pointerout", () => (
        background.setFillStyle(this._buttonFill(id, role, this.latestSnapshot), 0.98)
      ))
      .on("pointerup", callback);
    button.input.cursor = "pointer";
    this.container.add(button);
    this.buttons.set(id, { button, background, text, role });
    return button;
  }
}
