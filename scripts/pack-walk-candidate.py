"""Normalize reviewed key poses on one fixed canvas; never crop/recenter each pose.

This writes authoring assets outside public/. --draft permits an incomplete study,
which remains explicitly marked as draft and must not be used in the live room.
"""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'artwork/animation-v3/walk-v1'
CANVAS = (384, 512)
GROUND_PIVOT = (192, 468)
NORMALIZED_SOURCE_PIVOT = (628, 1235)
SCALE_AT_1280 = 0.33
PHASES = [
    ('00-contact', 'Tiếp đất bước gần'),
    ('01-loading', 'Nhận trọng lượng'),
    ('02-support', 'Chân gần chịu lực'),
    ('03-passing', 'Chân xa đi qua'),
    ('04-late-passing', 'Chân xa tiến lên'),
    ('05-reaching', 'Chuẩn bị bước xa'),
    ('06-opposite-contact', 'Tiếp đất bước xa'),
    ('07-opposite-loading', 'Đổi trọng lượng'),
    ('08-opposite-support', 'Chân xa chịu lực'),
    ('09-opposite-passing', 'Chân gần đi qua'),
    ('10-opposite-late-passing', 'Chân gần tiến lên'),
    ('11-opposite-reaching', 'Chuẩn bị lặp chu kỳ'),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--draft', action='store_true')
    args = parser.parse_args()
    missing = [name for name, _ in PHASES if not (SOURCE / f'{name}.png').is_file()]
    if missing and not args.draft:
        raise SystemExit('Missing poses: ' + ', '.join(missing))

    frames, audit = [], []
    for name, phase in PHASES:
        path = SOURCE / f'{name}.png'
        if not path.is_file():
            continue
        with Image.open(path) as source:
            image = source.convert('RGBA')
        if image.width != image.height:
            raise ValueError(f'Review non-square source before packing: {name}')
        if image.getchannel('A').getextrema()[0] != 0:
            raise ValueError(f'Source lacks transparent pixels: {name}')

        scale = SCALE_AT_1280 * 1280 / image.width
        pivot = tuple(value * image.width / 1280 for value in NORMALIZED_SOURCE_PIVOT)
        resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
        offset = tuple(round(GROUND_PIVOT[i] - pivot[i] * scale) for i in range(2))
        bounds = resized.getchannel('A').point(lambda value: 255 if value > 24 else 0).getbbox()
        if not bounds:
            raise ValueError(f'Empty pose: {name}')
        target = tuple(bounds[i] + offset[i % 2] for i in range(4))
        if not (0 < target[0] < target[2] < CANVAS[0] and 0 < target[1] < target[3] < CANVAS[1]):
            raise ValueError(f'Clipped pose {name}: {target}')

        frame = Image.new('RGBA', CANVAS)
        frame.alpha_composite(resized, offset)
        frames.append(frame)
        # Inspection only: this region is never used to re-center or resize a frame.
        head_bounds = frame.getchannel('A').crop((120, 50, 270, 130)).point(
            lambda value: 255 if value > 128 else 0).getbbox()
        audit.append({
            'id': name, 'phase': phase, 'source': path.relative_to(ROOT).as_posix(),
            'sourceSize': list(image.size), 'sourcePivot': list(pivot), 'scale': scale,
            'bounds': list(target), 'headInspectionBounds': list(head_bounds) if head_bounds else None,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        })

    if not frames:
        raise SystemExit('No source poses found.')
    columns = 4
    rows = (len(frames) + columns - 1) // columns
    atlas = Image.new('RGBA', (CANVAS[0] * columns, CANVAS[1] * rows))
    board = Image.new('RGBA', (192 * columns, 276 * rows), (233, 226, 210, 255))
    draw = ImageDraw.Draw(board)
    for index, frame in enumerate(frames):
        x, y = index % columns, index // columns
        atlas.alpha_composite(frame, (x * CANVAS[0], y * CANVAS[1]))
        board.alpha_composite(frame.resize((192, 256), Image.Resampling.LANCZOS), (x * 192, y * 276 + 20))
        draw.text((x * 192 + 8, y * 276 + 4), audit[index]['id'], fill=(80, 65, 40))

    atlas.save(SOURCE / 'walk-atlas.webp', quality=93, method=4)
    board.convert('RGB').save(SOURCE / 'contact-sheet.jpg', quality=95)
    loop = []
    for frame in frames:
        background = Image.new('RGBA', CANVAS, (45, 34, 24, 255))
        background.alpha_composite(frame)
        loop.append(background)
    loop[0].save(SOURCE / 'review-loop.webp', save_all=True, append_images=loop[1:],
                 duration=round(1200 / len(loop)), loop=0, quality=93)
    manifest = {
        'status': 'draft' if missing else 'complete-unreviewed', 'missing': missing,
        'image': 'walk-atlas.webp', 'width': CANVAS[0], 'height': CANVAS[1],
        'columns': columns, 'rows': rows, 'durationMs': 1200, 'groundPivot': list(GROUND_PIVOT),
        'frames': audit,
    }
    (SOURCE / 'review.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'frames': len(frames), 'missing': missing, 'atlasBytes': (SOURCE / 'walk-atlas.webp').stat().st_size}))


if __name__ == '__main__':
    main()
