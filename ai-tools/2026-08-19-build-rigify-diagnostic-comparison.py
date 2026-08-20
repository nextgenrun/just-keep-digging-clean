import base64
import io
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


def arguments():
    return sys.argv[1:]


def config_argument():
    for argument in arguments():
        if argument.startswith("--config="):
            return argument.split("=", 1)[1]
    raise RuntimeError("Missing required --config argument")


def absolute(path_value):
    return Path(path_value if os.path.isabs(path_value) else Path.cwd() / path_value).resolve()


def load_json(path_value):
    return json.loads(absolute(path_value).read_text(encoding="utf-8"))


def centered_text(draw, box, value, font, fill):
    left, top, right, bottom = box
    bounds = draw.textbbox((0, 0), value, font=font)
    width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
    draw.text(
        (left + (right - left - width) / 2, top + (bottom - top - height) / 2 - bounds[1]),
        value,
        font=font,
        fill=fill,
    )


def frame_paths(root, family, side):
    paths = sorted((root / family / side).glob("frame-*.png"))
    if not paths:
        raise RuntimeError(f"No {side} frames for {family}")
    return paths


def character_mask(image, settings):
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    sample = settings["edgeSampleWidthPx"]
    edges = np.concatenate((rgb[:, :sample, :], rgb[:, -sample:, :]), axis=1)
    background = np.median(edges, axis=1, keepdims=True)
    distance = np.linalg.norm(rgb - background, axis=2)
    mask = distance > settings["backgroundDistanceThreshold"]
    mask[int(image.height * settings["floorCutoffRatio"]) :, :] = False
    return Image.fromarray((mask * 255).astype(np.uint8), "L")


def outline(mask, radius):
    size = radius * 2 + 1
    expanded = mask.filter(ImageFilter.MaxFilter(size))
    contracted = mask.filter(ImageFilter.MinFilter(size))
    return np.asarray(expanded, dtype=np.int16) - np.asarray(contracted, dtype=np.int16) > 0


def diagnostic_image(current, candidate, settings):
    current_mask = character_mask(current, settings)
    candidate_mask = character_mask(candidate, settings)
    current_edge = outline(current_mask, settings["outlineRadiusPx"])
    candidate_edge = outline(candidate_mask, settings["outlineRadiusPx"])
    base = Image.blend(current.convert("RGBA"), candidate.convert("RGBA"), 0.5)
    base = Image.blend(Image.new("RGBA", base.size, (0, 0, 0, 255)), base, settings["baseBrightness"])
    pixels = np.asarray(base).copy()
    only_current = current_edge & ~candidate_edge
    only_candidate = candidate_edge & ~current_edge
    overlap = current_edge & candidate_edge
    pixels[only_current] = settings["sourceColor"]
    pixels[only_candidate] = settings["candidateColor"]
    pixels[overlap] = settings["overlapColor"]
    return Image.fromarray(pixels, "RGBA")


def encoded_webp(image, settings):
    resized = image.resize((settings["widthPx"], settings["heightPx"]), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    resized.save(buffer, "WEBP", quality=settings["webpQuality"], method=settings["webpMethod"])
    return "data:image/webp;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def gif_frame(config, family, index, current, candidate, difference):
    settings = config["diagnosticGif"]
    panel_size = (settings["panelWidthPx"], settings["panelHeightPx"])
    panels = [image.resize(panel_size, Image.Resampling.LANCZOS) for image in (current, candidate, difference)]
    width = panel_size[0] * 3
    height = settings["headerHeightPx"] + panel_size[1] + settings["footerHeightPx"]
    canvas = Image.new("RGBA", (width, height), tuple(settings["backgroundColor"]))
    for panel_index, panel in enumerate(panels):
        canvas.alpha_composite(panel, (panel_index * panel_size[0], settings["headerHeightPx"]))
    draw = ImageDraw.Draw(canvas)
    title_font = ImageFont.truetype(settings["fontPath"], settings["titleFontSizePx"])
    label_font = ImageFont.truetype(settings["fontPath"], settings["labelFontSizePx"])
    titles = [settings["sourceTitle"], settings["candidateTitle"], settings["differenceTitle"]]
    colors = [tuple(settings["sourceColor"]), tuple(settings["candidateColor"]), tuple(settings["overlapColor"])]
    for panel_index, (title, color) in enumerate(zip(titles, colors)):
        left = panel_index * panel_size[0]
        centered_text(draw, (left, 0, left + panel_size[0], settings["headerHeightPx"]), title, title_font, color)
    footer = f"{family.upper()}  |  FRAME {index + 1}"
    centered_text(draw, (0, height - settings["footerHeightPx"], width, height), footer, label_font, tuple(settings["textColor"]))
    return canvas.convert("P", palette=Image.Palette.ADAPTIVE)


def save_gif(path, frames, settings):
    durations = [settings["frameDurationMs"]] * len(frames)
    durations[-1] = settings["pauseDurationMs"]
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=durations, loop=0, disposal=2, optimize=False)


