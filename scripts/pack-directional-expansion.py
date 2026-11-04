"""Compile five independently authored headings with fixed camera/canvas geometry."""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw
from pose_canvas import CANVAS, GROUND_PIVOT, normalize_pose

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'artwork/animation-v3/directions-v2'
PUBLIC = ROOT / 'public/assets/animation-v3'
HEADINGS = ('rear', 'rearLeft', 'frontLeft', 'front', 'frontRight')
STAND_HEADINGS = HEADINGS + ('left', 'right')
PHASES = ('00-contact', '01-loading', '02-passing', '03-swing', '04-opposite-contact',
          '05-opposite-loading', '06-opposite-passing', '07-opposite-swing')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def selected_source(selected, heading, phase):
    name = selected.get(f'{heading}/{phase}', f'{heading}/{phase}.png')
    if not isinstance(name, str) or not name:
        raise ValueError(f'Invalid selected source: {heading}/{phase}')
    source_root = SOURCE.resolve()
    path = (source_root / name).resolve()
    try:
        path.relative_to(source_root)
    except ValueError as error:
        raise ValueError(f'Selected source escapes the direction group: {heading}/{phase}') from error
    if path.suffix.lower() != '.png':
        raise ValueError(f'Selected source must be PNG: {heading}/{phase}')
    return path


