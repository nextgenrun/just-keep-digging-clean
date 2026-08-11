"""Package the v11 image-generated weather comparison as an inline visual."""

import base64
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MOCKUP = ROOT / "testing/animation-sandbox/v11-skyline-weather-vfx-mockup-v3"
OUTPUT = Path(r"C:\Users\Mila\.codex\visualizations\2026\07\11\019f511f-df8a-7170-8ada-c0eed87ca795\v11-imagegen-weather-vfx-comparison.html")
ROOT_ID = "v11-imagegen-weather-vfx-comparison"


def data_uri(path: Path) -> str:
    mime = "image/webp" if path.suffix == ".webp" else "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def scoped_css(css: str) -> str:
    css = css.replace(":root", f"#{ROOT_ID}").replace("body", f"#{ROOT_ID}")
    selectors = [
        ".shell", "header", ".eyebrow", "h1", ".lede", ".stage", ".layer", ".base",
        "#deep-canvas", ".town", "#rotor-canvas", ".windmills", "#front-canvas", ".grade",
        ".controls", "input[type=\"range\"]", "input[type=\"checkbox\"]", "select", "output", ".status", ".is-paused",
    ]
    for selector in selectors:
        css = css.replace(selector, f"#{ROOT_ID} {selector}")
    css = css.replace(f"#{ROOT_ID} #{ROOT_ID}", f"#{ROOT_ID}")
    css = css.replace("background: #07101a", "background: transparent")
    css = css.replace("color: #eef6ff", "color: var(--foreground)")
    css = css.replace("background: radial-gradient(circle at 50% -10%, #18334a 0, #091521 48%, #050b12 100%)", "background: transparent")
    css = css.replace("color: #aabfd0", "color: var(--muted-foreground)")
    css = css.replace("color: #bfd0dc", "color: var(--foreground)")
    css = css.replace("color: #7f9bae", "color: var(--muted-foreground)")
    css = css.replace("border: 1px solid rgba(156,205,235,.22); border-radius: 18px; background: #071728; box-shadow: 0 28px 70px rgba(0,0,0,.48), inset 0 0 0 1px rgba(255,255,255,.04); ", "")
    for selector in (".controls", ".controls label", ".controls .toggle", 'input[type="range"]', 'input[type="checkbox"]', "select", "output"):
        css = re.sub(rf'#{ROOT_ID} {re.escape(selector)}\s*\{{[^}}]*\}}', '', css)
    return css


def main() -> None:
    index = (MOCKUP / "index.html").read_text(encoding="utf-8")
    shell = re.search(r'<main class="shell">(.*?)</main>', index, re.S).group(1)
    shell = re.sub(r'<header>.*?</header>', '', shell, flags=re.S)
    shell = shell.replace('class="stage"', 'class="stage card"')
    shell = shell.replace('class="controls"', 'class="controls viz-controls"')
    shell = shell.replace('<label', '<label class="form-label"').replace('class="form-label" class="toggle"', 'class="form-label form-check form-switch"')
    shell = shell.replace('type="checkbox"', 'class="form-check-input" type="checkbox"')
    shell = shell.replace('type="range"', 'class="form-range" type="range"')
    shell = shell.replace('<select ', '<select class="form-select" ')
    asset_paths = [
        "assets/skyline-base-clean.webp",
        "assets/town-foreground.webp",
        "assets/windmill-foreground.webp",
        "assets/processed/clouds-screen.webp",
        "assets/processed/rain-alpha.webp",
        "assets/processed/snow-alpha.webp",
        "assets/processed/water-alpha.webp",
        "assets/processed/atmosphere-screen.webp",
        "assets/processed/lightning-screen.webp",
    ]
    uri_by_path = {path: data_uri(MOCKUP / path) for path in asset_paths}
    for path, uri in uri_by_path.items():
        shell = shell.replace(path, uri)

    css = scoped_css((MOCKUP / "styles.css").read_text(encoding="utf-8"))
    manifest = (MOCKUP / "vfxManifest.js").read_text(encoding="utf-8")
    for path, uri in uri_by_path.items():
        manifest = manifest.replace(path, uri)
    scripts = "\n".join((MOCKUP / name).read_text(encoding="utf-8") for name in (
        "proceduralWeatherVfx.js", "imagegenWeatherVfx.js", "skylineWeatherComparison.js"
    ))
    fragment = f'<div id="{ROOT_ID}"><style>{css}</style><div class="shell">{shell}</div><script>(()=>{{{manifest}\n{scripts}}})();</script></div>'
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(fragment, encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
