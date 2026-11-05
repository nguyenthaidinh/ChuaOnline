import json,hashlib,sys
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path.cwd()/'scripts'));from pose_canvas import normalize_pose
root=Path.cwd();d=root/'artwork/animation-v3/stop-closes-v1/man/passing-v2'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
support=read(d/'support-feet.json');neutral=read(d/'reference-feet.json')['frames'];sel=read(d/'selection.json');jobs=[]
for path in ['generation.json','rearRight-refinement-generation.json','profile-support-correction-generation.json']:
 for job in read(d/path)['jobs']:
  p=d/job['output'];assert p.exists()
  references=[{'source':job['source'],'sha256':job['sourceSha256']}] if 'source' in job else [{'source':job['pose'],'sha256':job['poseSha256']},{'source':job['neutral'],'sha256':job['neutralSha256']}]
  for reference in references:assert sha(root/reference['source'])==reference['sha256'],(path,reference['source'])
  jobs.append({'output':job['output'],'source':p.relative_to(root).as_posix(),'sha256':sha(p),'generationManifest':path,'promptSha256':hashlib.sha256(job['prompt'].encode()).hexdigest(),'references':references})
selected=[{'id':key,**f} for key,f in support['frames'].items()]
drafts=[{'source':x['source'],'sha256':x['sha256'],'reason':'Retained original repeated-support pilot; replaced by corrected final opposite-support choreography.'} for x in jobs if x['output'] in ['rearRight/right.png','rearRight/left.png','right/left.png']]
(d/'handoff.json').write_text(json.dumps({'tool':'built-in image_gen','selectedPoses':16,'generatedOutputs':len(jobs),'retainedDrafts':drafts,'selectionSha256':sha(d/'selection.json'),'supportSha256':sha(d/'support-feet.json'),'neutralSha256':sha(d/'reference-feet.json'),'frames':selected,'provenance':jobs,'newlyGeneratedThisContinuation':{'source':'rearRight/left-v2.png','builtinSavedPath':'C:/Users/Admin/.codex/generated_images/01a1a94a-5b3d-77d0-ba4e-227caae26ea8/exec-d494b711-0f09-42e3-b890-6cd7747209e8.png'}},indent=2)+'\n',encoding='utf-8')
headings=['rear','rearRight','right','frontRight','front','frontLeft','left','rearLeft'];atlas=Image.new('RGBA',(432,8*192))
for row,h in enumerate(headings):
 for col,k in enumerate(['neutral','right','left']):
  path=root/neutral[h+'/right']['source'] if k=='neutral' else d/sel.get(h+'/'+k,h+'/'+k+'.png')
  frame,audit=normalize_pose(path);tile=frame.resize((144,192),Image.Resampling.LANCZOS);atlas.alpha_composite(tile,(col*144,row*192))
atlas.save(d/'qa-lod.webp',quality=95,method=4);decoded=Image.open(d/'qa-lod.webp').convert('RGBA')
for name,color in [('light','#e8e2d7'),('dark','#21180f')]:
 board=Image.new('RGB',(432,8*218),color);draw=ImageDraw.Draw(board)
 for row,h in enumerate(headings):
  for col,k in enumerate(['neutral','right','left']):
   tile=decoded.crop((col*144,row*192,(col+1)*144,(row+1)*192));board.paste(tile,(col*144,row*218+22),tile);draw.text((col*144+3,row*218+3),h+'/'+k,fill='#654b2c' if name=='light' else '#e1cfab')
 board.save(d/f'decoded-144-{name}.png')
print({'frames':len(selected),'outputs':len(jobs),'drafts':len(drafts),'maxPinAxis':max(max(map(abs,f['pinLogicalOffset'])) for f in support['frames'].values())})
