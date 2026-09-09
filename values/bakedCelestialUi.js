// Authored source frames for talent faces, fixed copy and Star Codex medallions.
import { BAKED_CELESTIAL_FRAMES } from "./bakedCelestialFrames.js";
const base = "sprites/UI/baked-stars-talents-v2/";
const asset = id => Object.freeze({key:`ui-baked-celestial-${id}-v2`,path:`${base}${id}.png`});
export const BAKED_CELESTIAL_ASSETS = Object.freeze(Object.fromEntries([
  "talents-wayward","talents-hollow","talents-lance","labels","messages",
  ...Array.from({length:6},(_,i)=>`descriptions-${i}`),
  ...["common","uncommon","rare","epic","mythic","astral"].map(id=>`stars-${id}`),
].map(id=>[id,asset(id)])));
const frame = (assetId,id,rect) => Object.freeze({...BAKED_CELESTIAL_ASSETS[assetId],frame:id,rect:Object.freeze(rect)});
export const BAKED_TALENT_NODES = Object.freeze(Object.fromEntries(
  BAKED_CELESTIAL_FRAMES.nodes.map(node=>[node.id,Object.freeze({
    face:frame(`talents-${node.branch}`,`${node.id}-face`,node.face),
    title:frame(`talents-${node.branch}`,`${node.id}-title`,node.title),
    name:frame(`talents-${node.branch}`,`${node.id}-name`,node.name),
    card:frame(`descriptions-${node.page}`,`${node.id}-card`,node.card),
    base:frame(`descriptions-${node.page}`,`${node.id}-base`,node.base),
  })]),
));
export const BAKED_CELESTIAL_LABELS = Object.freeze(Object.fromEntries(
  BAKED_CELESTIAL_FRAMES.labels.map(label=>[label.text,frame("labels",`label-${label.text}`,label.glyph)]),
));
export const BAKED_CELESTIAL_MESSAGES = Object.freeze(Object.fromEntries(
  BAKED_CELESTIAL_FRAMES.messages.map(message=>[message.text,frame("messages",`message-${message.index}`,message.glyph)]),
));
export const BAKED_STAR_ATLASES = Object.freeze(
  BAKED_CELESTIAL_FRAMES.stars.map(({rarity,rects})=>Object.freeze({
    ...BAKED_CELESTIAL_ASSETS[`stars-${rarity}`],
    frames:Object.freeze(rects.map((rect,index)=>frame(`stars-${rarity}`,`star-${index}`,rect))),
  })),
);
export const BAKED_TALENT_ASSETS = Object.freeze(Object.entries(BAKED_CELESTIAL_ASSETS)
  .filter(([id])=>!id.startsWith("stars-")).map(([,entry])=>entry));
export const BAKED_CELESTIAL_LAYOUT = Object.freeze({
  nodeLabelWidth:92,nodeLabelHeight:14,nodeLabelOffset:15,nodeValueOffset:-11,nodeStatusGap:6,
  detailNameY:0.904,detailRankY:0.936,detailBodyHeight:52,detailStatusHeight:58,
  detailNameHeight:26,detailRankLabelOffset:-36,detailRankValueOffset:18,
  tooltipWidth:460,tooltipHeight:360,tooltipCardY:-62,tooltipCardHeight:230,tooltipBottomYFraction:0.84,
  tooltipFooterY:105,tooltipFooterHeight:150,
  tooltipChoiceY:65,tooltipChoiceWidth:250,tooltipChoiceHeight:18,
  tooltipRankY:92,tooltipRankLabelX:-150,tooltipRankValueX:-89,
  tooltipCostLabelX:27,tooltipCostValueX:94,tooltipCostUnitX:154,
  tooltipStatusY:128,tooltipStatusWidth:410,tooltipStatusHeight:40,
  statusLabelHeight:16,statusLineGap:26,statusNumberSize:18,
  prerequisiteNameHeight:15,prerequisiteGap:22,
  metadataFontSize:16,headerValueWidth:112,headerValueHeight:24,
  maximumSourceScale:1,
  glyphAssetKeys:Object.freeze([BAKED_CELESTIAL_ASSETS.labels.key,BAKED_CELESTIAL_ASSETS.messages.key]),
  glyphFrameSuffixes:Object.freeze(["-base","-name"]),
});
export const BAKED_STAR_LAYOUT = Object.freeze({
  emptyDossierRect:Object.freeze([880,150,817,689]),
  emptyDossierFrame:"empty-dossier-baked-v2",
  foundX:390,pageX:540,pageY:785,pageValueWidth:125,
  colourLabelValueX:1160,starValueX:1604,colourY:466,colourWidth:276,starWidth:90,
  lightValueX:1140,depthValueX:1583,metadataY:686,lightWidth:286,depthWidth:160,
  badgeY:360,badgeWidth:104,badgeHeight:58,nameWidth:690,nameHeight:34,flavourHeight:125,
  headerLabelWidth:90,headerLabelHeight:12,headerGroupSpacing:235,headerValueOffset:98,
  headerValueColour:"#D7DFE6",
  headerLabelOffset:-43,headerValueWidth:116,
  motionPeriodMs:6200,motionPhaseStride:0.71,motionMinimum:220,motionRange:35,
});
