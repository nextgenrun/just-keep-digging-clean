import runpy
import sys
import webbrowser
webbrowser.open = lambda *args, **kwargs: False
sys.argv = ["serve.py", "8194"]
runpy.run_path("serve.py", run_name="__main__")