def visualization_fragment(config, data):
    interactive = config["interactive"]
    payload = json.dumps(data, separators=(",", ":"))
    presets = json.dumps(interactive["zoomPresets"], separators=(",", ":"))
    families = "".join(
        f'<button type="button" class="btn" data-family="{name}" aria-pressed="false">{name.title()}</button>'
        for name in data
    )
    zooms = "".join(
        f'<button type="button" class="btn" data-zoom="{name}" aria-pressed="false">{settings["label"]}</button>'
        for name, settings in interactive["zoomPresets"].items()
    )
    return f'''<div id="rigify-difference-lab">
  <h2>Rigify deformation difference lab</h2>
  <div class="viz-controls" aria-label="Animation family">{families}</div>
  <div class="viz-controls" aria-label="Comparison mode">
    <button type="button" class="btn" data-mode="wipe" aria-pressed="false">Wipe</button>
    <button type="button" class="btn" data-mode="flicker" aria-pressed="false">A/B flicker</button>
    <button type="button" class="btn" data-mode="outlines" aria-pressed="false">Outlines</button>
    <button type="button" class="btn btn-primary" data-play aria-pressed="false">Play</button>
  </div>
  <div class="viz-controls" aria-label="Zoom region">{zooms}</div>
  <div class="rdl-stage" role="img" aria-label="Current original and Rigify deformation comparison">
    <img class="rdl-layer rdl-current" alt="Current original rig frame">
    <img class="rdl-layer rdl-candidate" alt="Rigify candidate frame">
    <img class="rdl-layer rdl-outlines" alt="Silhouette displacement overlay">
    <div class="rdl-wipe" aria-hidden="true"></div>
  </div>
  <label class="form-label" for="rdl-frame">Frame <span data-frame-value></span></label>
  <input id="rdl-frame" class="form-range" type="range" min="0" value="0" step="1">
  <label class="form-label" for="rdl-wipe-range">Wipe position <span data-wipe-value></span>%</label>
  <input id="rdl-wipe-range" class="form-range" type="range" min="0" max="100" value="{interactive["initialWipePercent"]}" step="1">
  <div class="text-small text-muted" data-status aria-live="polite"></div>
  <style>
    #rigify-difference-lab {{ display:grid; gap:12px; width:100%; }}
    #rigify-difference-lab .rdl-stage {{ position:relative; width:min(100%, 760px); aspect-ratio:8/9; overflow:hidden; margin-inline:auto; background:var(--muted); }}
    #rigify-difference-lab .rdl-layer {{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform-origin:50% 50%; transition:transform 180ms ease; }}
    #rigify-difference-lab .rdl-candidate {{ clip-path:inset(0 50% 0 0); }}
    #rigify-difference-lab .rdl-outlines {{ display:none; }}
    #rigify-difference-lab .rdl-wipe {{ position:absolute; inset-block:0; left:50%; width:2px; background:var(--foreground); transform:translateX(-1px); pointer-events:none; }}
    @media (prefers-reduced-motion: reduce) {{ #rigify-difference-lab .rdl-layer {{ transition:none; }} }}
  </style>
  <script>
  (() => {{
    const root=document.getElementById('rigify-difference-lab');
    const frames={payload}; const zooms={presets};
    const current=root.querySelector('.rdl-current'), candidate=root.querySelector('.rdl-candidate'), outlines=root.querySelector('.rdl-outlines');
    const wipeLine=root.querySelector('.rdl-wipe'), frameInput=root.querySelector('#rdl-frame'), wipeInput=root.querySelector('#rdl-wipe-range');
    const frameValue=root.querySelector('[data-frame-value]'), wipeValue=root.querySelector('[data-wipe-value]'), status=root.querySelector('[data-status]');
    const playButton=root.querySelector('[data-play]');
    let family='{interactive["initialFamily"]}', mode='{interactive["initialMode"]}', zoom='{interactive["initialZoom"]}', index=0, playing=false, flickerCandidate=false;
    let motionTimer=null, flickerTimer=null;
    function pressed(selector, value, key) {{ root.querySelectorAll(selector).forEach(button=>{{ const active=button.dataset[key]===value; button.setAttribute('aria-pressed',String(active)); button.classList.toggle('btn-primary',active); }}); }}
    function applyZoom() {{ const z=zooms[zoom]; [current,candidate,outlines].forEach(image=>{{ image.style.transform=`scale(${{z.scale}})`; image.style.transformOrigin=`${{z.originXPercent}}% ${{z.originYPercent}}%`; }}); }}
    function render() {{ const set=frames[family], frame=set[index]; current.src=frame.current; candidate.src=frame.candidate; outlines.src=frame.outlines; frameInput.max=String(set.length-1); frameInput.value=String(index); frameValue.textContent=`${{index+1}} / ${{set.length}}`;
      const wipe=Number(wipeInput.value); wipeValue.textContent=String(wipe); candidate.style.clipPath=`inset(0 ${{100-wipe}}% 0 0)`; wipeLine.style.left=`${{wipe}}%`;
      current.style.display=mode==='outlines'?'none':'block'; outlines.style.display=mode==='outlines'?'block':'none'; wipeLine.style.display=mode==='wipe'?'block':'none';
      candidate.style.display=mode==='flicker'?(flickerCandidate?'block':'none'):(mode==='outlines'?'none':'block'); applyZoom();
      status.textContent=`${{family.toUpperCase()}} · frame ${{index+1}} · ${{mode}} · ${{zooms[zoom].label}}`; pressed('[data-family]',family,'family'); pressed('[data-mode]',mode,'mode'); pressed('[data-zoom]',zoom,'zoom'); }}
    function stopTimers() {{ if(motionTimer) clearInterval(motionTimer); if(flickerTimer) clearInterval(flickerTimer); motionTimer=null; flickerTimer=null; }}
    function syncTimers() {{ stopTimers(); if(playing) motionTimer=setInterval(()=>{{ index=(index+1)%frames[family].length; render(); }},{interactive["motionIntervalMs"]}); if(mode==='flicker') flickerTimer=setInterval(()=>{{ flickerCandidate=!flickerCandidate; render(); }},{interactive["flickerIntervalMs"]}); }}
    root.querySelectorAll('[data-family]').forEach(button=>button.addEventListener('click',()=>{{ family=button.dataset.family; index=0; render(); syncTimers(); }}));
    root.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{{ mode=button.dataset.mode; render(); syncTimers(); }}));
    root.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{{ zoom=button.dataset.zoom; render(); }}));
    playButton.addEventListener('click',()=>{{ playing=!playing; playButton.textContent=playing?'Pause':'Play'; playButton.setAttribute('aria-pressed',String(playing)); syncTimers(); }});
    frameInput.addEventListener('input',()=>{{ index=Number(frameInput.value); render(); }}); wipeInput.addEventListener('input',render);
    render(); syncTimers();
  }})();
  </script>
</div>'''


