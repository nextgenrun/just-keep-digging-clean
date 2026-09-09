// Global collection counters beside authored FOUND and COLLECTED labels.
import { BAKED_STAR_LAYOUT } from "../../values/bakedCelestialUi.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { fitLiveUiText } from "../../systems/visual/bakedUiArt.js";
import { addCelestialLabel } from "./bakedCelestialUi.js";

export function renderBakedStarAtlasHeader(scene,shell,found,total,collected) {
  const g = BAKED_STAR_LAYOUT;
  shell.subtitleText.setVisible(false);
  [["FOUND",`${found} / ${total}`],["COLLECTED",String(collected)]].forEach(([label,value],index)=>{
    const x=shell.subtitleText.x + index * g.headerGroupSpacing;
    const y=shell.subtitleText.y;
    addCelestialLabel(scene,shell.content,label,x,y,g.headerLabelWidth,g.headerLabelHeight)?.setOrigin(0,0.5);
    const text=scene.add.text(x+g.headerValueOffset,y,value,{
      fontFamily:UI_FONTS.mono,fontSize:g.headerLabelHeight,color:g.headerValueColour,
    }).setOrigin(0,0.5);
    fitLiveUiText(text,g.headerValueWidth,g.headerLabelHeight);
    shell.content.add(text);
  });
}
