@echo off
python -c "import os,re,json;ROOT=r'c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned\js'
mods={'values','player','systems','world','ui','shaders','testing'}
def depth(r): return r.replace('\\','/').count('/')
def bare(p):
 while p.startswith('./') or p.startswith('../') or p.startswith('/'): p=p[p.index('/')+1:]
 if p.startswith('js/'): p=p[3:]
 return p
fix=0
for d,_,fs in os.walk(ROOT):
 for fn in fs:
  if not fn.endswith('.js'): continue
  fp=os.path.join(d,fn);rel=os.path.relpath(fp,ROOT)
  c=open(fp,'r',encoding='utf-8').read();o=c
  pre='../'*depth(rel)
  def rp(m):
   f=m.group(0);q=m.group(2);p=m.group(3);b=bare(p);fir=b.split('/')[0]
   if fir in mods: return f.replace(q+p+q,q+pre+b+q)
   return f
  c=re.sub(r'(import\s+(?:\{[^}]*\}|[^;{]+?)\s+from\s+)([\"\'])([^\"\']+)([\"\'])',rp,c)
  for m in mods:
   pat=re.compile(r'([\"\'])((?:\.{0,2}/)*'+re.escape(m)+r'(?:/[^\"\']*)?\.js)([\"\'])')
   def mk(m2):
    q=m2.group(1);p=m2.group(2);b=bare(p)
    return q+pre+b+q
   c=pat.sub(mk,c)
  if c!=o: open(fp,'w',encoding='utf-8').write(c);fix+=1;print('Fixed:',rel)
print('Total fixed:',fix)
"</command>
</write_to_file>