def main():
    config = load_json(config_argument())
    source_config = load_json(config["sourceConfig"])
    root = absolute(config["outputRoot"])
    gif_settings = config["diagnosticGif"]
    embed_settings = config["embeddedFrame"]
    all_gif_frames, embedded, report = [], {}, {}
    for family in source_config["families"]:
        current_paths = frame_paths(root, family, "current")
        candidate_paths = frame_paths(root, family, "candidate")
        if len(current_paths) != len(candidate_paths):
            raise RuntimeError(f"Frame mismatch for {family}")
        family_gif, family_data = [], []
        for index, (current_path, candidate_path) in enumerate(zip(current_paths, candidate_paths)):
            current = Image.open(current_path).convert("RGBA")
            candidate = Image.open(candidate_path).convert("RGBA")
            difference = diagnostic_image(current, candidate, config["silhouette"])
            family_gif.append(gif_frame(config, family, index, current, candidate, difference))
            family_data.append({
                "current": encoded_webp(current, embed_settings),
                "candidate": encoded_webp(candidate, embed_settings),
                "outlines": encoded_webp(difference, embed_settings),
            })
        output = root / gif_settings["outputPattern"].format(family=family)
        save_gif(output, family_gif, gif_settings)
        all_gif_frames.extend(frame.copy() for frame in family_gif)
        embedded[family] = family_data
        report[family] = {"frames": len(family_gif), "output": str(output)}
    combined = root / gif_settings["combinedOutput"]
    save_gif(combined, all_gif_frames, gif_settings)
    fragment = visualization_fragment(config, embedded)
    output_html = absolute(config["visualizationOutput"])
    output_html.parent.mkdir(parents=True, exist_ok=True)
    output_html.write_text(fragment, encoding="utf-8")
    rendered = output_html.read_text(encoding="utf-8")
    if rendered.startswith("<!doctype") or "<html" in rendered or "<body" in rendered or '\\"' in rendered or len(rendered.encode("utf-8")) >= 1_000_000:
        raise RuntimeError("Visualization fragment contract failed")
    report["combined"] = {"frames": len(all_gif_frames), "output": str(combined)}
    report["visualization"] = {"output": str(output_html), "bytes": len(rendered.encode("utf-8"))}
    (root / "diagnostic-preview-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"RIGIFY_DIAGNOSTIC_COMPARISON_OK frames={len(all_gif_frames)} html_bytes={report['visualization']['bytes']}")


if __name__ == "__main__":
    main()
