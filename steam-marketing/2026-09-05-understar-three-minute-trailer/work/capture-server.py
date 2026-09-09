import runpy, sys, webbrowser
from pathlib import Path
root = Path(__file__).resolve().parents[3]
webbrowser.open = lambda *args, **kwargs: False
sys.argv = [str(root/'serve.py'), '8774']
runpy.run_path(str(root/'serve.py'), run_name='__main__')
