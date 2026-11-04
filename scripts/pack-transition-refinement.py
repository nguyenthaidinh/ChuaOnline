"""Pack the refined transition study, preserving the v1 source and review artifacts."""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw
from pose_canvas import CANVAS, GROUND_PIVOT, normalize_pose

ROOT = Path(__file__).resolve().parent.parent
PREVIOUS = ROOT / 'artwork/animation-v3/transitions-v1'
OUTPUT = ROOT / 'artwork/animation-v3/transitions-v2'
ADDITIONS = [
    ('17-turn-first', 'Bắt đầu quay'), ('18-turn-second', 'Bước xoay nhỏ'),
    ('19-turn-fourth', 'Chuyển chân trụ'), ('20-turn-fifth', 'Ổn định hướng bàn thờ'),
    ('21-rise-lean', 'Nghiêng thân đặt tay'), ('22-rise-weight', 'Nâng hông trên chân trụ'),
    ('23-rise-extend', 'Rời gối thu chân'),
]
# Reviewed heel-contact samples in the 1254px masters, not alpha auto-centering.
# The right heel remains the support during these five rising poses.
RIGHT_CONTACTS = {
    '14-rise-support': (692.5, 1198), '22-rise-weight': (686.0, 1190),
    '15-rise-half-kneel': (702.5, 1171), '23-rise-extend': (688.7, 1207),
    '16-rise-crouch': (695.6, 1205),
}


def main():
    previous = json.loads((PREVIOUS / 'review.json').read_text(encoding='utf-8'))
    # One corrected half-kneel belongs to v2; all other v1 masters remain unchanged.
    sources = [((OUTPUT / '15-rise-half-kneel.png') if frame['id'] == '15-rise-half-kneel'
                else ROOT / frame['source'], frame['id'], frame['phase']) for frame in previous['frames']]
    sources += [(OUTPUT / f'{name}.png', name, phase) for name, phase in ADDITIONS]
    missing = [str(path.relative_to(ROOT)) for path, _, _ in sources if not path.is_file()]
    if missing:
        raise SystemExit('Missing poses: ' + ', '.join(missing))
    columns, rows = 4, (len(sources) + 3) // 4
    atlas = Image.new('RGBA', (CANVAS[0] * columns, CANVAS[1] * rows))
    board = Image.new('RGBA', (192 * columns, 276 * rows), (233, 226, 210, 255))
    draw = ImageDraw.Draw(board)
    entries = []
    for index, (path, name, phase) in enumerate(sources):
        frame, audit = normalize_pose(path)
        x, y = index % columns, index // columns
        atlas.alpha_composite(frame, (x * CANVAS[0], y * CANVAS[1]))
        board.alpha_composite(frame.resize((192, 256), Image.Resampling.LANCZOS), (x * 192, y * 276 + 20))
        draw.text((x * 192 + 6, y * 276 + 4), name, fill=(80, 65, 40))
        entry = {'id': name, 'phase': phase, 'source': path.relative_to(ROOT).as_posix(), **audit}
        if name in RIGHT_CONTACTS:
            scale = audit['scale']
            offset = [round(GROUND_PIVOT[i] - audit['sourcePivot'][i] * scale) for i in range(2)]
            entry['rightFoot'] = {axis: round(RIGHT_CONTACTS[name][i] * scale + offset[i], 3)
                                  for i, axis in enumerate(('x', 'y'))}
        entries.append(entry)
    output = OUTPUT / 'transition-atlas.webp'
    atlas.save(output, quality=93, method=4)
    board.convert('RGB').save(OUTPUT / 'contact-sheet.jpg', quality=95)
    manifest = {
        'status': 'complete-unreviewed', 'missing': [], 'image': output.name,
        'imageHash': hashlib.sha256(output.read_bytes()).hexdigest(),
        'width': CANVAS[0], 'height': CANVAS[1], 'columns': columns, 'rows': rows,
        'durationMs': len(entries) * 100, 'groundPivot': list(GROUND_PIVOT), 'frames': entries,
        'previousSource': PREVIOUS.relative_to(ROOT).as_posix(),
    }
    (OUTPUT / 'review.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'frames': len(entries), 'atlasBytes': output.stat().st_size}))


if __name__ == '__main__':
    main()
