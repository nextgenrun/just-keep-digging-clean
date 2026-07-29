# V11 skyline weather VFX

Production copies of the approved processed atlases from
`testing/animation-sandbox/v11-skyline-weather-vfx-mockup-v3`.

The runtime keeps production weather timing, pooling, collision and terrain
occlusion. The atlas files provide artwork only. Water frames 8 and 9 are
intentionally excluded.

`weather-particles-v2.png` is the production 8x4, 256 px-frame sheet for
world-space rain streaks, snowflakes, splashes, ripples, water drops, spray,
snow powder, steam, smoke, and ground mist. It is rebuilt from the clean
ImageGen sources by `ai-tools/2026-07-28-build-weather-particles-v2.py`; the
adjacent manifest records frame groups, source hashes, output hash, visible
alpha coverage, and a zero-residual-chroma validation.

The older broad rain/snow/water sheets remain source/reference assets for
cloud-atlas tooling. Runtime precipitation uses the compact v2 sheet so the
rejected rectangular matte regions cannot appear.
