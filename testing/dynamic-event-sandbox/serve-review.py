"""Run the canonical checkout server without opening an external browser."""
import os
from pathlib import Path
import runpy
import sys
import webbrowser

root = Path(__file__).resolve().parents[2]
os.chdir(root)
port = sys.argv[1] if len(sys.argv) > 1 else "8098"
sys.argv = [str(root / "serve.py"), port]
webbrowser.open = lambda *args, **kwargs: False
runpy.run_path(str(root / "serve.py"), run_name="__main__")
