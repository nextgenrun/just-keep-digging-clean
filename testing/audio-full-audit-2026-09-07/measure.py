"""Read-only FFmpeg quality measurements of the current, locally catalogued media."""
import argparse
import concurrent.futures
import hashlib
import json
import math
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def number(text, pattern):
    matches = re.findall(pattern, text)
    if not matches:
        return None
    value = float(matches[-1])
    return round(value, 3) if math.isfinite(value) else None


def measure(item, args):
    path = ROOT / item['path']
    result = {'path': item['path'], 'kind': item['kind'], 'families': item['families']}
    try:
        probe = subprocess.run([args.ffprobe, '-v', 'error', '-select_streams', 'a:0',
            '-show_entries', 'stream=codec_name,sample_rate,channels,duration,bit_rate:format=duration,size',
            '-of', 'json', str(path)], capture_output=True, text=True, check=True)
        info = json.loads(probe.stdout)
        if not info.get('streams'):
            return {**result, 'noAudioStream': True}
        stream = info['streams'][0]
        result.update(stream)
        result['duration'] = float(stream.get('duration', info['format'].get('duration', 0)))
        result['sha256'] = hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()
        analysis = subprocess.run([args.ffmpeg, '-hide_banner', '-nostdin', '-threads', '1', '-i', str(path),
            '-vn', '-af', 'aformat=sample_fmts=flt,silencedetect=n=-50dB:d=0.08,astats=measure_perchannel=none,ebur128=peak=true',
            '-f', 'null', '-'], capture_output=True, text=True, check=True)
        log = analysis.stderr
        result.update({
            'peakDbFS': number(log, r'Peak level dB:\s+([\-\d.inf]+)'),
            'rmsDbFS': number(log, r'RMS level dB:\s+([\-\d.inf]+)'),
            'integratedLUFS': number(log, r'I:\s+([\-\d.]+) LUFS'),
            'truePeakDbTP': number(log, r'Peak:\s+([\-\d.inf]+) dBFS'),
            'loudnessRangeLU': number(log, r'LRA:\s+([\d.]+) LU'),
            'dcOffset': number(log, r'DC offset:\s+([\-\d.]+)'),
        })
        silence = re.findall(r'silence_(start|end): ([\d.]+)', log)
        result['leadingSilenceSeconds'] = 0
        result['trailingSilenceSeconds'] = 0
        if len(silence) > 1 and silence[0][0] == 'start' and float(silence[0][1]) < .01:
            result['leadingSilenceSeconds'] = round(float(silence[1][1]), 3)
        if len(silence) > 1 and silence[-1][0] == 'end' and abs(float(silence[-1][1]) - result['duration']) < .1:
            result['trailingSilenceSeconds'] = round(float(silence[-1][1]) - float(silence[-2][1]), 3)
        return result
    except Exception as error:
        return {**result, 'error': str(error)[-600:]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg', required=True)
    parser.add_argument('--ffprobe', required=True)
    parser.add_argument('--workers', type=int, default=3)
    parser.add_argument('--reuse-unchanged', action='store_true', help='Reuse an earlier decode only if the current full SHA256 matches')
    args = parser.parse_args()
    catalog = json.loads((HERE / 'catalog.json').read_text(encoding='utf8'))
    rows = []
    previous = {}
    if args.reuse_unchanged and (HERE / 'measurements.json').exists():
        previous = {r['path']: r for r in json.loads((HERE / 'measurements.json').read_text(encoding='utf8'))['items'] if not r.get('error')}
    def current(item):
        old = previous.get(item['path'])
        if old and hashlib.file_digest((ROOT / item['path']).open('rb'), 'sha256').hexdigest() == old.get('sha256'):
            return {**old, 'kind': item['kind'], 'families': item['families']}
        return measure(item, args)
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(current, item) for item in catalog['items']]
        for task in concurrent.futures.as_completed(futures):
            rows.append(task.result())
            if len(rows) % 50 == 0:
                print(json.dumps({'measured': len(rows), 'total': len(futures)}), flush=True)
    rows.sort(key=lambda r: r['path'])
    flags = {
        'decodeErrors': [r['path'] for r in rows if 'error' in r],
        'noAudioStream': [r['path'] for r in rows if r.get('noAudioStream')],
        'aboveZeroTruePeak': [r['path'] for r in rows if (r.get('truePeakDbTP') or -100) > 0],
        'voiceSilenceOverHalfSecond': [r['path'] for r in rows if r['kind'] == 'voice' and (r.get('leadingSilenceSeconds', 0) > .5 or r.get('trailingSilenceSeconds', 0) > .5)],
    }
    report = {'catalogGeneratedAt': catalog['generatedAt'], 'total': len(rows), 'flags': flags, 'items': rows,
        'scope': 'Fresh full-file decode, BS.1770/EBU R128 loudness, oversampled true peak, source silence and format. Flags require contextual interpretation; short Foley LUFS can be undefined.'}
    (HERE / 'measurements.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'total': len(rows), 'flags': {k: len(v) for k, v in flags.items()}}), flush=True)


if __name__ == '__main__':
    main()
