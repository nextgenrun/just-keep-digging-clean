"""Decode, slice, place, and write PCM WAV audio for offline review mixes."""

from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np


TARGET_RATE = 48_000


def _decode_pcm(raw: bytes, width: int) -> np.ndarray:
    if width == 1:
        return (np.frombuffer(raw, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    if width == 2:
        return np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    if width == 3:
        octets = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3)
        values = octets[:, 0].astype(np.int32) | (octets[:, 1].astype(np.int32) << 8) | (octets[:, 2].astype(np.int32) << 16)
        values = np.where(values & 0x800000, values - 0x1000000, values)
        return values.astype(np.float32) / 8388608.0
    if width == 4:
        return np.frombuffer(raw, dtype="<i4").astype(np.float32) / 2147483648.0
    raise ValueError(f"Unsupported PCM sample width: {width}")


def read_wav(path: Path, target_rate: int = TARGET_RATE) -> np.ndarray:
    with wave.open(str(path), "rb") as source:
        channels = source.getnchannels()
        rate = source.getframerate()
        width = source.getsampwidth()
        frames = source.getnframes()
        audio = _decode_pcm(source.readframes(frames), width).reshape(-1, channels)
    if channels == 1:
        audio = np.repeat(audio, 2, axis=1)
    elif channels > 2:
        audio = audio[:, :2]
    if rate != target_rate:
        output_frames = max(1, round(len(audio) * target_rate / rate))
        positions = np.arange(output_frames, dtype=np.float64) * rate / target_rate
        source_positions = np.arange(len(audio), dtype=np.float64)
        audio = np.column_stack([np.interp(positions, source_positions, audio[:, channel]) for channel in range(2)]).astype(np.float32)
    return audio.astype(np.float32, copy=False)


def strongest_peak_times(audio: np.ndarray, count: int = 8, minimum_gap: float = 0.35, rate: int = TARGET_RATE) -> list[float]:
    mono = np.max(np.abs(audio), axis=1)
    block = max(1, round(rate * 0.015))
    blocks = len(mono) // block
    if blocks == 0:
        return [0.0]
    envelope = mono[: blocks * block].reshape(blocks, block).mean(axis=1)
    gap_blocks = max(1, round(minimum_gap * rate / block))
    chosen: list[int] = []
    for index in np.argsort(envelope)[::-1]:
        if all(abs(int(index) - prior) >= gap_blocks for prior in chosen):
            chosen.append(int(index))
            if len(chosen) == count:
                break
    return sorted(round((index * block) / rate, 3) for index in chosen)


def slice_audio(audio: np.ndarray, start: float, duration: float, fade_ms: float = 8.0, rate: int = TARGET_RATE) -> np.ndarray:
    first = max(0, round(start * rate))
    length = max(1, round(duration * rate))
    clip = np.zeros((length, 2), dtype=np.float32)
    available = audio[first:first + length]
    clip[: len(available)] = available
    fade = min(len(clip) // 2, round(fade_ms * rate / 1000.0))
    if fade:
        ramp = np.linspace(0.0, 1.0, fade, endpoint=False, dtype=np.float32)
        clip[:fade] *= ramp[:, None]
        clip[-fade:] *= ramp[::-1, None]
    return clip


def normalize_clip(audio: np.ndarray, peak_db: float = -3.0) -> tuple[np.ndarray, float]:
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak <= 1e-8:
        return audio, 0.0
    target = 10.0 ** (peak_db / 20.0)
    gain = target / peak
    return audio * gain, 20.0 * math.log10(gain)


def place(canvas: np.ndarray, clip: np.ndarray, at: float, gain_db: float = 0.0, pan: float = 0.0, rate: int = TARGET_RATE) -> None:
    first = max(0, round(at * rate))
    last = min(len(canvas), first + len(clip))
    if last <= first:
        return
    gain = 10.0 ** (gain_db / 20.0)
    pan = min(1.0, max(-1.0, pan))
    left = math.cos((pan + 1.0) * math.pi / 4.0) * math.sqrt(2.0)
    right = math.sin((pan + 1.0) * math.pi / 4.0) * math.sqrt(2.0)
    scaled = clip[: last - first] * gain
    canvas[first:last, 0] += scaled[:, 0] * left
    canvas[first:last, 1] += scaled[:, 1] * right


def finish_mix(audio: np.ndarray, ceiling_db: float = -1.0) -> tuple[np.ndarray, float, float]:
    peak_before = float(np.max(np.abs(audio))) if audio.size else 0.0
    ceiling = 10.0 ** (ceiling_db / 20.0)
    gain = min(1.0, ceiling / peak_before) if peak_before > 0 else 1.0
    return audio * gain, peak_before, 20.0 * math.log10(gain)


def write_wav(path: Path, audio: np.ndarray, rate: int = TARGET_RATE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(audio, -1.0, 0.9999695)
    encoded = np.round(pcm * 32767.0).astype("<i2").tobytes()
    with wave.open(str(path), "wb") as target:
        target.setnchannels(2)
        target.setsampwidth(2)
        target.setframerate(rate)
        target.writeframes(encoded)