def main():
    selections = SOURCE / 'selection.json'
    selected = json.loads(selections.read_text(encoding='utf-8')) if selections.exists() else {}
    allowed = {f'{heading}/{phase}' for heading in HEADINGS for phase in PHASES}
    allowed.update(f'{heading}/stand' for heading in STAND_HEADINGS)
    if not isinstance(selected, dict) or set(selected) - allowed:
        raise ValueError('Direction selections must use known pose keys.')
    missing = [f'{heading}/{phase}' for heading in HEADINGS for phase in PHASES
               if not selected_source(selected, heading, phase).is_file()]
    missing += [f'{heading}/stand' for heading in STAND_HEADINGS
                if not selected_source(selected, heading, 'stand').is_file()]
    if missing:
        raise SystemExit('Missing expansion poses: ' + ', '.join(missing))
    PUBLIC.mkdir(parents=True, exist_ok=True)
    rows = (len(HEADINGS) * len(PHASES) + len(STAND_HEADINGS) + 3) // 4
    atlas = Image.new('RGBA', (CANVAS[0] * 4, CANVAS[1] * rows))
    combined = {name: Image.new('RGBA', (192 * 4, 276 * 10), color)
                for name, color in [('light', '#e8e2d7'), ('dark', '#20170f')]}
    frames, geometry = [], {}
    for direction_index, heading in enumerate(HEADINGS):
        geometry[heading] = []
        boards = {name: Image.new('RGBA', (192 * 4, 276 * 2), color)
                  for name, color in [('light', '#e8e2d7'), ('dark', '#20170f')]}
        pens = {name: ImageDraw.Draw(board) for name, board in boards.items()}
        sequence = []
        for phase_index, phase in enumerate(PHASES):
            path = selected_source(selected, heading, phase)
            image, audit = normalize_pose(path)
            cell = len(frames)
            x, y = cell % 4, cell // 4
            atlas.alpha_composite(image, (x * CANVAS[0], y * CANVAS[1]))
            frame_id = f'{heading}-{phase}'
            frames.append({'cell': cell, 'id': frame_id, 'kind': 'walk', 'source': path.relative_to(ROOT).as_posix(), **audit})
            geometry[heading].append({'cell': cell, 'id': frame_id, 'top': audit['bounds'][1]})
            for name, board in boards.items():
                bx, by = phase_index % 4 * 192, phase_index // 4 * 276
                board.alpha_composite(image.resize((192, 256), Image.Resampling.LANCZOS), (bx, by + 20))
                pens[name].text((bx + 5, by + 4), frame_id,
                                fill='#765936' if name == 'light' else '#dbc29a')
            background = Image.new('RGBA', CANVAS, '#302318')
            background.alpha_composite(image)
            sequence.append(background)
        sequence[0].save(SOURCE / f'{heading}-loop.webp', save_all=True, append_images=sequence[1:],
                         duration=120, loop=0, quality=92, method=4)
        for name, board in boards.items():
            board.convert('RGB').save(SOURCE / f'{heading}-{name}.jpg', quality=95)
            combined[name].alpha_composite(board, (0, direction_index * 276 * 2))
    stands = {}
    stand_boards = {name: Image.new('RGBA', (192 * 4, 276 * 2), color)
                    for name, color in [('light', '#e8e2d7'), ('dark', '#20170f')]}
    for index, heading in enumerate(STAND_HEADINGS):
        path = selected_source(selected, heading, 'stand')
        image, audit = normalize_pose(path)
        cell, frame_id = len(frames), f'{heading}-stand'
        atlas.alpha_composite(image, (cell % 4 * CANVAS[0], cell // 4 * CANVAS[1]))
        frames.append({'cell': cell, 'id': frame_id, 'kind': 'stand',
                       'source': path.relative_to(ROOT).as_posix(), **audit})
        stands[heading] = {'cell': cell, 'id': frame_id, 'top': audit['bounds'][1]}
        for name, board in stand_boards.items():
            x, y = index % 4 * 192, index // 4 * 276
            board.alpha_composite(image.resize((192, 256), Image.Resampling.LANCZOS), (x, y + 20))
            ImageDraw.Draw(board).text((x + 5, y + 4), frame_id,
                                      fill='#765936' if name == 'light' else '#dbc29a')
    for name, board in stand_boards.items():
        board.convert('RGB').save(SOURCE / f'stands-{name}.jpg', quality=95)
    master = SOURCE / 'expanded-direction-atlas.webp'
    atlas.save(master, quality=93, method=4)
    for name, board in combined.items():
        board.convert('RGB').save(SOURCE / f'contact-sheet-{name}.jpg', quality=95)
    texture = atlas.resize((768, rows * 256), Image.Resampling.LANCZOS)
    temporary = PUBLIC / 'expanded-directions-packing.webp'
    texture.save(temporary, quality=93, method=4)
    sha = digest(temporary)
    destination = PUBLIC / f'expanded-directions-{sha[:12]}.webp'
    temporary.replace(destination)
    artwork = {'image': destination.relative_to(ROOT / 'public').as_posix(), 'sha256': sha,
               'width': 768, 'height': rows * 256, 'columns': 4, 'rows': rows,
               'cellWidth': 192, 'cellHeight': 256}
    review = {'status': 'compiled', 'appearance': 'man', 'canvas': list(CANVAS),
              'groundPivot': list(GROUND_PIVOT), 'master': master.name, 'masterSha256': digest(master),
              'directions': list(HEADINGS), 'standDirections': list(STAND_HEADINGS),
              'mirrored': False, 'frames': frames, 'production': artwork,
              'loopMs': 960, 'loopNote': 'Atlas-source preview, not browser recording or FPS measurement.'}
    (SOURCE / 'review.json').write_text(json.dumps(review, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    generated = '// Generated by scripts/pack-directional-expansion.py; logical geometry 384x512, independent headings.\n'
    generated += 'export const EXPANDED_DIRECTION_ARTWORK = ' + json.dumps(artwork) + ' as const;\n'
    generated += "export type ExpandedHeading = 'rear'|'rearLeft'|'frontLeft'|'front'|'frontRight';\n"
    generated += 'export const EXPANDED_DIRECTION_WALKS:Record<ExpandedHeading,readonly {cell:number;id:string;top:number}[]> = '
    generated += json.dumps(geometry) + ';\n'
    generated += "export type ExpandedStandHeading = ExpandedHeading|'left'|'right';\n"
    generated += 'export const EXPANDED_DIRECTION_STANDS:Record<ExpandedStandHeading,{cell:number;id:string;top:number}> = '
    generated += json.dumps(stands) + ';\n'
    (ROOT / 'src/room/expandedDirectionGeometry.ts').write_text(generated, encoding='utf-8')
    print(json.dumps({'frames': len(frames), 'production': artwork, 'bytes': destination.stat().st_size}))


if __name__ == '__main__':
    main()
