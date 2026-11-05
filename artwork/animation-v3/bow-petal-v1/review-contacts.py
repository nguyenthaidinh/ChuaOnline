"""Reproduce accepted own-source contact overlays; never derive another identity's coordinates.

The grips below were selected independently after viewing each identity's raw
hand grid. Contour masks use that same image's RGBA pixels inside its reviewed ROI.
Support contours are candidates until their separate foot board is inspected.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
GRIPS = {
    'woman': [(812, 396), (814, 337), (929, 266), (929, 326), (929, 326), (910, 338), (786, 524)],
    'granny': [(814, 395), (802, 336), (929, 265), (930, 326), (930, 326), (910, 338), (784, 504)],
}
ROIS = [(730, 350, 880, 460), (730, 290, 880, 395), (780, 200, 1030, 345),
        (780, 270, 1050, 465), (780, 270, 1050, 465), (780, 270, 1050, 465), (720, 440, 870, 615)]


def hull(points):
    points = sorted(set(points))
    def cross(a, b, c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    lower, upper = [], []
    for chain, ordered in [(lower, points), (upper, reversed(points))]:
        for point in ordered:
            while len(chain) >= 2 and cross(chain[-2], chain[-1], point) <= 0:
                chain.pop()
            chain.append(point)
    return lower[:-1]+upper[:-1]


def skin(image, roi):
    pixels = np.array(image)[roi[1]:roi[3], roi[0]:roi[2]].astype('int16')
    r, g, b, alpha = (pixels[:, :, i] for i in range(4))
    mask = (alpha > 220) & (r > 170) & (g > 105) & (b > 55) & (r-g > 20) & (g-b > 15)
    ys, xs = np.nonzero(mask)
    return [(int(x+roi[0]), int(y+roi[1])) for x, y in zip(xs, ys)]


def hands(appearance):
    annotations = json.loads((ROOT/'annotations.json').read_text(encoding='utf-8'))
    definitions = json.loads((ROOT/'sequences.json').read_text(encoding='utf-8'))
    ids = definitions['ids'][15:22]
    board = Image.new('RGB', (7*360, 650), '#eee6d5')
    for index, (frame_id, grip, roi) in enumerate(zip(ids, GRIPS[appearance], ROIS)):
        path = ROOT/appearance/(frame_id+'.png')
        image = Image.open(path).convert('RGBA')
        contour = skin(image, roi)
        if len(contour) < 400:
            raise ValueError(f'Insufficient own hand pixels: {appearance}/{frame_id}')
        # A 3 px native margin keeps the web prop behind the hand edge.
        mask = hull([(x+dx, y+dy) for x, y in hull(contour)
                     for dx, dy in [(-3,-3), (3,-3), (3,3), (-3,3)]])
        entry = {'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                 'hand': list(grip), 'handMask': [list(p) for p in mask],
                 'handReview': {'roi': list(roi), 'skinPixels': len(contour),
                     'method': 'Own viewed RGBA hand contour, convex hull with 3 native px margin; grip manually selected on own grid.'},
                 'review': 'Independently viewed this identity hand grid and accepted own mask/grip overlay; pre-release and release share its own grip point.'}
        annotations['appearances'][appearance][frame_id] = entry
        draw = ImageDraw.Draw(image)
        draw.line(mask+[mask[0]], fill='#10ee72', width=3)
        x,y=grip
        draw.ellipse((x-5,y-5,x+5,y+5), fill='#ff233e')
        crop=image.crop((680,180,1220,800))
        background=Image.new('RGBA',crop.size,'#eee6d5')
        background.alpha_composite(crop)
        background.thumbnail((350,600))
        board.paste(background.convert('RGB'),(index*360,35))
        ImageDraw.Draw(board).text((index*360+5,10),frame_id,fill='#43351e')
    (ROOT/'annotations.json').write_text(json.dumps(annotations,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    board.save(ROOT/appearance/'hand-review.jpg',quality=97)


if __name__ == '__main__':
    for appearance in ('woman','granny'):
        hands(appearance)
