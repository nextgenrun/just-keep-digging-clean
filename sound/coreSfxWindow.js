// Cache by decoded source: unloading that source also releases its edited variants.
const editedBuffers = new WeakMap();

/** Build one short, faded playback view without changing the approved source. */
export function createSfxWindow(context, source, window) {
  if (!source?.getChannelData || !context?.createBuffer || !window) return source;
  let variants = editedBuffers.get(source);
  if (variants?.has(window)) return variants.get(window);
  const start = Math.max(0, Math.round(window.start * source.sampleRate));
  const length = Math.min(source.length - start, Math.round(window.duration * source.sampleRate));
  if (!Number.isFinite(length) || length <= 0) return source;
  const buffer = context.createBuffer(source.numberOfChannels, length, source.sampleRate);
  const fadeIn = Math.max(1, Math.round(window.fadeIn * source.sampleRate));
  const fadeOut = Math.max(1, Math.round(window.fadeOut * source.sampleRate));
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const input = source.getChannelData(channel);
    const output = buffer.getChannelData(channel);
    for (let frame = 0; frame < length; frame += 1) {
      const envelope = Math.min(1, frame / fadeIn, (length - 1 - frame) / fadeOut);
      output[frame] = input[start + frame] * envelope;
    }
  }
  if (!variants) { variants = new Map(); editedBuffers.set(source, variants); }
  variants.set(window, buffer);
  return buffer;
}

/** Apply to a new Phaser sound before play; native completion follows the edited duration. */
export function applySfxWindow(sound, context, window) {
  if (!window) return undefined;
  if (sound.audioBuffer && context?.createBuffer) {
    const buffer = createSfxWindow(context, sound.audioBuffer, window);
    sound.audioBuffer = buffer;
    sound.duration = buffer.duration;
    sound.totalDuration = buffer.duration;
    return undefined;
  }
  // Phaser's HTMLAudio fallback can seek/crop, but cannot render the sample fades.
  if (sound.addMarker?.({ name: "core-action-window", start: window.start,
    duration: window.duration, config: { ...sound.config } })) return "core-action-window";
  return undefined;
}
