"""Encode actual timed browser screenshots, preserving their captured timestamps."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,subprocess,collections
ROOT=Path(__file__).resolve().parent.parent
RAW=ROOT/'.local-qa/visual-recording';OUT=ROOT/'docs/visual-upgrade'
rows=json.loads((RAW/'proof-captures.json').read_text(encoding='utf-8'))
assert rows and all((RAW/row['file']).is_file() for row in rows)
lines=['ffconcat version 1.0']
for i,row in enumerate(rows):
 lines.append("file '"+(RAW/row['file']).as_posix()+"'")
 lines.append(f"duration {(rows[i+1]['at']-row['at'])/1000 if i+1<len(rows) else .2:.6f}")
lines.append("file '"+(RAW/rows[-1]['file']).as_posix()+"'")
(RAW/'sequence.ffconcat').write_text('\n'.join(lines)+'\n',encoding='utf-8')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(RAW/'sequence.ffconcat'),'-fps_mode','vfr','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'ritual-sequence.mp4')],check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_entries','format=duration,size:stream=width,height,avg_frame_rate,codec_name','-of','json',str(OUT/'ritual-sequence.mp4')],text=True,encoding='utf-8'))
bows=[r for r in rows if r['label']=='final-bow'];visits=0;last='';counts=set()
for row in bows:
 for actor in row['state'].get('actors',[]):
  counts.add(int(actor['bows']));clip=actor['clip']
  if clip=='bowHold' and last!='bowHold':visits+=1
  last=clip
assert visits==3,visits
assert counts=={0,1,2,3},counts
# A storyboard from actual frames, plus separate contact details for larger inspection.
selections=[('Vào điện',lambda r:r['label']=='final-entry' and r['at']-rows[0]['at']>=2000 and any(a['phase']=='entering' for a in r['state']['actors'])),('An tọa',lambda r:r['label']=='final-entry' and any(a['clip']=='seated' for a in r['state']['actors'])),('Quỳ xuống',lambda r:r['label']=='final-bow' and any(a['clip']=='kneelDown' and a['frame']=='2' for a in r['state']['actors']))]
for number in range(3):selections.append((f'Lạy {number+1}',lambda r,n=number:r['label']=='final-bow' and any(a['clip']=='bowHold' and a['bows']==str(n) for a in r['state']['actors'])))
selections += [('Quay về',lambda r:r['label']=='final-bow' and any(a['phase']=='returning' and a['clip']=='walkFront' for a in r['state']['actors'])),('Nâng hương',lambda r:r['label']=='final-incense' and any(a['frame']=='10' for a in r['state']['actors'])),('Đặt hương',lambda r:r['label']=='final-incense' and any(a['frame']=='12' for a in r['state']['actors']))]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
board=Image.new('RGB',(1440,780),(28,21,15));draw=ImageDraw.Draw(board)
for i,(label,predicate)in enumerate(selections):
 row=next(r for r in rows if predicate(r));im=Image.open(RAW/row['file']).convert('RGB');im=im.crop((410,325,930,575)).resize((480,231),Image.Resampling.LANCZOS)
 x,y=i%3*480,i//3*260;board.paste(im,(x,y+26));draw.text((x+12,y+2),label,fill=(234,215,177),font=font)
board.save(OUT/'ritual-storyboard.jpg',quality=94)
report={'captureMethod':'Timed screenshots from the actual production browser using CUA, encoded as VFR H.264; no synthetic animation or audio track','capturedFrames':len(rows),'capturedSeconds':round((rows[-1]['at']-rows[0]['at'])/1000,3),'observedFloorBows':visits,'observedBowCounts':sorted(counts),'video':probe,'labels':dict(collections.Counter(r['label'] for r in rows))}
(OUT/'video-verification.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
