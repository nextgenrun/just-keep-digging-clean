import os, runpy, sys, webbrowser
from pathlib import Path
root = Path(__file__).resolve().parents[3]
os.chdir(root)
webbrowser.open = lambda *args, **kwargs: False
sys.argv = ['serve.py', '8195']
runpy.run_path(str(root / 'serve.py'), run_name='__main__')
