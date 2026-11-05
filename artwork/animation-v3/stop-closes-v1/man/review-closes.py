"""Rebuild own-source closing contact candidates; changed points or sources lose approval."""
import hashlib,json,sys
from pathlib import Path
from PIL import Image,ImageDraw
root=Path.cwd();sys.path.insert(0,str(root/'scripts'))
from pose_canvas import normalize_pose
own=root/'artwork/animation-v3/stop-closes-v1/man'
read=lambda path:json.loads(path.read_text(encoding='utf-8-sig'))
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
selection=read(own/'selection.json');refs=read(own/'passing-v2/reference-feet.json')['frames']
seeds=read(own/'manual-reviewed-seeds.json')
previous=read(own/'support-contacts.json')['frames'] if (own/'support-contacts.json').exists() else {}
frames={}
for key,seed in seeds.items():
 heading,pose=key.split('/');lead=pose.split('-')[0];path=own/selection.get(key,key+'.png')
 im=Image.open(path).convert('RGBA')
 overrides=read(own/'canvas-overrides.json') if (own/'canvas-overrides.json').exists() else {}
 permission=overrides.get(path.relative_to(own).as_posix(),{})
 near_square=permission.get('reviewed') and permission.get('sourceSha256')==sha(path)
 assert im.width==im.height or near_square
 candidates=[]
 for y in range(max(0,seed[1]-12),min(im.height,seed[1]+13)):
  for x in range(max(0,seed[0]-12),min(im.width,seed[0]+13)):
   r,g,b,a=im.getpixel((x,y))
   if a>=200 and r>90 and r>g*1.10 and g>b*1.03:
    candidates.append(((x-seed[0])**2+(y-seed[1])**2,[x,y]))
 if not candidates:raise ValueError('No actual foot pixels: '+key)
 point=min(candidates)[1];_,audit=normalize_pose(path,allow_near_square=bool(near_square));reference=refs[heading+'/'+lead]
 normalized=[round(point[i]*audit['scale']+round([192,468][i]-audit['sourcePivot'][i]*audit['scale']),4) for i in range(2)]
 offset=[round(reference['normalizedSupportPoint'][i]-normalized[i],4) for i in range(2)]
 assert max(map(abs,offset))<=45
 l,t,r,b=audit['bounds'];assert 0<l+offset[0]<r+offset[0]<384 and 0<t+offset[1]<b+offset[1]<512
 frame={'source':path.relative_to(root).as_posix(),'sourceSha256':sha(path),'sourceSize':list(im.size),
  'supportFoot':lead,'point':point,'landmark':reference['landmark'],'sampleRgba':list(im.getpixel(tuple(point))),
  'neutralSourceSha256':reference['sourceSha256'],'neutralPoint':reference['sourcePoint'],
  'normalizedSupportPoint':normalized,'pinLogicalOffset':offset,'reviewed':False,
  'review':'Pending manual native landmark and support-leg review.',
  'method':'Native grid seed manually chosen; snapped at most12sourcepixels to visible skin alpha>=200. Approximately2pixel measurement precision, not optical tracking.',
  'evidence':'closing-contact-review-'+str(['rear','rearRight','right','frontRight','front','frontLeft','left','rearLeft'].index(heading)//4+1)+'.jpg'}
 old=previous.get(key,{})
 if old.get('sourceSha256')==frame['sourceSha256'] and old.get('point')==point and old.get('landmark')==frame['landmark']:
  frame['reviewed']=old.get('reviewed',False);frame['review']=old.get('review',frame['review'])
 frames[key]=frame
(own/'support-contacts.json').write_text(json.dumps({'appearance':'man','status':'complete' if len(frames)==32 and all(f['reviewed'] for f in frames.values()) else 'partial','frames':frames},indent=2)+'\n',encoding='utf8')
headings=['rear','rearRight','right','frontRight','front','frontLeft','left','rearLeft']
for batch in range(2):
 board=Image.new('RGB',(2200,1080),'#e6ddcd');draw=ImageDraw.Draw(board)
 for row,h in enumerate(headings[batch*4:batch*4+4]):
  for col,pose in enumerate(['right-gather','right-close','left-gather','left-close']):
   key=h+'/'+pose;im=Image.open(own/selection.get(key,key+'.png')).convert('RGBA');x0,y0=col*550,row*270
   crop=im.crop((350,1005,900,1254));board.paste(crop,(x0,y0+21),crop);draw.text((x0+4,y0+3),key+('' if key in frames else ' PENDING'),fill='#33220f')
   for x in range(400,900,50):
    draw.line((x0+x-350,y0+21,x0+x-350,y0+270),fill='#b9aa94');draw.text((x0+x-348,y0+24),str(x),fill='#33220f')
   for y in range(1050,1254,50):
    draw.line((x0,y0+21+y-1005,x0+550,y0+21+y-1005),fill='#b9aa94');draw.text((x0+2,y0+21+y-1005),str(y),fill='#33220f')
   if key in frames:
    x,y=frames[key]['point'];px,py=x0+x-350,y0+21+y-1005;draw.ellipse((px-5,py-5,px+5,py+5),outline='#f60053',width=2);draw.text((x0+170,y0+3),str([x,y]),fill='#ae0038')
 board.save(own/f'closing-contact-review-{batch+1}.jpg',quality=97)
print({'measured':len(frames),'reviewed':sum(f['reviewed'] for f in frames.values()),'maxPin':max(max(map(abs,f['pinLogicalOffset'])) for f in frames.values())})
