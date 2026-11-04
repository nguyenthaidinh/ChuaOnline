from pathlib import Path
from PIL import Image,ImageDraw
import json
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'public/assets/visual-v2'
all_geometry={}
for skin in ['woman','granny']:
 src=ROOT/'artwork/visual-v2/characters'/skin/'atlas-study.png'
 im=Image.open(src).convert('RGBA')
 if abs(im.width/im.height-0.9)>0.015:raise ValueError(f'{skin}: grid aspect changed {im.size}')
 if im.getchannel('A').getextrema()[0]!=0:raise ValueError(f'{skin}: no transparency')
 # Resize the WHOLE 6x5 atlas, preserving every established frame origin; never re-center cells.
 im=im.resize((1152,1280),Image.Resampling.LANCZOS)
 geometry={};board=Image.new('RGBA',im.size,(245,240,226,255));board.alpha_composite(im)
 for i in range(30):
  x,y=(i%6)*192,(i//6)*256;cell=im.crop((x,y,x+192,y+256));bounds=cell.getchannel('A').point(lambda p:255 if p>100 else 0).getbbox()
  if not bounds or bounds[0]<=0 or bounds[1]<=0 or bounds[2]>=192 or bounds[3]>=256:raise ValueError(f'{skin} clipped or missing frame{i}: {bounds}')
  geometry[i]={'top':bounds[1]}
 im.save(OUT/f'{skin}-atlas.webp',quality=90,method=4,exact=False)
 cell=im.crop((4*192,0,5*192,256));cell=cell.crop(cell.getchannel('A').getbbox());cell.save(OUT/f'{skin}-preview.webp',quality=90,method=4,exact=False)
 board.convert('RGB').save(ROOT/'docs/visual-upgrade'/f'{skin}-atlas-check.jpg',quality=94)
 all_geometry[skin]=geometry
 print(skin,Image.open(src).size,'web',im.size,(OUT/f'{skin}-atlas.webp').stat().st_size)
(ROOT/'src/room/variantGeometry.ts').write_text('// Generated from inspected whole-atlas variants; hands share the original world anchors.\nexport const VARIANT_GEOMETRY: Record<string,Record<number,{top:number}>> = '+json.dumps(all_geometry,separators=(',',':'))+';\n',encoding='utf-8')
