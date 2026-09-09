import { SIGNAL_REWARDS } from "../../values/signalRisk.js";
import { signalGiftRequirement } from "../events/signalRiskRules.js";
import { SIGNAL_MIA } from "../../values/signalMia.js";
import { SIGNAL_EVENT as cfg } from "../../values/signalEvent.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { SignalGiftView } from "./SignalGiftView.js";
import { isHardcoreMode } from "../../values/hardcoreMode.js";
import { createBakedUiPanel } from "./bakedUiArt.js";

export class SignalCinematicView {
  constructor(scene, voice, choose) {
    this.scene = scene; this.voice = voice; this.choose = choose; this.root = null;
    this.phase = "closed"; this.buttons = []; this.lineRemaining = 0; this.afterLine = null;
    this.gift = new SignalGiftView(this);
    this.onKey = event => this.key(event);
    this.onUpdate = (_time, delta) => this.update(delta);
  }
  get isVisible() { return Boolean(this.root); }
  text(x, y, value, size = cfg.cinema.subtitleSize, width = null) {
    const font = APPROVED_HUD_SKIN.font;
    return this.scene.add.text(x, y, value, { fontFamily: font.family, fontSize: size,
      color: font.color, stroke: font.shadow, strokeThickness: 3, align: "center",
      ...(width ? { wordWrap: { width } } : {}) }).setOrigin(0.5);
  }
  button(x, y, width, height, label, action) {
    const container = this.scene.add.container(x, y);
    const art = createBakedUiPanel(this.scene, 0, 0, width, height)
      || this.scene.add.image(0, 0, cfg.cue.panel).setDisplaySize(width, height);
    const text = this.text(0, 0, label, cfg.cinema.buttonSize, width - 32);
    const hit = this.scene.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", (_p, _x, _y, event) => { event?.stopPropagation?.(); action(); });
    hit.on("pointerover", () => art.setTint(0xc9e8e6));
    hit.on("pointerout", () => art.clearTint());
    container.add([art, text, hit]); return container;
  }
  open(active, survivor) {
    if (this.root) return false;
    this.survivor = survivor; this.activeId = active.id; this.startedDepth = active.startedDepth;
    const c = cfg.cinema;
    this.root = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(c.depth);
    const shade = this.scene.add.rectangle(0, 0, c.width / c.margin, c.height / c.margin, c.shade, c.shadeAlpha).setInteractive();
    this.shade = shade;
    this.root.add(shade);
    // Three framed shots use the same camp and poses as the world encounter.
    this.strip = this.scene.add.container(c.portraitX, c.stripY);
    this.shots = [];
    c.shots.forEach((layout, index) => {
      const shot = this.scene.add.container(layout.x, 0);
      const frame = createBakedUiPanel(this.scene, 0, 0, layout.width, c.shotHeight);
      if (frame) shot.add(frame);
      if (this.scene.textures.exists(cfg.camp.key)) shot.add(this.scene.add.image(0, c.shotCampY, cfg.camp.key)
        .setDisplaySize(layout.width - c.shotInset, (layout.width - c.shotInset) * c.shotCampRatio).setAlpha(c.shotCampAlpha));
      const portrait = this.scene.add.image(0, c.shotPortraitY, survivor.sheet, "portrait-" + (index === 0 ? cfg.art.pose.call : index === 2 ? cfg.art.pose.guard : cfg.art.pose.rest));
      portrait.setScale(Math.min((layout.width - c.shotInset) / portrait.width, c.shotPortraitHeight / portrait.height));
      shot.add(portrait); shot.setAlpha(index === 1 ? 1 : c.shotSideAlpha);
      this.strip.add(shot); this.shots.push({ root: shot, portrait });
    });
    this.portrait = this.shots[1].portrait;
    this.root.add(this.strip);
    this.heading = this.text(c.titleX + c.subtitleWidth / 2, c.titleY, survivor.name.toUpperCase(), c.titleSize);
    this.role = this.text(c.titleX + c.subtitleWidth / 2, c.roleY, survivor.role, c.roleSize);
    this.caption = this.text(c.titleX + c.subtitleWidth / 2, c.subtitleY, "", c.subtitleSize, c.subtitleWidth);
    this.footer = this.text(0, c.footerY, "", c.detailSize, c.width - 40);
    this.root.add([this.heading, this.role, this.caption, this.footer]);
    this.scene._randomEventModalVisible = true;
    this.controlsWereEnabled = this.scene.playerController?.input?.controlsEnabled !== false;
    this.scene.playerController?.setControlsEnabled?.(false);
    this.scene.uiNotifications?.setPaused?.(true);
    this.scene.input.keyboard.on("keydown", this.onKey);
    this.scene.events.on("postupdate", this.onUpdate);
    this.resize();
    this.phase = "intro";
    this.speak("intro", () => this.speak("request", () => this.showChoices()));
    return true;
  }
  speak(kind, done) {
    if (!this.voice.canStart()) { this.pendingSpeech = { kind, done }; return; }
    this.pendingSpeech = null;
    const clip = this.voice.play(this.survivor, kind);
    this.caption.setText(this.survivor.kind === "dog" ? clip.text : '“' + clip.text + '”');
    this.lineRemaining = Math.max(cfg.cinema.minimumLineMs, clip.durationMs) + cfg.cinema.lineGapMs;
    this.afterLine = done;
    this.lineTimer?.remove(false);
    this.lineTimer = this.scene.time.delayedCall(this.lineRemaining, () => {
      const callback = this.afterLine; this.afterLine = null; this.lineTimer = null;
      if (this.root) callback?.();
    });
    this.setPortraitPose(kind === "gift" ? cfg.art.pose.gift : kind === "attack" || kind === "loss" ? cfg.art.pose.guard : cfg.art.pose.rest);
  }
  setPortraitPose(pose) {
    const c = cfg.cinema, p = this.portrait;
    p.setFrame("portrait-" + pose);
    p.setScale(Math.min((c.shots[1].width - c.shotInset) / p.width, c.shotPortraitHeight / p.height));
  }
  clearButtons() { this.buttons.forEach(b => b.destroy(true)); this.buttons = []; }
  addChoice(x, label, callback, width = cfg.cinema.choiceWidth) {
    const b = this.button(x, cfg.cinema.choicesY, width, cfg.cinema.choiceHeight, label, callback);
    this.root.add(b); this.buttons.push(b);
  }
  showChoices() {
    this.gift.destroy(); this.clearButtons(); this.phase = "choice";
    const c = cfg.cinema;
    this.strip.setVisible(true); this.role.setVisible(true);
    this.heading.setText(this.survivor.name.toUpperCase());
    const dog = this.survivor.kind === "dog";
    this.caption.setText(dog ? SIGNAL_MIA.copy.request : '“' + this.survivor.lines.request + '”').setVisible(true);
    this.footer.setText(dog ? SIGNAL_MIA.copy.footer : SIGNAL_REWARDS.copy.giftHint + "\n1: GIVE SUPPLIES · 2: ATTACK · 3 / ESC: LEAVE");
    this.addChoice(-c.choiceGap, dog ? SIGNAL_MIA.copy.rescue : cfg.copy.give, () => dog ? this.submit("rescue") : this.showGift());
    this.addChoice(0, (dog ? SIGNAL_MIA.copy.killTitle : cfg.copy.killTitle) + "\n" + cfg.copy.kill, () => this.showRisk());
    this.addChoice(c.choiceGap, dog ? SIGNAL_MIA.copy.leave : cfg.copy.ignore, () => this.submit("ignore"));
  }
  showRisk() {
    this.clearButtons(); this.phase = "risk"; this.voice.stop();
    this.setPortraitPose(cfg.art.pose.guard);
    const hardcore = isHardcoreMode(this.scene._hardcoreRuntime?.system?.state);
    this.caption.setText((this.survivor.kind === "dog" ? SIGNAL_MIA.copy.risk : cfg.copy.risk) + "\n\n" + (hardcore ? cfg.copy.hardcoreRisk : cfg.copy.casualRisk)
      + "\n\nIf you survive: +" + cfg.rewardStars + " STARPOWER.");
    this.footer.setText("ENTER: ATTACK · ESC: GO BACK");
    this.addChoice(-180, cfg.copy.back, () => this.showChoices());
    this.addChoice(180, cfg.copy.confirmAttack, () => this.submit("attack"));
  }
  showGift() {
    this.clearButtons(); this.phase = "gift"; this.voice.stop();
    this.strip.setVisible(false); this.caption.setVisible(false); this.role.setVisible(false);
    this.heading.setText(cfg.copy.giftTitle);
    this.gift.show(this.scene.digSystem.getResourceTotals());
    this.footer.setText(SIGNAL_REWARDS.copy.giftRequirement(signalGiftRequirement(this.scene.digSystem.getResourceTotals(), this.startedDepth)) + "\n" + cfg.copy.giftFooter);
    this.addChoice(-190, cfg.copy.back, () => this.showChoices());
    this.addChoice(190, cfg.copy.giftSubmit, () => this.submit("give", this.gift.amounts));
  }
  async submit(choice, amounts = {}) {
    if (!["choice", "risk", "gift"].includes(this.phase)) return;
    const previous = this.phase;
    this.phase = "saving"; this.footer.setText("...");
    try {
      const result = await this.choose(choice, amounts);
      if (!this.root) return;
      this.gift.destroy(); this.clearButtons(); this.phase = "result";
      this.strip.setVisible(true); this.caption.setVisible(true); this.role.setVisible(true);
      this.heading.setText(this.survivor.name.toUpperCase());
      this.footer.setText("");
      const kind = choice === "give" || choice === "rescue" ? "gift" : choice === "ignore" ? "ignore" : result.fatal ? "loss" : "attack";
      this.speak(kind, () => {
        if (!this.root) return;
        if (result.fatal) { this.close(); void result.afterClose?.(); return; }
        this.caption.setText(result.message);
        this.addChoice(0, cfg.copy.continue, () => { this.close(); void result.afterClose?.(); });
        this.footer.setText("ENTER / ESC: CONTINUE");
        this.afterResult = result.afterClose;
      });
    } catch (error) {
      this.phase = previous; this.footer.setText(error.message || cfg.copy.savedError);
    }
  }
  key(event) {
    if (!this.root || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault?.(); event.stopPropagation?.();
    const key = event.key;
    if (this.phase === "intro" && (key === "Escape" || key === "Enter")) {
      this.voice.stop(); this.lineTimer?.remove(false); this.lineTimer = null;
      this.pendingSpeech = null; this.afterLine = null; this.showChoices(); return;
    }
    if (this.phase === "choice") {
      if (key === "1") this.survivor.kind === "dog" ? void this.submit("rescue") : this.showGift();
      if (key === "2") this.showRisk();
      if (key === "3" || key === "Escape") void this.submit("ignore");
    } else if (this.phase === "risk") {
      if (key === "Escape") this.showChoices();
      if (key === "Enter") void this.submit("attack");
    } else if (this.phase === "gift") {
      if (key === "Escape") this.showChoices();
      else if (key === "Enter") void this.submit("give", this.gift.amounts);
      else this.gift.key(event);
    } else if (this.phase === "result" && !this.afterLine && (key === "Enter" || key === "Escape")) {
      const callback = this.afterResult; this.close(); void callback?.();
    }
  }
  update(delta) {
    if (!this.root) return;
    this.resize(); this.voice.position(0, 0);
    if (this.pendingSpeech && this.voice.canStart()) this.speak(this.pendingSpeech.kind, this.pendingSpeech.done);
    this.lineRemaining = this.lineTimer?.getRemaining?.() || 0;
  }
  resize() {
    const c = cfg.cinema;
    const scale = Math.min(1, this.scene.scale.width * c.margin / c.width, this.scene.scale.height * c.margin / c.height);
    this.root?.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2).setScale(scale);
    this.shade?.setSize(this.scene.scale.width / scale, this.scene.scale.height / scale);
  }
  close() {
    if (!this.root) return;
    this.voice.stop(); this.lineTimer?.remove(false); this.lineTimer = null;
    this.pendingSpeech = null; this.afterLine = null; this.afterResult = null;
    this.gift.destroy(); this.clearButtons();
    this.scene.input.keyboard.off("keydown", this.onKey);
    this.scene.events.off("postupdate", this.onUpdate);
    this.root.destroy(true); this.root = null; this.phase = "closed"; this.lineRemaining = 0;
    this.scene._randomEventModalVisible = false;
    if (this.controlsWereEnabled && this.scene.gameState === "playing") this.scene.playerController?.setControlsEnabled?.(true);
    this.controlsWereEnabled = false;
    this.scene.uiNotifications?.setPaused?.(false);
  }
  destroy() { this.close(); this.scene = null; }
}
