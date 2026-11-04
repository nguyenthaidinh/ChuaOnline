"""Compile separately generated identities and inspect their actual hand pixels.

The interaction target is fixed by choreography. Each identity must reach that target;
its skin mask and left/right hand centres are measured from its own source image.
This does not resize/recolour the male atlas or derive female contacts by halving it.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw
from pose_canvas import CANVAS, GROUND_PIVOT, normalize_pose

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'artwork/animation-v3/variants-v1'
PUBLIC = ROOT / 'public/assets/animation-v3'
BASE = json.loads((ROOT / 'artwork/animation-v3/incense-v1/review.json').read_text(encoding='utf-8'))
TARGETS = json.loads((ROOT / 'artwork/animation-v3/incense-v1/annotations.json').read_text(encoding='utf-8'))['frames']


def hull(points):
    points = sorted(set(points))
    def cross(a, b, c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    lower, upper = [], []
    for point in points:
        while len(lower) > 1 and cross(lower[-2], lower[-1], point) <= 0:
            lower.pop()
        lower.append(point)
    for point in reversed(points):
        while len(upper) > 1 and cross(upper[-2], upper[-1], point) <= 0:
            upper.pop()
        upper.append(point)
    return lower[:-1] + upper[:-1]


def measure_hands(image, target, name):
    # Restrict detection to the authored hand region, never the face/feet or entire body.
    scale = image.width / 1254
    polygon = [(x*scale, y*scale) for x, y in target['handMask']]
    bounds = (max(0, int(min(x for x, _ in polygon)-22*scale)),
              max(0, int(min(y for _, y in polygon)-22*scale)),
              min(image.width, int(max(x for x, _ in polygon)+22*scale)),
              min(image.height, int(max(y for _, y in polygon)+22*scale)))
    pixels = image.load()
    skin = []
    for y in range(bounds[1], bounds[3]):
        for x in range(bounds[0], bounds[2]):
            r, g, b, a = pixels[x, y]
            if a > 180 and r > 80 and r > g*1.075 and g > b*1.035 and r-b > 24:
                skin.append((x, y))
    if len(skin) < 50:
        raise ValueError(f'Hand region requires manual review: {name}')
    grip = [coordinate*scale for coordinate in target['grip']]
    nearest = min(skin,key=lambda point:math.dist(grip,point))
    separation = math.dist(grip,nearest)
    if separation > 36*scale:
        raise ValueError(f'Pose does not reach shared grip: {name}, gap={separation:.1f}px')
    if name.endswith('/12-contact-closed') and separation > 4*scale:
        raise ValueError(f'Insertion grip requires source correction: {name}')
    # Other poses follow the actual identity's fingers, rather than a male coordinate.
    if separation > 4*scale:
        grip = list(nearest)
    centres = {}
    for hand in ('leftHand', 'rightHand'):
        centre = [coordinate*scale for coordinate in target[hand]]
        local = [point for point in skin if math.dist(point, centre) < 34*scale]
        if len(local) < 20:
            raise ValueError(f'Missing {hand} near target: {name}')
        centres[hand] = [sum(point[axis] for point in local)/len(local) for axis in range(2)]
    mask = hull([(x+dx, y+dy) for x, y in hull(skin) for dx, dy in ((-3,-3),(3,-3),(3,3),(-3,3))])
    return {'grip': grip, **centres, 'handMask': mask, 'gripSkinGapPx': round(separation, 3)}, bounds


def compile_appearance(appearance):
    directory = OUTPUT / appearance
    missing = [frame['id'] for frame in BASE['frames'] if not (directory / (frame['id']+'.png')).is_file()]
    if missing:
        raise ValueError(f'Missing {appearance} poses: {missing}')
    atlas = Image.new('RGBA', (1536, 3072))
    board = Image.new('RGBA', (768, 1656), '#e8e2d7')
    hand_board = Image.new('RGB', (960, 900), '#eee6d5')
    draw, hand_draw = ImageDraw.Draw(board), ImageDraw.Draw(hand_board)
    geometries, audits, measurements = [], [], {}
    hand_index = 0
    for index, base in enumerate(BASE['frames']):
        name = base['id']
        source = directory / (name+'.png')
        frame, audit = normalize_pose(source)
        geometry = {'id': name, 'top': audit['bounds'][1], 'holdsIncense': base['holdsIncense']}
        if base['holdsIncense']:
            with Image.open(source) as original:
                original = original.convert('RGBA')
            contacts, bounds = measure_hands(original, TARGETS[name], appearance+'/'+name)
            measurements[name] = contacts
            factor = audit['scale']
            offset = [round(GROUND_PIVOT[i]-audit['sourcePivot'][i]*factor) for i in range(2)]
            def point(value):
                return {axis: round(value[i]*factor+offset[i], 3) for i, axis in enumerate(('x','y'))}
            for field in ('grip', 'leftHand', 'rightHand'):
                geometry[field] = point(contacts[field])
            geometry['handMask'] = [point(value) for value in contacts['handMask']]
            crop = original.crop(bounds)
            tile = Image.new('RGBA', crop.size, '#eee6d5')
            tile.alpha_composite(crop)
            cd = ImageDraw.Draw(tile)
            cd.polygon([(x-bounds[0], y-bounds[1]) for x,y in contacts['handMask']], outline='#458f59', width=2)
            gx, gy = contacts['grip'][0]-bounds[0], contacts['grip'][1]-bounds[1]
            cd.ellipse((gx-4,gy-4,gx+4,gy+4), outline='#c62828', width=2)
            tile.thumbnail((230, 200))
            x,y=hand_index%4*240,hand_index//4*225
            hand_board.paste(tile.convert('RGB'),(x,y+20))
            hand_draw.text((x+4,y+3),name,fill='#43351e')
            hand_index += 1
        atlas.alpha_composite(frame,(index%4*384,index//4*512))
        board.alpha_composite(frame.resize((192,256),Image.Resampling.LANCZOS),(index%4*192,index//4*276+20))
        draw.text((index%4*192+4,index//4*276+3),name,fill='#43351e')
        geometries.append(geometry)
        audits.append({'source':source.relative_to(ROOT).as_posix(),**audit,**geometry})
    atlas.save(directory/'incense-atlas.webp',quality=93,method=4)
    board.convert('RGB').save(directory/'contact-sheet.jpg',quality=95)
    hand_board.save(directory/'hand-review.jpg',quality=96)
    (directory/'contacts.json').write_text(json.dumps({'coordinateSpace':'actual source pixels',
        'method':'Own skin pixels in pose-constrained hand region; shared grip validated against source',
        'frames':measurements},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    texture = atlas.resize((768,1536),Image.Resampling.LANCZOS)
    temporary = PUBLIC/(appearance+'-incense-packing.webp')
    texture.save(temporary,quality=93,method=4)
    sha = hashlib.sha256(temporary.read_bytes()).hexdigest()
    path = PUBLIC/(appearance+'-incense-'+sha[:12]+'.webp')
    temporary.replace(path)
    asset = {'image':path.relative_to(ROOT/'public').as_posix(),'sha256':sha,
             'width':768,'height':1536,'columns':4,'rows':6,'cellWidth':192,'cellHeight':256}
    (directory/'review.json').write_text(json.dumps({'status':'compiled-review-required','asset':asset,
        'frames':audits},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return {'asset':asset,'frames':geometries}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--review',choices=['woman','granny'])
    args=parser.parse_args()
    PUBLIC.mkdir(exist_ok=True,parents=True)
    if args.review:
        result=compile_appearance(args.review)
        print(json.dumps({'appearance':args.review,'frames':len(result['frames'])}))
        return
    variants={appearance:compile_appearance(appearance) for appearance in ('woman','granny')}
    generated="// Generated by scripts/pack-variant-incense.py; own hand pixels reviewed per identity.\n"
    generated+="import type { IncenseGeometry } from './modernArtworkTypes.ts';\n"
    generated+="export const INCENSE_VARIANTS:Record<'woman'|'granny',{asset:{image:string;sha256:string;width:number;height:number;columns:number;rows:number;cellWidth:number;cellHeight:number};frames:readonly IncenseGeometry[]}> = "
    generated+=json.dumps(variants,separators=(',',':'))+';\n'
    (ROOT/'src/room/variantIncenseGeometry.ts').write_text(generated,encoding='utf-8')
    print(json.dumps({appearance:len(value['frames']) for appearance,value in variants.items()}))


if __name__=='__main__':
    main()
