"""Submit/poll/download the approved Seedance loop; credential only via stdin."""
import sys, json, base64, urllib.request, urllib.error
from pathlib import Path
OUT=Path(__file__).resolve().parent
BASE='https://openrouter.ai'
token=sys.stdin.readline().strip()
assert token.startswith('sk-or-'), 'Missing transient OpenRouter credential'
def call(path,payload=None,binary=False):
    assert path.startswith('/api/v1/'), 'Unexpected API path'
    req=urllib.request.Request(BASE+path,data=json.dumps(payload).encode() if payload is not None else None,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=90) as response:
        return response.read() if binary else json.load(response)
mode=sys.argv[1]
try:
    if mode=='submit':
        assert not (OUT/'video-job.json').exists(), 'Existing job: poll rather than duplicate'
        args=json.loads((OUT/'video-request.json').read_text(encoding='utf-8-sig'))
        data='data:image/png;base64,'+base64.b64encode((OUT/'animation-first-last.png').read_bytes()).decode()
        args['frame_images']=[{'type':'image_url','image_url':{'url':data},'frame_type':t} for t in ['first_frame','last_frame']]
        result=call('/api/v1/videos',args)
        (OUT/'video-job.json').write_text(json.dumps(result,indent=2))
    elif mode=='poll':
        job=json.loads((OUT/'video-job.json').read_text())
        result=call('/api/v1/videos/'+job['id'])
        (OUT/'video-status.json').write_text(json.dumps(result,indent=2))
    elif mode=='download':
        job=json.loads((OUT/'video-job.json').read_text())
        data=call('/api/v1/videos/'+job['id']+'/content?index=0',binary=True)
        (OUT/'understar-seedance-native.mp4').write_bytes(data)
        result={'saved':'understar-seedance-native.mp4','bytes':len(data)}
    print(json.dumps(result))
except urllib.error.HTTPError as error:
    body=error.read().decode(errors='replace')
    (OUT/('video-'+mode+'-error.json')).write_text(json.dumps({'httpStatus':error.code,'body':body},indent=2))
    print('OPENROUTER_HTTP_ERROR',error.code,body[:1800])
    sys.exit(2)

