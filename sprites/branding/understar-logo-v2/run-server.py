"""Run the authoritative dev server without opening an external browser."""
import runpy
import sys
import webbrowser
from pathlib import Path
root = Path(__file__).resolve().parents[3]
webbrowser.open = lambda *_args, **_kwargs: False
sys.argv = [str(root/'serve.py'),'8765']
runpy.run_path(str(root/'serve.py'),run_name='__main__')
