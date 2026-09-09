"""Rebuild the streaming-friendly opening copy; original cinematic stays intact."""
from pathlib import Path
import argparse,json,subprocess
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--ffmpeg',required=True);args=p.parse_args()
c=json.loads((ROOT/'values/startupCompression.json').read_text())
subprocess.run([args.ffmpeg,'-y','-v','error','-i',str(ROOT/c['sourceVideo']),'-c:v','libx264','-preset',c['videoPreset'],'-crf',str(c['videoCrf']),'-maxrate',c['videoMaxRate'],'-bufsize',c['videoBuffer'],'-pix_fmt','yuv420p','-movflags','+faststart','-c:a','aac','-b:a',c['audioBitrate'],str(ROOT/c['runtimeVideo'])],check=True)
