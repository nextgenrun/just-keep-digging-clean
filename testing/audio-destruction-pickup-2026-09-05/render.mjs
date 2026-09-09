import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { CORE_ACTION_AUDIO } from "../../values/coreActionAudio.js";
import { CORE_SFX_WINDOWS } from "../../values/coreSfxWindows.js";
import { REVIEWED_AUDIO_ASSETS } from "../../values/reviewedAudioAssets.js";
import { FREESOUND_AUDIO_ASSETS } from "../../values/freesoundAudio.js";
import { createSfxWindow } from "../../sound/coreSfxWindow.js";
const ffmpeg = "C:/Users/Mila/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin/ffmpeg.exe";
const dir = new URL("renders/", import.meta.url); mkdirSync(dir, { recursive: true });
const sampleRate = 48000;
const context = { createBuffer(channels, length, rate) {
 const data = Array.from({ length: channels }, () => new Float32Array(length));
 return { numberOfChannels: channels, length, sampleRate: rate, duration: length / rate, getChannelData: c => data[c] };
} };
function wav(buffer) {
 const channels = buffer.numberOfChannels, length = buffer.length; const bytes = Buffer.alloc(44 + length * channels * 4);
 bytes.write("RIFF"); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
 bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(3, 20); bytes.writeUInt16LE(channels, 22);
 bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * channels * 4, 28);
 bytes.writeUInt16LE(channels * 4, 32); bytes.writeUInt16LE(32, 34); bytes.write("data", 36); bytes.writeUInt32LE(length * channels * 4, 40);
 for (let n = 0; n < length; n++) for (let c = 0; c < channels; c++) bytes.writeFloatLE(buffer.getChannelData(c)[n], 44 + (n * channels + c) * 4);
 return bytes;
}
const report = [];
for (const [id, window] of Object.entries(CORE_SFX_WINDOWS)) {
 const asset = REVIEWED_AUDIO_ASSETS[id] || FREESOUND_AUDIO_ASSETS[id] || CORE_ACTION_AUDIO.hardFootsteps.find(a => a.key === id);
 const probe = spawnSync(ffmpeg.replace("ffmpeg.exe", "ffprobe.exe"), ["-v", "error", "-show_entries", "stream=channels", "-of", "json", asset.path]);
 if (probe.status !== 0) throw new Error(probe.stderr.toString());
 const channels = JSON.parse(probe.stdout).streams[0].channels;
 const decoded = spawnSync(ffmpeg, ["-v", "error", "-i", asset.path, "-f", "f32le", "-ar", String(sampleRate), "pipe:1"], { maxBuffer: 8 * 1024 * 1024 });
 if (decoded.status !== 0) throw new Error(decoded.stderr.toString());
 const floats = new Float32Array(decoded.stdout.buffer.slice(decoded.stdout.byteOffset, decoded.stdout.byteOffset + decoded.stdout.byteLength));
 const original = context.createBuffer(channels, floats.length / channels, sampleRate);
 for (let n = 0; n < original.length; n++) for (let c = 0; c < channels; c++) original.getChannelData(c)[n] = floats[n * channels + c];
 const edited = createSfxWindow(context, original, window), data = edited.getChannelData(0);
 writeFileSync(new URL(id + ".wav", dir), wav(edited));
 const rms = [], width = Math.round(sampleRate * 0.005);
 for (let n = 0; n < data.length - width; n++) { let sum = 0; for (let j = n; j < n + width; j++) sum += data[j] ** 2; rms.push(Math.sqrt(sum / width)); }
 const maximum = Math.max(...rms); const dominant = rms.findIndex(v => v >= maximum * 0.45) / sampleRate * 1000;
 report.push({ id, source: asset.path, window, originalSeconds: original.duration, editedSeconds: edited.duration,
  dominantAttackMs: dominant, channels, peak: Math.max(...Array.from({ length: channels }, (_, c) => Math.max(...edited.getChannelData(c).map(Math.abs)))), sourceSamplesAboveFullScale: floats.filter(v => Math.abs(v) >= 1).length, format: "float32 PCM, unclamped original amplitude",
  firstSample: data[0], lastSample: data.at(-1), previewPath: "testing/audio-destruction-pickup-2026-09-05/renders/" + id + ".wav" });
}
writeFileSync(new URL("window-measurements.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
