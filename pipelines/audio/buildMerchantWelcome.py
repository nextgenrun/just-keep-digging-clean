"""Build the short merchant welcome from approved recordings and an authored rustle."""
from pathlib import Path
import hashlib, json, shutil, subprocess, sys, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
FFMPEG = Path(sys.argv[1] if len(sys.argv) > 1 else shutil.which('ffmpeg') or 'ffmpeg')
OUT = ROOT / 'sound/soundEffects/merchant-entrance-2026-09-07'
RATE = 44100
DURATION = .78
SOURCES = [
    dict(file='freesound-573361.ogg', title='Coins13.wav', creator='doudar41',
         url='https://freesound.org/people/doudar41/sounds/573361/', license='CC0-1.0'),
    dict(file='freesound-849807.ogg', title='User Interface Magic Chimes', creator='mikiko850',
         url='https://freesound.org/people/mikiko850/sounds/849807/', license='CC-BY-4.0'),
]

def decode(name, cutoff):
    path = ROOT / 'sound/soundEffects/approved-freesound-2026-09-03' / name
    result = subprocess.run([str(FFMPEG), '-v', 'error', '-i', str(path), '-af',
        f'lowpass=f={cutoff}:p=2', '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'],
        check=True, capture_output=True)
    data = np.frombuffer(result.stdout, dtype='<f4').astype(float)
    active = np.flatnonzero(abs(data) > max(abs(data)) * .025)
    return data[max(0, int(active[0]) - int(.005*RATE)):]

def layer(data, speed, length, peak, attack, release):
    x = np.interp(np.arange(int(length*RATE))*speed, np.arange(len(data)), data, right=0)
    x *= peak / max(.0001, max(abs(x)))
    a, r = int(attack*RATE), int(release*RATE)
    x[:a] *= np.sin(np.linspace(0, np.pi/2, a))**2
    x[-r:] *= np.cos(np.linspace(0, np.pi/2, r))**2
    return x

OUT.mkdir(parents=True, exist_ok=True)
mix = np.zeros(int(DURATION * RATE))
# Deterministic, softly band-limited fabric-like noise; no additional sampled source.
rng = np.random.default_rng(907)
noise = rng.standard_normal(int(.165*RATE))
noise = np.convolve(noise, np.ones(18)/18, mode='same')
noise -= np.convolve(noise, np.ones(150)/150, mode='same')
rustle = layer(noise, 1, .165, .055, .035, .105)
mix[:len(rustle)] += rustle
coin = layer(decode(SOURCES[0]['file'], 2500), .91, .29, .27, .004, .10)
start = int(.055*RATE); mix[start:start+len(coin)] += coin
chime = layer(decode(SOURCES[1]['file'], 2000), .82, .67, .14, .022, .31)
start = int(.105*RATE); mix[start:start+len(chime)] += chime
# A very low warm body beneath the crystal, with a soft envelope.
t = np.arange(int(.58*RATE))/RATE
warm = (np.sin(2*np.pi*220*t) + .2*np.sin(2*np.pi*330*t)) * np.sin(np.pi*t/.58)**2 * .014
start = int(.09*RATE); mix[start:start+len(warm)] += warm
mix *= .52 / max(abs(mix))
mix[:int(.005*RATE)] *= np.linspace(0, 1, int(.005*RATE))
mix[-int(.02*RATE):] *= np.linspace(1, 0, int(.02*RATE))
wav = OUT / 'merchant-welcome.wav'
with wave.open(str(wav), 'wb') as target:
    target.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
    target.writeframes((mix * 32767).astype('<i2').tobytes())
ogg = OUT / 'merchant-welcome.ogg'
subprocess.run([str(FFMPEG), '-v', 'error', '-y', '-i', str(wav), '-c:a', 'libvorbis', '-q:a', '5', str(ogg)], check=True)
decoded = subprocess.run([str(FFMPEG), '-v', 'error', '-i', str(ogg), '-f', 'f32le', '-'], check=True, capture_output=True)
samples = np.frombuffer(decoded.stdout, dtype='<f4')
for source in SOURCES:
    source['sha256'] = hashlib.sha256((ROOT / 'sound/soundEffects/approved-freesound-2026-09-03' / source['file']).read_bytes()).hexdigest()
manifest = dict(duration=round(len(samples)/RATE, 6), sampleRate=RATE, channels=1,
    peak=float(max(abs(samples))), rmsDb=float(20*np.log10(np.sqrt(np.mean(samples**2)))),
    clippedSamples=int(np.count_nonzero(abs(samples) >= 1)), bytes=ogg.stat().st_size,
    sha256=hashlib.sha256(ogg.read_bytes()).hexdigest(), sources=SOURCES,
    modifications='Trimmed and low-pass filtered; coin rate 0.91; chime rate 0.82; shaped fades; authored rustle and quiet warm sine body; mixed into one cue.')
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
print(json.dumps(manifest, indent=2))
