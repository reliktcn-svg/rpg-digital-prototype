"""HTTP transport only: validators include complete responses, not just turn revision."""
import gzip,hashlib,io,os,urllib.parse
from functools import lru_cache

@lru_cache(maxsize=32)
def compressed(raw):
    return gzip.compress(raw,compresslevel=5,mtime=0)

@lru_cache(maxsize=1024)
def file_digest(path,mtime_ns,size):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()

def accepts_gzip(header):
    for part in header.lower().split(','):
        bits=part.strip().split(';')
        if bits[0]=='gzip':
            try:return not any(x.strip().startswith('q=') and float(x.strip()[2:] or 0)==0 for x in bits[1:])
            except ValueError:return False
    return False

class TransportMixin:
    def validator(self,digest,private=False):
        # Weak validator is shared by identity/gzip representations.
        tag='W/"'+digest+'"'
        matches=[v.strip().removeprefix('W/') for v in self.headers.get('If-None-Match','').split(',')]
        matched=tag.removeprefix('W/') in matches or '*' in matches
        return tag,matched

    def transport_headers(self,tag,private=False):
        self.send_header('Cache-Control','private, no-cache' if private else 'no-cache')
        self.send_header('ETag',tag)
        self.send_header('Vary','Accept-Encoding')

    def send_bytes(self,status,raw,content_type,conditional=False,private=False,digest=None):
        tag,matched=self.validator(digest or hashlib.sha256(raw).hexdigest(),private)
        if conditional and matched:
            self.send_response(304);self.transport_headers(tag,private);self.end_headers();return
        use_gzip=len(raw)>=512 and accepts_gzip(self.headers.get('Accept-Encoding',''))
        body=compressed(raw) if use_gzip else raw
        self.send_response(status);self.send_header('Content-Type',content_type)
        if conditional:self.transport_headers(tag,private)
        else:
            self.send_header('Cache-Control','no-store');self.send_header('Vary','Accept-Encoding')
        if use_gzip:self.send_header('Content-Encoding','gzip')
        self.send_header('Content-Length',str(len(body)));self.end_headers()
        if self.command!='HEAD':self.wfile.write(body)

    def send_head(self):
        # Keep standard redirects, directory handling and path normalization.
        path=self.translate_path(self.path)
        if os.path.isdir(path):
            if not urllib.parse.urlparse(self.path).path.endswith('/'):return super().send_head()
            path=os.path.join(path,'index.html')
        if not os.path.isfile(path):return super().send_head()
        stat=os.stat(path)
        tag,matched=self.validator(file_digest(path,stat.st_mtime_ns,stat.st_size))
        if matched:
            self.send_response(304);self.transport_headers(tag);self.end_headers();return None
        kind=self.guess_type(path)
        is_text=kind.startswith('text/') or path.endswith(('.js','.json','.webmanifest','.svg'))
        use_gzip=is_text and stat.st_size>=512 and accepts_gzip(self.headers.get('Accept-Encoding',''))
        if use_gzip:
            with open(path,'rb') as f:body=compressed(f.read())
            stream=io.BytesIO(body);size=len(body)
        else:stream=open(path,'rb');size=stat.st_size
        self.send_response(200);self.send_header('Content-Type',kind);self.transport_headers(tag)
        self.send_header('Last-Modified',self.date_time_string(stat.st_mtime))
        if use_gzip:self.send_header('Content-Encoding','gzip')
        self.send_header('Content-Length',str(size));self.end_headers()
        return stream
