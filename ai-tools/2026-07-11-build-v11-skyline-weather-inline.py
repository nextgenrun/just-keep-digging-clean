"""Package the layered v11 weather mockup as a self-contained inline visual."""

import base64
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MOCKUP = ROOT / "testing/animation-sandbox/v11-skyline-weather-mockup-v2"
OUTPUT = Path(r"C:\Users\Mila\.codex\visualizations\2026\07\11\019f511f-df8a-7170-8ada-c0eed87ca795\v11-skyline-weather-cycle-v3.html")
ROOT_ID = "v11-weather-cycle-v3"


def data_uri(path: Path) -> str:
    mime = "image/webp" if path.suffix == ".webp" else "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def scoped_css(css: str) -> str:
    css = css.replace(":root", f"#{ROOT_ID}").replace("body", f"#{ROOT_ID}")
    selectors = [
        ".shell", "header", ".eyebrow", "h1", ".lede", ".stage", ".layer", ".base",
        "#deep-canvas", "#rotor-canvas", "#front-canvas", ".grade", ".controls",
        "input[type=\"range\"]", "input[type=\"checkbox\"]", "select", "output", ".status", ".is-paused",
    ]
    for selector in selectors:
        css = css.replace(selector, f"#{ROOT_ID} {selector}")
    # Avoid double-prefixing root rules produced by the first replacements.
    css = css.replace(f"#{ROOT_ID} #{ROOT_ID}", f"#{ROOT_ID}")
    return css


def main() -> None:
    index = (MOCKUP / "index.html").read_text(encoding="utf-8")
    shell = re.search(r'<main class="shell">(.*?)</main>', index, re.S).group(1)
    for name in ("skyline-base-clean.webp", "town-foreground.png", "windmill-foreground.png"):
        shell = shell.replace(f"assets/{name}", data_uri(MOCKUP / "assets" / name))
    css = scoped_css((MOCKUP / "styles.css").read_text(encoding="utf-8"))
    js = (MOCKUP / "weatherMockup.js").read_text(encoding="utf-8")
    fragment = f'<div id="{ROOT_ID}"><style>{css}</style><div class="shell">{shell}</div><script>(()=>{{{js}}})();</script></div>'
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(fragment, encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
