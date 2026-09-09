"""Retime approved scenery and logo lighting into native 60 fps H.264 clips."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
CFG = json.loads((ROOT / 'values/menuMotionRefinement.json').read_text(encoding='utf-8'))
LAB = ROOT / 'testing/2026-09-07-menu-atmosphere'
FFMPEG = str(ROOT / CFG['ffmpeg'])


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def encode(source, destination, filters, duration, crf=None):
    destination.parent.mkdir(parents=True, exist_ok=True)
    candidate = destination.with_suffix('.building.mp4')
    log = LAB / (destination.stem + '-smooth-build.log')
    command = [FFMPEG, '-y', '-hide_banner', '-loglevel', 'warning',
               '-i', str(source), '-filter_complex_threads', '1',
               '-filter_complex', filters, '-map', '[out]', '-t', str(duration),
               '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-threads', '2',
               '-preset', 'fast', '-crf', str(CFG['crf'] if crf is None else crf), '-g', str(CFG['fps']),
               '-movflags', '+faststart', str(candidate)]
    started = time.monotonic()
    with log.open('w', encoding='utf-8') as output:
        subprocess.run(command, check=True, stdout=output, stderr=output,
                       creationflags=getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0))
    assert candidate.stat().st_size > 1000
    candidate.replace(destination)
    return {'path': destination.relative_to(ROOT).as_posix(),
            'source': source.relative_to(ROOT).as_posix(), 'sourceSha256': sha(source),
            'sha256': sha(destination), 'bytes': destination.stat().st_size,
            'durationSeconds': duration, 'fps': CFG['fps'],
            'encodeSeconds': round(time.monotonic() - started, 2)}


def background(profile):
    source = LAB / profile['source']
    destination = ROOT / CFG['outputDirectory'] / (profile['id'] + '.mp4')
    overlap = CFG['sourceOverlapSeconds']
    offset = CFG['sourceDuration'] - 2 * overlap
    duration = (CFG['sourceDuration'] - overlap) * profile['slowdown']
    filters = (
        f"[0:v]fps={CFG['sourceFps']},trim=duration={CFG['sourceDuration']},setpts=PTS-STARTPTS,setsar=1,split=2[a][b];"
        f"[a]trim=start={overlap},setpts=PTS-STARTPTS,fps={CFG['sourceFps']}[tail];"
        f"[b]trim=end={overlap},setpts=PTS-STARTPTS,fps={CFG['sourceFps']}[head];"
        f"[tail][head]xfade=transition=fade:duration={overlap}:offset={offset},"
        f"scale={CFG['width']}:{CFG['height']},setpts={profile['slowdown']}*PTS,"
        f"tpad=stop_mode=clone:stop_duration={CFG['endPaddingSeconds']},"
        f"{CFG['interpolation']},format=yuv420p[out]")
    print('START', profile['id'], flush=True)
    return {'id': profile['id'], 'width': CFG['width'], 'height': CFG['height'],
            'slowdownFromSource': profile['slowdown'],
            'speedReductionFromV4Percent': round(100 * (1 - profile['previousSlowdown'] / profile['slowdown']), 2),
            **encode(source, destination, filters, duration)}


def logo():
    config = CFG['logo']
    w, h, x, y = config['crop']
    threshold = config['chromaThreshold']
    minimum = 'min(r(X,Y),min(g(X,Y),b(X,Y)))'
    light = ':'.join(f"{channel}='max({channel}(X,Y)-{minimum}-{threshold},0)'"
                     for channel in ['r', 'g', 'b'])
    duration = config['duration'] * config['slowdown']
    filters = (f"[0:v]crop={w}:{h}:{x}:{y},scale={config['width']}:{config['height']},"
               f"setpts={config['slowdown']}*PTS,"
               f"tpad=stop_mode=clone:stop_duration={CFG['endPaddingSeconds']},"
               f"{CFG['interpolation']},format=gbrp,geq={light},format=yuv420p[out]")
    print('START logo-light', flush=True)
    return {'id': 'logo-light', 'width': config['width'], 'height': config['height'],
            'presentation': 'Additive colored light over the unchanged static lettering',
            **encode(ROOT / config['source'], ROOT / config['output'], filters, duration)}


def close_loops():
    import sys
    sys.path.insert(0, str(ROOT / CFG['inspectionDependencies']))
    import cv2
    cv2.setNumThreads(1)
    proof_path = ROOT / CFG['proof']
    proof = json.loads(proof_path.read_text())
    for clip in proof['clips']:
        if clip.get('closedLoop'):
            continue
        path = ROOT / clip['path']
        capture = cv2.VideoCapture(str(path))
        frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        capture.release()
        overlap = CFG['closureFrames']
        fps = CFG['fps']
        assert frames > 2 * overlap
        duration = (frames - overlap) / fps
        filters = (f"[0:v]fps={fps},split=2[a][b];"
                   f"[a]trim=start_frame={overlap},setpts=PTS-STARTPTS,fps={fps}[tail];"
                   f"[b]trim=end_frame={overlap},setpts=PTS-STARTPTS,fps={fps}[head];"
                   f"[tail][head]xfade=transition=fade:duration={overlap/fps}:"
                   f"offset={(frames-2*overlap)/fps},format=yuv420p[out]")
        interpolated_sha = sha(path)
        result = encode(path, path, filters, duration, CFG['closureCrf'])
        capture = cv2.VideoCapture(str(path))
        final_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        capture.release()
        clip.update({key: result[key] for key in ['sha256', 'bytes']})
        clip.update({'closedLoop': True, 'closureSeconds': overlap / fps,
                     'interpolatedSha256': interpolated_sha,
                     'frames': final_frames, 'durationSeconds': final_frames / fps})
        proof['configSha256'] = sha(ROOT / 'values/menuMotionRefinement.json')
        proof_path.write_text(json.dumps(proof, indent=2) + '\n')
        print('CLOSED', clip['id'], final_frames, flush=True)


def verify():
    import sys
    import numpy as np
    sys.path.insert(0, str(ROOT / CFG['inspectionDependencies']))
    import cv2
    cv2.setNumThreads(1)
    proof = json.loads((ROOT / CFG['proof']).read_text())
    checks = []
    for clip in proof['clips']:
        path = ROOT / clip['path']
        assert sha(path) == clip['sha256'], path
        assert sha(ROOT / clip['source']) == clip['sourceSha256'], clip['source']
        capture = cv2.VideoCapture(str(path))
        assert capture.isOpened(), path
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = capture.get(cv2.CAP_PROP_FPS)
        expected = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        assert (width, height) == (clip['width'], clip['height'])
        assert abs(fps - CFG['fps']) < 0.001
        sample_size = (CFG['inspectionWidth'], round(CFG['inspectionWidth'] * height / width))
        first = previous = None
        steps = []
        decoded = 0
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            sample = cv2.resize(frame, sample_size, interpolation=cv2.INTER_AREA).astype(np.int16)
            if first is None:
                first = sample.copy()
            if previous is not None:
                steps.append(float(np.abs(sample - previous).mean()))
            previous = sample
            decoded += 1
        capture.release()
        assert decoded == expected and decoded > 1, (path, decoded, expected)
        result = {'id': clip['id'], 'width': width, 'height': height,
                  'fps': fps, 'decodedFrames': decoded, 'durationSeconds': decoded / fps,
                  'encodedStepP95': float(np.percentile(steps, 95)),
                  'encodedStepMax': max(steps),
                  'encodedBoundaryStep': float(np.abs(first - previous).mean()),
                  'nearStillFrameSteps': sum(step < 0.01 for step in steps),
                  'sha256': sha(path), 'sourceUnchanged': True}
        checks.append(result)
        print('VERIFIED', json.dumps(result), flush=True)
    (ROOT / CFG['verification']).write_text(json.dumps({'clips': checks}, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', choices=[p['id'] for p in CFG['profiles']] + ['logo-light'])
    parser.add_argument("--close", action="store_true")
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.verify:
        verify()
        return
    if args.close:
        close_loops()
        return
    proof_path = ROOT / CFG['proof']
    proof = json.loads(proof_path.read_text()) if proof_path.exists() else {
        'version': CFG['version'], 'configSha256': sha(ROOT / 'values/menuMotionRefinement.json'),
        'interpolation': 'Motion compensated frame interpolation; no playback-rate slowdown', 'clips': []}
    config_hash = sha(ROOT / 'values/menuMotionRefinement.json')
    if proof.get('configSha256') != config_hash:
        proof['clips'] = []
    proof['configSha256'] = config_hash
    completed = {item['id'] for item in proof['clips']
                 if (ROOT / item['path']).exists() and sha(ROOT / item['path']) == item['sha256']}
    jobs = [(p['id'], lambda p=p: background(p)) for p in CFG['profiles']]
    jobs.append(('logo-light', logo))
    with ThreadPoolExecutor(max_workers=CFG['workers']) as pool:
        futures = [pool.submit(build) for name, build in jobs
                   if name not in completed and (args.only is None or args.only == name)]
        errors = []
        for future in as_completed(futures):
            try:
                result = future.result()
                proof['clips'].append(result)
                proof_path.write_text(json.dumps(proof, indent=2) + '\n')
                print('DONE', json.dumps(result), flush=True)
            except subprocess.CalledProcessError as error:
                errors.append(error)
                print('FAILED', error, flush=True)
        if errors:
            raise RuntimeError(f'{len(errors)} exports failed; see scene build logs')
    if not args.only:
        close_loops()


if __name__ == '__main__':
    main()
