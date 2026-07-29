"""CLI entry point for the approved centralized player animation-polish package."""

from __future__ import annotations

import json

from player_animation_polish_package import build_package


if __name__ == "__main__":
    print(json.dumps(build_package(), indent=2))
