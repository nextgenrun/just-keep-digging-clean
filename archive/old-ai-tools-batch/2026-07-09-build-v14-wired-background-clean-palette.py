from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def load_core():
    path = Path(__file__).with_name("2026-07-09-v14-wired-background-core.py")
    spec = importlib.util.spec_from_file_location("v14_wired_background_core", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


if __name__ == "__main__":
    load_core().run()
