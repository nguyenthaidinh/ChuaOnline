from pathlib import Path
import json,hashlib,sys
from PIL import Image,ImageDraw
root=Path.cwd();sys.path.insert(0,str(root/'scripts'));from pose_canvas import normalize_pose
own=root/'artwork/animation-v3/stop-closes-v1/man';read=lambda path:json.loads(path.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
closing=read(own/'support-contacts.json')['frames'];passing=read(own/'passing-v2/support-feet.json')['frames'];neutral=read(own/'passing-v2/reference-feet.json')['frames'];overrides=read(own/'canvas-overrides.json')
headings=['rear','rearRight','right','frontRight','front','frontLeft','left','rearLeft'];tiles=[];sourceaudit={}
def pose(annotation,offset=None):
 path=root/annotation['source'];near=overrides.get(path.relative_to(own).as_posix(),{}) if path.is_relative_to(own) else {}
 if near:assert near['reviewed'] and near['sourceSha256']==sha(path)
 frame,audit=normalize_pose(path,allow_near_square=bool(near));sourceaudit[annotation['source']]=audit
 if offset:
  moved=Image.new('RGBA',frame.size);moved.alpha_composite(frame,(round(offset[0]),round(offset[1])));frame=moved
 return frame.resize((144,192),Image.Resampling.LANCZOS)
for h in headings:
 for foot in ['right','left']:
  key=h+'/'+foot;tiles.append([pose(passing[key],passing[key]['pinLogicalOffset']),pose(closing[key+'-gather'],closing[key+'-gather']['pinLogicalOffset']),pose(closing[key+'-close'],closing[key+'-close']['pinLogicalOffset']),pose(neutral[key])])
alpha=Image.new('RGBA',(576,16*192))
for row,frames in enumerate(tiles):
 for col,tile in enumerate(frames):alpha.alpha_composite(tile,(col*144,row*192))
alpha.save(own/'qa-closing-sequences.webp',quality=95,method=4);decoded=Image.open(own/'qa-closing-sequences.webp').convert('RGBA')
for batch in range(2):
 for name,col in [('light','#e8e2d7'),('dark','#21180f')]:
  board=Image.new('RGB',(576,8*218),col);draw=ImageDraw.Draw(board)
  for rr in range(8):
   row=batch*8+rr;h=headings[row//2];foot=['right','left'][row%2]
   for cc,label in enumerate(['passing60','gather110','close130','neutral120']):
    tile=decoded.crop((cc*144,row*192,(cc+1)*144,(row+1)*192));board.paste(tile,(cc*144,rr*218+22),tile);draw.text((cc*144+2,rr*218+3),h+'/'+foot+' '+label,fill='#654b2c' if name=='light' else '#e1cfab')
  board.save(own/f'closing-sequence-{batch+1}-{name}.png')
(own/'source-audit.json').write_text(json.dumps({'canvas':[384,512],'lod':[144,192],'status':'decoded-sequence-review-pending','sources':sourceaudit,'closingSha256':sha(own/'support-contacts.json'),'passingSha256':sha(own/'passing-v2/support-feet.json'),'canvasOverridesSha256':sha(own/'canvas-overrides.json')},indent=2)+'\n',encoding='utf8')
print('32 closing +16 passing pins encoded/decoded,16 sequences')
