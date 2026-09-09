"""Compile the small local Tailwind shell using the pinned official standalone CLI."""
from pathlib import Path
import subprocess, urllib.request
ROOT = Path(__file__).resolve().parents[1]
VERSION = "4.3.3"
CLI = ROOT / "testing/2026-09-07-menu-atmosphere/build/tailwindcss.exe"
if not CLI.exists():
    CLI.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://github.com/tailwindlabs/tailwindcss/releases/download/v{VERSION}/tailwindcss-windows-x64.exe"
    CLI.write_bytes(urllib.request.urlopen(url, timeout=120).read())
subprocess.run([str(CLI), "-i", "css/menu-shell.tailwind.css", "-o", "css/menu-shell.css", "--minify"], cwd=ROOT, check=True)
