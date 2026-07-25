from __future__ import annotations

import argparse
import json
import socket
import sys
from pathlib import Path


def request(payload: dict, host: str, port: int, timeout: float) -> dict:
    encoded = json.dumps(payload).encode("utf-8")
    with socket.create_connection((host, port), timeout=timeout) as client:
        client.settimeout(timeout)
        client.sendall(encoded)
        buffer = b""
        while True:
            chunk = client.recv(65536)
            if not chunk:
                raise RuntimeError("Blender MCP disconnected before returning JSON")
            buffer += chunk
            try:
                return json.loads(buffer.decode("utf-8"))
            except json.JSONDecodeError:
                continue


def build_payload(args: argparse.Namespace) -> dict:
    if args.command == "scene-info":
        return {"type": "get_scene_info", "params": {}}
    if args.command == "object-info":
        return {"type": "get_object_info", "params": {"name": args.name}}
    if args.command == "screenshot":
        return {
            "type": "get_viewport_screenshot",
            "params": {"filepath": str(Path(args.filepath).resolve()), "max_size": args.max_size},
        }
    if args.command == "execute-code":
        code = args.code or Path(args.code_file).read_text(encoding="utf-8")
        return {"type": "execute_code", "params": {"code": code}}
    raise ValueError(f"Unsupported command: {args.command}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Send one command to the local Blender MCP addon.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9876)
    parser.add_argument("--timeout", type=float, default=120.0)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("scene-info")
    object_info = subparsers.add_parser("object-info")
    object_info.add_argument("name")
    screenshot = subparsers.add_parser("screenshot")
    screenshot.add_argument("filepath")
    screenshot.add_argument("--max-size", type=int, default=1200)
    execute = subparsers.add_parser("execute-code")
    code_source = execute.add_mutually_exclusive_group(required=True)
    code_source.add_argument("--code-file")
    code_source.add_argument("--code")
    args = parser.parse_args()
    response = request(build_payload(args), args.host, args.port, args.timeout)
    print(json.dumps(response, indent=2))
    return 0 if response.get("status") == "success" else 1


if __name__ == "__main__":
    sys.exit(main())
