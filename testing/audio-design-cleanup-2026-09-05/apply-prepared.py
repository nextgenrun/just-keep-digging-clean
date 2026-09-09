from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[2]
out=Path(__file__).resolve().parent
entries=json.loads((out/'patch-manifest.json').read_text())
for entry in entries:
 target=root/entry['path']; candidate=out/'prepared'/entry['prepared']
 if not target.resolve().is_relative_to(root): raise RuntimeError('Out-of-workspace target')
 if hashlib.sha256(target.read_bytes()).hexdigest()!=entry['beforeHash']: raise RuntimeError('Overlapping edit: '+entry['path'])
 if hashlib.sha256(candidate.read_bytes()).hexdigest()!=entry['afterHash']: raise RuntimeError('Prepared patch changed')
for entry in entries:
 (root/entry['path']).write_bytes((out/'prepared'/entry['prepared']).read_bytes())
print('APPLIED_PREPARED_AUDIO_CLEANUP',len(entries))
