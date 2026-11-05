"""Review brown-clothed source poses without exporting runtime placeholders."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
from pose_canvas import CANVAS, GROUND_PIVOT, normalize_pose

HEADINGS = ('rear', 'rearRight', 'right', 'frontRight', 'front', 'frontLeft', 'left', 'rearLeft')
PHASES = ('00-contact', '01-loading', '02-passing', '03-swing', '04-opposite-contact',
          '05-opposite-loading', '06-opposite-passing', '07-opposite-swing')
COLORS = {'light': '#e8e2d7', 'dark': '#241b13'}


def selected_path(heading, phase, selection):
    relative = selection.get(f'{heading}/{phase}', f'{heading}/{phase}.png')
    if not isinstance(relative, str) or not relative:
        raise ValueError(f'Invalid selection: {heading}/{phase}')
    path = (SOURCE / relative).resolve()
    if not path.is_relative_to(SOURCE) or path.suffix.lower() != '.png':
        raise ValueError(f'Selected source must stay inside this PNG group: {relative}')
    return path


def source_frame(heading, phase, selection):
    path = selected_path(heading, phase, selection)
    with Image.open(path) as image:
        if image.mode != 'RGBA' or image.getchannel('A').getextrema() != (0, 255):
            raise ValueError(f'Expected genuine RGBA source: {path}')
    normalized, audit = normalize_pose(path)
    return normalized, {'id': f'{heading}-{phase}', 'heading': heading, 'phase': phase,
                        'source': path.relative_to(ROOT).as_posix(), **audit}


def draw_board(frames, columns, rows, name, stem, width=192):
    height = width * 4 // 3
    board = Image.new('RGBA', (columns * width, rows * (height + 20)), COLORS[name])
    pen = ImageDraw.Draw(board)
    for index, (image, audit) in enumerate(frames):
        x, y = index % columns * width, index // columns * (height + 20)
        board.alpha_composite(image.resize((width, height), Image.Resampling.LANCZOS), (x, y + 20))
        pen.text((x + 5, y + 4), audit['id'],
                 fill='#62472b' if name == 'light' else '#e0c59b')
    board.convert('RGB').save(SOURCE / f'{stem}-{name}.jpg', quality=95)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--heading', choices=HEADINGS)
    parser.add_argument('--anchors', action='store_true')
    parser.add_argument('--stands', action='store_true')
    parser.add_argument('--lod', action='store_true', help='Inspect the parent integration LOD at144x192 without changing source geometry.')
    args = parser.parse_args()
    width = 144 if args.lod else 192
    lod_suffix = '-lod144' if args.lod else ''
    selection = json.loads((SOURCE / 'selection.json').read_text(encoding='utf-8'))
    allowed = {f'{heading}/{phase}' for heading in HEADINGS for phase in ('stand',) + PHASES}
    if not isinstance(selection, dict) or set(selection) - allowed:
        raise ValueError('Unknown selection keys.')
    headings = (args.heading,) if args.heading else HEADINGS
    phases = ('stand',) if args.stands else ('stand', '00-contact', '04-opposite-contact') if args.anchors else ('stand',) + PHASES
    missing = [f'{heading}/{phase}' for heading in headings for phase in phases
               if not selected_path(heading, phase, selection).is_file()]
    if missing:
        raise SystemExit('Review needs actual sources: ' + ', '.join(missing))
    combined, records = [], []
    for heading in headings:
        frames = [source_frame(heading, phase, selection) for phase in phases]
        combined.extend(frames)
        records.extend(audit for _, audit in frames)
        if not args.stands:
            for name in COLORS:
                draw_board(frames, 3 if args.anchors else 4, 1 if args.anchors else 3,
                           name, heading + ('-anchors' if args.anchors else '-review') + lod_suffix, width)
        if not args.anchors and not args.stands:
            sequence = []
            for image, _ in frames[1:]:
                size = (144, 192) if args.lod else CANVAS
                background = Image.new('RGBA', size, COLORS['dark'])
                background.alpha_composite(image.resize(size, Image.Resampling.LANCZOS) if args.lod else image)
                sequence.append(background)
            sequence[0].save(SOURCE / f'{heading}-loop{lod_suffix}.webp', save_all=True,
                             append_images=sequence[1:], duration=120, loop=0, quality=92, method=4)
    if args.stands:
        for name in COLORS:
            draw_board(combined, 4, 2, name, 'stands' + lod_suffix, width)
    elif len(headings) == len(HEADINGS):
        for name in COLORS:
            draw_board(combined, len(phases), len(HEADINGS), name,
                       ('anchors' if args.anchors else 'contact-sheet') + lod_suffix, width)
    status = 'source-reviewed' if not args.anchors and not args.stands and len(headings) == 8 else 'source-review-subset'
    document = {'status': status, 'appearance': 'granny', 'canvas': list(CANVAS),
                'groundPivot': list(GROUND_PIVOT), 'headings': list(headings),
                'phases': list(phases), 'mirrored': False, 'frames': records,
                'previewSize': [144, 192] if args.lod else list(CANVAS),
                'loopMs': 960, 'note': 'Source-board review only; not browser evidence or FPS measurement.'}
    suffix = 'review.json' if status == 'source-reviewed' else 'stands-review.json' if args.stands else 'anchors-review.json' if len(headings) == 8 else headings[0] + '-review.json'
    if args.lod:
        suffix = suffix[:-5] + '-lod144.json'
    (SOURCE / suffix).write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': status, 'frames': len(records), 'review': suffix}))


if __name__ == '__main__':
    main()
