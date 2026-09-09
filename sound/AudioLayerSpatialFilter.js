import { REVIEWED_AUDIO_MIX } from "../values/reviewedAudioMix.js";

/** Optional low-pass insert on one owned Phaser sound, never the shared master. */
export function installLayerSpatialFilter(sound, manager, cutoff, type = "lowpass", q = REVIEWED_AUDIO_MIX.spatialFilterQ) {
  if (!Number.isFinite(cutoff) || !sound.volumeNode || !manager.context?.createBiquadFilter) return null;
  const destination = sound.spatialNode || sound.pannerNode || manager.destination;
  if (!destination) return null;
  const filter = manager.context.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.value = cutoff;
  try {
    sound.volumeNode.disconnect(destination);
    sound.volumeNode.connect(filter);
    filter.connect(destination);
    return filter;
  } catch (_) {
    try { sound.volumeNode.connect(destination); filter.disconnect(); } catch (_) {}
    return null;
  }
}

export function updateLayerSpatialFilter(track, layer, manager) {
  if (Number.isFinite(layer?.pan)) track.sound.setPan?.(layer.pan);
  if (track.filter && Number.isFinite(layer?.cutoff)) {
    track.filter.frequency.setTargetAtTime(layer.cutoff, manager.context.currentTime,
      REVIEWED_AUDIO_MIX.spatialFilterSmoothSeconds);
  }
}
