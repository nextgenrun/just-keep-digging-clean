"""Serve the review gallery through the checkout's canonical server."""
from pathlib import Path
import runpy
import sys
import webbrowser
webbrowser.open = lambda *args, **kwargs: False
sys.argv = ["serve.py", "8194"]
runpy.run_path(str(Path(__file__).resolve().parents[1] / "serve.py"), run_name="__main__")
