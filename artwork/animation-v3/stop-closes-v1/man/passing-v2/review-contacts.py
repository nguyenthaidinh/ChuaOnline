import json,hashlib,sys
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path.cwd()/'scripts'))
from pose_canvas import normalize_pose
root=Path.cwd();d=root/'artwork/animation-v3/stop-closes-v1/man/passing-v2'
sel=json.loads((d/'selection.json').read_text(encoding='utf-8-sig')) if (d/'selection.json').exists() else {'rearRight/right':'rearRight/right-v2.png','rearRight/left':'rearRight/left-v2.png'}
(d/'selection.json').write_text(json.dumps(sel,indent=2)+'\n')
headings=['rear','rearRight','right','frontRight','front','frontLeft','left','rearLeft']
seeds={
 'rear/right':[620,1198],'rear/left':[590,1203],
 'rearRight/right':[610,1187],'rearRight/left':[520,1198],
 'right/right':[510,1189],'right/left':[675,1192],
 'frontRight/right':[605,1223],'frontRight/left':[675,1218],
 'front/right':[551,1225],'front/left':[638,1215],
 'frontLeft/right':[535,1214],'frontLeft/left':[604,1197],
 'left/right':[525,1190],'left/left':[660,1187],
 'rearLeft/right':[670,1198],'rearLeft/left':[596,1170]}
refs=json.loads((d/'reference-feet.json').read_text())['frames'];frames={}
previous=json.loads((d/'support-feet.json').read_text())['frames'] if (d/'support-feet.json').exists() else {}
board=Image.new('RGB',(1800,4*300),'#eee4d0');draw=ImageDraw.Draw(board)
lods={n:Image.new('RGB',(3*144,8*218),c) for n,c in [('light','#e8e2d7'),('dark','#21180f')]}
for i,(h,foot) in enumerate((h,f) for h in headings for f in ['right','left']):
 key=h+'/'+foot;p=d/sel.get(key,key+'.png');im=Image.open(p).convert('RGBA');pix=im.load();sx,sy=seeds[key]
 candidates=[]
 for y in range(max(0,sy-12),min(im.height,sy+13)):
  for x in range(max(0,sx-12),min(im.width,sx+13)):
   r,g,b,a=pix[x,y]
   if a>=200 and r>g+12 and g>b+8 and any(pix[x,yy][3]<80 for yy in range(y+1,min(im.height,y+8))):
    candidates.append(((x-sx)**2+(y-sy)**2,x,y))
 if not candidates:raise ValueError(key)
 _,x,y=min(candidates);native=(x,y);pose,audit=normalize_pose(p)
 point=[round(native[j]*audit['scale']+round([192,468][j]-audit['sourcePivot'][j]*audit['scale']),3) for j in range(2)]
 frames[key]={'source':p.relative_to(root).as_posix(),'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sourceSize':list(im.size),'sourcePoint':[x,y],'supportFoot':foot,'landmark':refs[key]['landmark'],'normalizedSupportPoint':point,'sampleRgba':list(pix[x,y]),'reviewed':False,'evidence':'support-contact-review.jpg','coordinateSpace':'native source PNG pixels','review':'Pending native grid verification. Same visible landmark class as own neutral.'}
 old=previous.get(key,{})
 if old.get('sourceSha256')==frames[key]['sourceSha256'] and old.get('sourcePoint')==frames[key]['sourcePoint'] and old.get('landmark')==frames[key]['landmark']:
  frames[key]['reviewed']=old.get('reviewed',False);frames[key]['review']=old.get('review',frames[key]['review'])
  for field in ['neutralSourceSha256','neutralPoint','pinLogicalOffset']:
   if field in old:frames[key][field]=old[field]
 col,row=i%4,i//4;x0,y0=col*450,row*300;crop=im.crop((350,975,800,1254));board.paste(crop,(x0,y0+21),crop);draw.text((x0+4,y0+3),key+' '+str([x,y]),fill='#25190b')
 for xx in range(400,800,50):
  draw.line((x0+xx-350,y0+21,x0+xx-350,y0+300),fill='#8e9a78');draw.text((x0+xx-348,y0+24),str(xx),fill='#43351e')
 for yy in range(1000,1254,50):
  draw.line((x0,y0+yy-975+21,x0+450,y0+yy-975+21),fill='#8e9a78');draw.text((x0+2,y0+yy-975+21),str(yy),fill='#43351e')
 xx,yy=x0+x-350,y0+y-975+21;draw.ellipse((xx-5,yy-5,xx+5,yy+5),outline='#d0003b',width=2)
 for name,lod in lods.items():
  row=headings.index(h);col=1 if foot=='right' else 2;small=pose.resize((144,192),Image.Resampling.LANCZOS);lod.paste(small,(col*144,row*218+22),small);ImageDraw.Draw(lod).text((col*144+2,row*218+4),key,fill='#614628' if name=='light' else '#e0d0ae')
  if foot=='right':
   neutral=normalize_pose(root/refs[key]['source'])[0].resize((144,192),Image.Resampling.LANCZOS);lod.paste(neutral,(0,row*218+22),neutral);ImageDraw.Draw(lod).text((2,row*218+4),h+' neutral',fill='#614628' if name=='light' else '#e0d0ae')
(d/'support-feet.json').write_text(json.dumps({'appearance':'man','status':'reviewed-own-native-source' if all(f['reviewed'] for f in frames.values()) else 'pending-native-contact-review','frames':frames,'note':'Native points selected from inspected grids, snapped within12nativepixels to the visible skin/alpha edge, then manually reviewed. Precision approximately2nativepixels; not optical tracking.'},indent=2)+'\n')
board.save(d/'support-contact-review.jpg',quality=97)
for n,lod in lods.items():lod.save(d/('decoded-144-'+n+'.png'))
print([(k,v['sourcePoint'],v['normalizedSupportPoint']) for k,v in frames.items()])
