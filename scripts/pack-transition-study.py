"""Export transition key poses on the exact same world canvas as the walking study."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw
from pose_canvas import CANVAS, GROUND_PIVOT, normalize_pose

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'artwork/animation-v3/transitions-v1'
PHASES = [
    ('00-stand-angled', 'Đứng chéo'), ('01-turn-mid', 'Quay về bàn thờ'),
    ('02-stand-rear', 'Đứng lưng thẳng'), ('03-weight-shift', 'Chuyển trọng lượng'),
    ('04-knee-bend', 'Khuỵu gối'), ('05-lower-knees', 'Hạ gối'),
    ('06-kneeling', 'Quỳ ổn định'), ('07-tuck-legs', 'Thu chân'),
    ('08-half-seated', 'Hạ thân'), ('09-seated-settle', 'Ổn định khi ngồi'),
    ('10-seated-rear', 'Ngồi nhìn tượng Phật'), ('11-step-ready', 'Chuẩn bị bước'),
    ('12-stop-close', 'Thu ngắn bước'), ('13-stop-settle', 'Ổn định khi dừng'),
    ('14-rise-support', 'Chống tay đứng dậy'), ('15-rise-half-kneel', 'Đặt chân làm điểm tựa'),
    ('16-rise-crouch', 'Đẩy thân đứng lên'),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--draft', action='store_true')
    args = parser.parse_args()
    missing = [name for name, _ in PHASES if not (SOURCE / f'{name}.png').is_file()]
    if missing and not args.draft:
        raise SystemExit('Missing poses: ' + ', '.join(missing))
    frames, entries = [], []
    for name, phase in PHASES:
        path = SOURCE / f'{name}.png'
        if not path.is_file():
            continue
        frame, audit = normalize_pose(path)
        frames.append(frame)
        entries.append({'id': name, 'phase': phase, 'source': path.relative_to(ROOT).as_posix(), **audit})
    if not frames:
        raise SystemExit('No transition sources found.')
    columns, rows = 4, (len(frames) + 3) // 4
    atlas = Image.new('RGBA', (CANVAS[0] * columns, CANVAS[1] * rows))
    board = Image.new('RGBA', (192 * columns, 276 * rows), (233, 226, 210, 255))
    draw = ImageDraw.Draw(board)
    for index, frame in enumerate(frames):
        x, y = index % columns, index // columns
        atlas.alpha_composite(frame, (x * CANVAS[0], y * CANVAS[1]))
        board.alpha_composite(frame.resize((192, 256), Image.Resampling.LANCZOS), (x * 192, y * 276 + 20))
        draw.text((x * 192 + 6, y * 276 + 4), entries[index]['id'], fill=(80, 65, 40))
    output = SOURCE / 'transition-atlas.webp'
    atlas.save(output, quality=93, method=4)
    board.convert('RGB').save(SOURCE / 'contact-sheet.jpg', quality=95)
    manifest = {
        'status': 'draft' if missing else 'complete-unreviewed', 'missing': missing,
        'image': output.name, 'imageHash': hashlib.sha256(output.read_bytes()).hexdigest(),
        'width': CANVAS[0], 'height': CANVAS[1], 'columns': columns, 'rows': rows,
        'durationMs': 1700, 'groundPivot': list(GROUND_PIVOT), 'frames': entries,
    }
    (SOURCE / 'review.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'frames': len(frames), 'missing': missing, 'atlasBytes': output.stat().st_size}))


if __name__ == '__main__':
    main()
