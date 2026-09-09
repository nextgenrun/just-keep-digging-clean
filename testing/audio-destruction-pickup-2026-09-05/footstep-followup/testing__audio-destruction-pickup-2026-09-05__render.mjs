import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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
 const data = buffer.getChannelData(0); const bytes = Buffer.alloc(44 + data.length * 4);
 bytes.write("RIFF"); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
 bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(3, 20); bytes.writeUInt16LE(1, 22);
 bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * 4, 28);
 bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(32, 34); bytes.write("data", 36); bytes.writeUInt32LE(data.length * 4, 40);
 for (let n = 0; n < data.length; n++) bytes.writeFloatLE(data[n], 44 + n * 4);
 return bytes;
}
const report = [];
for (const [id, window] of Object.entries(CORE_SFX_WINDOWS)) {
 const asset = REVIEWED_AUDIO_ASSETS[id] || FREESOUND_AUDIO_ASSETS[id];
 const decoded = spawnSync(ffmpeg, ["-v", "error", "-i", asset.path, "-f", "f32le", "-ac", "1", "-ar", String(sampleRate), "pipe:1"], { maxBuffer: 8 * 1024 * 1024 });
 if (decoded.status !== 0) throw new Error(decoded.stderr.toString());
 const floats = new Float32Array(decoded.stdout.buffer.slice(decoded.stdout.byteOffset, decoded.stdout.byteOffset + decoded.stdout.byteLength));
 const original = context.createBuffer(1, floats.length, sampleRate); original.getChannelData(0).set(floats);
 const edited = createSfxWindow(context, original, window), data = edited.getChannelData(0);
 writeFileSync(new URL(id + ".wav", dir), wav(edited));
 const rms = [], width = Math.round(sampleRate * 0.005);
 for (let n = 0; n < data.length - width; n++) { let sum = 0; for (let j = n; j < n + width; j++) sum += data[j] ** 2; rms.push(Math.sqrt(sum / width)); }
 const maximum = Math.max(...rms); const dominant = rms.findIndex(v => v >= maximum * 0.45) / sampleRate * 1000;
 report.push({ id, source: asset.path, window, originalSeconds: original.duration, editedSeconds: edited.duration,
  dominantAttackMs: dominant, peak: Math.max(...data.map(Math.abs)), sourceSamplesAboveFullScale: data.filter(v => Math.abs(v) >= 1).length, format: "float32 PCM, unclamped original amplitude",
  firstSample: data[0], lastSample: data.at(-1), previewPath: "testing/audio-destruction-pickup-2026-09-05/renders/" + id + ".wav" });
}
writeFileSync(new URL("window-measurements.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
