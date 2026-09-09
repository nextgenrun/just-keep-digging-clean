"""Local-only media preview server with byte-range seeking."""
import http.server, re
from pathlib import Path
PACK=Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        self.byte_range=None
        super().__init__(*args,directory=str(PACK),**kwargs)
    def send_head(self):
        request_range=self.headers.get('Range')
        target=Path(self.translate_path(self.path)).resolve()
        if PACK.resolve() not in target.parents and target!=PACK.resolve():
            self.send_error(403);return None
        if not request_range or not target.is_file():
            return super().send_head()
        match=re.fullmatch(r'bytes=(\d*)-(\d*)',request_range)
        if not match:return super().send_head()
        size=target.stat().st_size
        left,right=match.groups()
        start=int(left) if left else max(0,size-int(right))
        end=min(int(right),size-1) if left and right else size-1
        if start> end or start>=size:
            self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return None
        stream=target.open('rb');stream.seek(start)
        self.byte_range=(start,end)
        self.send_response(206)
        self.send_header('Content-Type',self.guess_type(str(target)))
        self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length',str(end-start+1))
        self.send_header('Accept-Ranges','bytes')
        self.end_headers()
        return stream
    def copyfile(self,source,outputfile):
        if self.byte_range is None:return super().copyfile(source,outputfile)
        remaining=self.byte_range[1]-self.byte_range[0]+1
        try:
            while remaining:
                data=source.read(min(1024*1024,remaining))
                if not data:break
                outputfile.write(data);remaining-=len(data)
        except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):
            pass
if __name__=='__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1',8775),Handler).serve_forever()
