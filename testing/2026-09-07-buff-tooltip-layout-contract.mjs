import assert from "node:assert/strict";
import { ApprovedHudBuffView } from "../systems/visual/ApprovedHudBuffView.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";

const measuredText = (width, height) => ({
  width, height, scaleX: 1, scaleY: 1,
  setText(text) { this.text = text; return this; },
  setScale(scale) { this.scaleX = this.scaleY = scale; return this; },
  setColor() { return this; }, setVisible() { return this; }, setX() { return this; },
});
const frame = () => ({ setVisible() { return this; }, setAlpha() { return this; } });
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x
  && a.y < b.y + b.height && a.y + a.height > b.y;
const layout = APPROVED_HUD_SKIN.layout.buffs;
const cfg = layout.tooltip;

for (const [width, height] of [[1280,720], [740,416], [1024,768]]) {
  const scale = Math.min(width / 1280, height / 720);
  const status = {x:12,y:206,width:336,height:56};
  const hardcore = {root:{visible:true},frame:{getBounds:()=>status}};
  const view = Object.assign(Object.create(ApprovedHudBuffView.prototype), {
    scene:{scale:{width,height},_hardcoreRuntime:{hud:hardcore}}, scale,
    hoveredIndex:-1, frames:Array.from({length:3},frame), icons:[null,null,null],
    texts:[260,175,110].map(width=>measuredText(width*scale,24*scale)),
    zones:Array.from({length:3},()=>({
      input:{enabled:true},setVisible(){return this;},
    })),
    tooltipTitle:measuredText(410*scale,24*scale),
    tooltipBody:measuredText(280*scale,116*scale),
    tooltipRoot:{
      setPosition(x,y){this.x=x;this.y=y;return this;},
      setVisible(visible){this.visible=visible;return this;},
    },
  });
  view.setEntries(Array.from({length:3},()=>({
    text:"A changing buff value that exceeds the chip",icon:"power",
    tooltip:{title:"A long title",body:"A long changing description"},
  })));
  for (const text of view.texts) {
    assert.ok(text.width*text.scaleX <= layout.textWidth*scale);
    assert.ok(text.height*text.scaleY <= layout.textHeight*scale);
  }
  for (let index=0;index<3;index++) {
    view._showTooltip(index);
    const bounds = {
      x:view.tooltipRoot.x-cfg.width*scale/2,
      y:view.tooltipRoot.y-cfg.height*scale/2,
      width:cfg.width*scale,height:cfg.height*scale,
    };
    assert.ok(bounds.x >= 0 && bounds.y >= 0);
    assert.ok(bounds.x+bounds.width <= width && bounds.y+bounds.height <= height);
    assert.equal(overlaps(bounds,status),false,"buff details must not cover Hardcore status");
    assert.ok(view.tooltipBody.height*view.tooltipBody.scaleY <= cfg.bodyHeight*scale);
    assert.ok(view.tooltipTitle.width*view.tooltipTitle.scaleX <= cfg.bodyWidth*scale);
    const titleBottom = cfg.titleY*scale + view.tooltipTitle.height*view.tooltipTitle.scaleY/2;
    const bodyTop = cfg.bodyY*scale - view.tooltipBody.height*view.tooltipBody.scaleY/2;
    assert.ok(bodyTop > titleBottom,"title and body occupy separate artwork wells");
  }
  hardcore.root.visible=false;
  view._showTooltip(0);
  assert.ok(Math.abs(view.tooltipRoot.y
    - (layout.y+layout.height+cfg.gap+cfg.height/2)*scale) < 1e-7,
    "Casual returns the tooltip directly below the buff lane");
  view._hideTooltip();
  assert.equal(view.tooltipRoot.visible,false);
}
console.log("PASS buff layout: fitted chip/title/body, three hover targets, Hardcore clearance, compact bounds and hover cleanup.");
