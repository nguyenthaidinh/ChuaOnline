"""Compile the separately authored bell grips and two-handed tray poses."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw
from pose_canvas import CANVAS, GROUND_PIVOT, normalize_pose

ROOT=Path(__file__).resolve().parent.parent
DIRECTORY=ROOT/'artwork/animation-v3/rituals-v1'
PUBLIC=ROOT/'public/assets/animation-v3'
IDS=['bell-ready','bell-contact','bell-recoil','lotus-chest','lotus-place']


def hull(points):
    points=sorted(set(points))
    def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    lower,upper=[],[]
    for p in points:
        while len(lower)>1 and cross(lower[-2],lower[-1],p)<=0:lower.pop()
        lower.append(p)
    for p in reversed(points):
        while len(upper)>1 and cross(upper[-2],upper[-1],p)<=0:upper.pop()
        upper.append(p)
    return lower[:-1]+upper[:-1]


def hand_geometry(image,name):
    scale=image.width/1254
    skin=[]
    for y in range(int(240*scale),int(680*scale)):
        for x in range(int(730*scale),int(1140*scale)):
            r,g,b,a=image.getpixel((x,y))
            if a>230 and r>170 and g>105 and b>55 and r>g*1.10 and g>b*1.06 and r-b>45:
                skin.append((x,y))
    if len(skin)<100:raise ValueError(f'Hand needs manual annotation: {name}')
    # The action hand is the furthest skin component to the right, outside torso/face.
    right=max(x for x,y in skin)
    reach=95 if name.startswith('bell') else 180
    selected=[p for p in skin if p[0]>right-reach*scale]
    xs=sorted(x for x,y in selected);ys=sorted(y for x,y in selected)
    grip=[xs[len(xs)//2],ys[len(ys)//2]]
    polygon=hull([(x+dx,y+dy) for x,y in hull(selected) for dx,dy in ((-3,-3),(3,-3),(3,3),(-3,3))])
    return {'grip':grip,'handMask':polygon,'pixelCount':len(selected)}


def compile_appearance(appearance):
    directory=DIRECTORY/appearance
    missing=[name for name in IDS if not (directory/(name+'.png')).is_file()]
    if missing:raise ValueError(f'Missing {appearance}: {missing}')
    atlas=Image.new('RGBA',(1152,1024))
    board=Image.new('RGBA',(960,276),'#e8e2d7')
    hands=Image.new('RGB',(1200,280),'#eee6d5')
    draw=ImageDraw.Draw(board);hd=ImageDraw.Draw(hands)
    frames=[];source_audit=[]
    for index,name in enumerate(IDS):
        path=directory/(name+'.png')
        frame,audit=normalize_pose(path)
        with Image.open(path) as image:image=image.convert('RGBA')
        raw=hand_geometry(image,name)
        source_audit.append({'id':name,'source':path.relative_to(ROOT).as_posix(),**audit,'contacts':raw})
        factor=audit['scale'];offset=[round(GROUND_PIVOT[i]-audit['sourcePivot'][i]*factor) for i in range(2)]
        def point(value):return {axis:round(value[i]*factor+offset[i],3) for i,axis in enumerate(('x','y'))}
        geometry={'id':name,'cell':index,'top':audit['bounds'][1],'hand':point(raw['grip']),
                  'handMask':[point(value) for value in raw['handMask']]}
        frames.append(geometry)
        atlas.alpha_composite(frame,(index%3*384,index//3*512))
        board.alpha_composite(frame.resize((192,256),Image.Resampling.LANCZOS),(index*192,20))
        draw.text((index*192+4,3),name,fill='#43351e')
        polygon=raw['handMask'];bounds=(int(min(x for x,y in polygon)-8),int(min(y for x,y in polygon)-8),int(max(x for x,y in polygon)+8),int(max(y for x,y in polygon)+8))
        crop=image.crop(bounds);tile=Image.new('RGBA',crop.size,'#eee6d5');tile.alpha_composite(crop)
        td=ImageDraw.Draw(tile);td.polygon([(x-bounds[0],y-bounds[1]) for x,y in polygon],outline='#458f59',width=2)
        gx,gy=raw['grip'][0]-bounds[0],raw['grip'][1]-bounds[1]
        td.ellipse((gx-4,gy-4,gx+4,gy+4),outline='#c62828',width=2)
        tile.thumbnail((230,240));hands.paste(tile.convert('RGB'),(index*240,25));hd.text((index*240+4,3),name,fill='#43351e')
    atlas.save(directory/'ritual-atlas.webp',quality=93,method=4)
    board.convert('RGB').save(directory/'contact-sheet.jpg',quality=95)
    hands.save(directory/'hand-review.jpg',quality=96)
    texture=atlas.resize((576,512),Image.Resampling.LANCZOS)
    temporary=PUBLIC/(appearance+'-ritual-packing.webp');texture.save(temporary,quality=93,method=4)
    sha=hashlib.sha256(temporary.read_bytes()).hexdigest();path=PUBLIC/(appearance+'-ritual-'+sha[:12]+'.webp');temporary.replace(path)
    asset={'image':path.relative_to(ROOT/'public').as_posix(),'sha256':sha,'width':576,'height':512,'columns':3,'rows':2}
    result={'asset':asset,'frames':frames}
    (directory/'review.json').write_text(json.dumps({'status':'compiled-review-required',**result,'sourceAudit':source_audit},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return result


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--review',choices=['man','woman','granny']);args=parser.parse_args()
    PUBLIC.mkdir(exist_ok=True,parents=True)
    if args.review:
        print(json.dumps(compile_appearance(args.review)['asset']));return
    data={appearance:compile_appearance(appearance) for appearance in ('man','woman','granny')}
    code="// Generated by scripts/pack-ritual-poses.py; reviewed grips are native logical384x512.\n"
    code+="import type { Appearance } from './protocol.ts';\nimport type { HandAnchor } from './animationManifest.ts';\n"
    code+="export interface RitualPoseGeometry {id:string;cell:number;top:number;hand:HandAnchor;handMask:HandAnchor[]}\n"
    code+="export const RITUAL_ARTWORK:Record<Appearance,{asset:{image:string;sha256:string;width:number;height:number;columns:number;rows:number};frames:readonly RitualPoseGeometry[]}> = "+json.dumps(data,separators=(',',':'))+';\n'
    (ROOT/'src/room/ritualPoseGeometry.ts').write_text(code,encoding='utf-8')
    print(json.dumps({name:len(value['frames']) for name,value in data.items()}))


if __name__=='__main__':main()
