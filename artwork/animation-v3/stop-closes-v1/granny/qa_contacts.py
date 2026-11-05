"""Inspect and record visible support landmarks on the selected stop sources."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
GAIT = ROOT / 'artwork/animation-v3/variant-gaits-v1/granny'
sys.path.insert(0, str(ROOT / 'scripts'))
from pose_canvas import GROUND_PIVOT, normalize_pose

HEADINGS = ('rear', 'rearRight', 'right', 'frontRight', 'front', 'frontLeft', 'left', 'rearLeft')
POSES = ('right-gather', 'right-close', 'left-gather', 'left-close')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path, default=None):
    return json.loads(path.read_text(encoding='utf-8-sig')) if path.exists() else default


def selected(key):
    heading, pose = key.split('/')
    if heading not in HEADINGS or pose not in POSES:
        raise ValueError(f'Unknown stop pose: {key}')
    selection = read(SOURCE / 'selection.json', {})
    path = (SOURCE / selection.get(key, key + '.png')).resolve()
    if not path.is_relative_to(SOURCE) or path.suffix != '.png' or not path.is_file():
        raise ValueError(f'Selected source must be an existing own PNG: {key}')
    with Image.open(path) as image:
        if image.mode != 'RGBA' or image.getchannel('A').getextrema() != (0, 255):
            raise ValueError(f'Genuine RGBA required: {path}')
    return path


def make_grid(key):
    path = selected(key)
    with Image.open(path) as image:
        box = (200, 850, min(image.width, 1050), image.height)
        crop = image.crop(box)
    panel = Image.new('RGBA', crop.size, '#e8e2d7')
    panel.alpha_composite(crop)
    overlay = Image.new('RGBA', crop.size)
    pen = ImageDraw.Draw(overlay)
    for x in range(box[0], box[2], 10):
        local = x - box[0]
        pen.line((local, 0, local, panel.height), fill=(30, 80, 170, 65 if x % 50 == 0 else 20))
        if x % 50 == 0:
            pen.text((local + 2, 3), str(x), fill=(10, 45, 110, 240))
    for y in range(box[1], box[3], 10):
        local = y - box[1]
        pen.line((0, local, panel.width, local), fill=(30, 80, 170, 65 if y % 50 == 0 else 20))
        if y % 50 == 0:
            pen.text((3, local + 2), str(y), fill=(10, 45, 110, 240))
    panel.alpha_composite(overlay)
    destination = SOURCE / 'qa/feet-review' / (key.replace('/', '-') + '.jpg')
    destination.parent.mkdir(parents=True, exist_ok=True)
    panel.convert('RGB').save(destination, quality=97)
    return {'id': key, 'source': path.relative_to(ROOT).as_posix(), 'sourceSha256': digest(path),
            'crop': list(box), 'evidence': destination.relative_to(SOURCE).as_posix()}


def logical_point(path, point):
    _, audit = normalize_pose(path)
    return [GROUND_PIVOT[i] + (point[i] - audit['sourcePivot'][i]) * audit['scale'] for i in (0, 1)]


def record(key, foot, point, review):
    path = selected(key)
    heading, pose = key.split('/')
    if foot != pose.split('-')[0]:
        raise ValueError('Observed support foot disagrees with the contract; refine the pose before approval.')
    if len(review) < 40:
        raise ValueError('A concrete visual review note is required.')
    evidence = SOURCE / 'qa/feet-review' / (key.replace('/', '-') + '.jpg')
    if not evidence.exists():
        raise ValueError('Inspect the native grid before recording a point.')
    grids = {frame['id']: frame for frame in read(SOURCE / 'qa/feet-review/grids.json', {'frames': []})['frames']}
    if key not in grids or grids[key]['sourceSha256'] != digest(path):
        raise ValueError('Native review grid must match the current selected PNG hash.')
    neutral = read(GAIT / 'neutral-feet.json')['frames'][heading + '/stand']
    neutral_path = ROOT / neutral['source']
    if digest(neutral_path) != neutral['sourceSha256']:
        raise ValueError('Own neutral reference changed after annotation.')
    with Image.open(path) as image:
        if image.getpixel(tuple(point))[3] < 160:
            raise ValueError('Point must lie on visible selected source pixels.')
        size = list(image.size)
    actual = logical_point(path, point)
    target = logical_point(neutral_path, neutral['points'][foot])
    offset = [target[i] - actual[i] for i in (0, 1)]
    length = math.hypot(*offset)
    if length > 45:
        raise ValueError(f'Pin delta {length:.2f} exceeds45logical pixels; reject source/landmark, do not widen the limit.')
    document_path = SOURCE / 'support-contacts.json'
    document = read(document_path, {'appearance': 'granny', 'coordinateSpace': 'Native selected PNG pixels, origin top-left',
                                   'frames': {}, 'note': 'Manually reviewed same-type plantar landmarks; no hidden heels inferred.'})
    entry = {'source': path.relative_to(ROOT).as_posix(), 'sourceSha256': digest(path), 'sourceSize': size,
             'supportFoot': foot, 'point': point, 'landmark': neutral['landmarks'][foot], 'reviewed': True,
             'review': review, 'evidence': evidence.relative_to(SOURCE).as_posix(),
             'neutralSourceSha256': neutral['sourceSha256'], 'neutralPoint': neutral['points'][foot],
             'pinLogicalOffset': offset, 'pinLogicalLength': length}
    previous = document['frames'].get(key)
    if previous and previous['source'] == entry['source'] and previous['sourceSha256'] != entry['sourceSha256']:
        raise ValueError('Previously reviewed raw source changed. Preserve corrections as versioned siblings.')
    document['frames'][key] = entry
    document['status'] = 'complete' if len(document['frames']) == 32 else 'partial'
    document_path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: entry}))


def board(heading):
    if heading not in HEADINGS:
        raise ValueError(f'Unknown heading: {heading}')
    frames = []
    gait_selection = read(GAIT / 'selection.json', {})
    for foot, passing in (('right', '02-passing'), ('left', '06-opposite-passing')):
        paths = [(f'{foot}: passing', GAIT / gait_selection.get(heading + '/' + passing, heading + '/' + passing + '.png')),
                 (f'{foot}: gather', selected(heading + '/' + foot + '-gather')),
                 (f'{foot}: close', selected(heading + '/' + foot + '-close')),
                 (f'{foot}: neutral', GAIT / heading / 'stand.png')]
        for label, path in paths:
            image, _ = normalize_pose(path)
            frames.append((label, image.resize((144, 192), Image.Resampling.LANCZOS)))
    for background, color in (('light', '#e8e2d7'), ('dark', '#241b13')):
        panel = Image.new('RGBA', (576, 424), color)
        pen = ImageDraw.Draw(panel)
        for index, (label, image) in enumerate(frames):
            x, y = index % 4 * 144, index // 4 * 212
            panel.alpha_composite(image, (x, y + 20))
            pen.text((x + 4, y + 3), label, fill='#62472b' if background == 'light' else '#e0c59b')
        (SOURCE / 'qa').mkdir(exist_ok=True)
        panel.convert('RGB').save(SOURCE / 'qa' / f'{heading}-review-{background}.jpg', quality=97)
    print(json.dumps({'reviewedSequenceBoard': heading, 'note': 'Source positions shown without runtime pin offsets.'}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    grid = commands.add_parser('grid')
    grid.add_argument('keys', nargs='+')
    annotate = commands.add_parser('record')
    annotate.add_argument('key')
    annotate.add_argument('foot', choices=('right', 'left'))
    annotate.add_argument('x', type=int)
    annotate.add_argument('y', type=int)
    annotate.add_argument('--review', required=True)
    boards = commands.add_parser('board')
    boards.add_argument('heading', choices=HEADINGS)
    args = parser.parse_args()
    if args.command == 'grid':
        index = SOURCE / 'qa/feet-review/grids.json'
        existing = read(index, {'frames': []})['frames']
        merged = {frame['id']: frame for frame in existing + [make_grid(key) for key in args.keys]}
        index.write_text(json.dumps({'coordinateSpace': 'Native selected PNG pixels, origin top-left',
                                     'frames': list(merged.values())}, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'grids': len(args.keys)}))
    elif args.command == 'record':
        record(args.key, args.foot, [args.x, args.y], args.review)
    else:
        board(args.heading)


if __name__ == '__main__':
    main()
