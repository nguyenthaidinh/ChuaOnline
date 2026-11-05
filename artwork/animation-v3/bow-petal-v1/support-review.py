"""Measure own visible contact contour candidates; acceptance is a separate review step."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parent
spec = spec_from_file_location('own_hands', ROOT/'review-contacts.py')
helper = module_from_spec(spec)
spec.loader.exec_module(helper)
# Manually selected on each own native rise-contact-detail.png heel contour.
# The lowest-row quantile can land at mid-sole/toes when a soft heel slopes up;
# these mark the posterior sole curve where that visible heel meets the floor.
POSTERIOR_SOLE = {
    'woman': {'12-rise-support': [697,1166], '13-rise-half-kneel': [691,1153],
              '22-rise-weight-transfer': [646,1153]},
    'granny': {'12-rise-support': [704,1165], '13-rise-half-kneel': [694,1153],
               '22-rise-weight-transfer': [647,1151]},
}


def measure(appearance, accept):
    definition = json.loads((ROOT/'sequences.json').read_text(encoding='utf-8'))
    selected = json.loads((ROOT/'selection.json').read_text(encoding='utf-8'))
    annotations = json.loads((ROOT/'annotations.json').read_text(encoding='utf-8'))
    candidates = {}
    ids = [frame_id for frame_id in definition['ids']
           if int(frame_id[:2]) == 0 or 2 <= int(frame_id[:2]) <= 14 or frame_id.startswith('22-')]
    board = Image.new('RGB', (1800, 3*260), '#eee6d5')
    for index, frame_id in enumerate(ids):
        path = ROOT/selected.get(f'{appearance}/{frame_id}',f'{appearance}/{frame_id}.png')
        x,y=index%5*360,index//5*260
        draw=ImageDraw.Draw(board)
        if not path.exists():
            draw.text((x+5,y+10),frame_id+' pending',fill='#43351e')
            continue
        image=Image.open(path).convert('RGBA')
        number=int(frame_id[:2])
        if number in (0,14):
            roi=[440,1090,600,1220];landmark='leftSoleContact';reference='00-neutral';quantile=.15
        elif number in (12,13,22):
            roi=[600,1100,920,1220];landmark='rightSoleContact';reference='12-rise-support';quantile=.15
        else:
            roi=[440,1120,660,1220];landmark='frontToeContact';reference='03-kneel-rest';quantile=.5
        contour=helper.skin(image,roi)
        if not contour:
            raise ValueError(f'No own contact pixels: {appearance}/{frame_id}')
        bottom=max(point[1] for point in contour)
        footx=int(np.quantile([point[0] for point in contour if point[1]>=bottom-2],quantile))
        point=[footx,bottom-1]
        posterior = POSTERIOR_SOLE[appearance].get(frame_id)
        if posterior:
            point = posterior
            landmark = 'rightPosteriorSoleContact'
        annotation={'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                    'support':{'point':point,'landmark':landmark,'reference':reference,
                               'reviewRoi':roi,'method':'Measured on own skin/alpha floor-contact contour; own board review required.'}}
        if posterior:
            annotation['support']['method']='Own posterior sole curve manually selected from native heel detail; lowest-row quantile targets mid-sole and is not used.'
        candidates[frame_id]=annotation
        if accept:
            annotation['review']='Own visible toe/sole contour and fixed camera verified on this identity source foot board; no other identity contact coordinates reused.'
            annotations['appearances'][appearance][frame_id]=annotation
        pen=ImageDraw.Draw(image)
        pen.line((point[0]-10,point[1],point[0]+10,point[1]),fill='#ff2345',width=4)
        pen.line((point[0],point[1]-10,point[0],point[1]+10),fill='#ff2345',width=4)
        crop=image.crop((350,950,950,1250))
        background=Image.new('RGBA',crop.size,'#eee6d5');background.alpha_composite(crop)
        background.thumbnail((350,190))
        board.paste(background.convert('RGB'),(x,y+35))
        draw.text((x+5,y+10),f'{frame_id} {point}',fill='#43351e')
    (ROOT/appearance/'contact-candidates.json').write_text(json.dumps(candidates,indent=2)+'\n',encoding='utf-8')
    board.save(ROOT/appearance/'contact-review.jpg',quality=97)
    if accept:
        if len(candidates)!=15:
            raise ValueError('Cannot accept a partial contact board.')
        (ROOT/'annotations.json').write_text(json.dumps(annotations,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'appearance':appearance,'contacts':len(candidates),'accepted':accept}))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('appearance',choices=['woman','granny'])
    parser.add_argument('--accept',action='store_true');args=parser.parse_args()
    measure(args.appearance,args.accept)
