"""Fixed-canvas packing shared by the new gait and closing banks."""
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw
from pose_canvas import CANVAS, GROUND_PIVOT, normalize_pose

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public/assets/animation-v3'
WEB_CELL = (144, 192)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_selection(directory, ids):
    path = directory / 'selection.json'
    selected = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    if not isinstance(selected, dict) or set(selected) - set(ids):
        raise ValueError(f'Unknown selection IDs in {directory}')
    result = {}
    for frame_id in ids:
        value = selected.get(frame_id, frame_id + '.png')
        if not isinstance(value, str) or not value:
            raise ValueError(f'Invalid source: {frame_id}')
        source = (directory / value).resolve()
        if not source.is_relative_to(directory.resolve()) or source.suffix.lower() != '.png':
            raise ValueError(f'Source escapes its PNG group: {frame_id}')
        if not source.is_file():
            raise ValueError(f'Missing source: {source}')
        result[frame_id] = source
    return result


def compile_bank(directory, ids, slug, columns=8, normalizer=normalize_pose):
    sources = read_selection(directory, ids)
    rows = math.ceil(len(ids) / columns)
    atlas = Image.new('RGBA', (CANVAS[0]*columns, CANVAS[1]*rows))
    boards = {name: Image.new('RGBA', (192*columns, 276*rows), color)
              for name, color in [('light', '#e8e2d7'), ('dark', '#21180f')]}
    frames = []
    for cell, frame_id in enumerate(ids):
        path = sources[frame_id]
        image, audit = normalizer(path)
        x, y = cell % columns, cell // columns
        atlas.alpha_composite(image, (x*CANVAS[0], y*CANVAS[1]))
        for name, board in boards.items():
            board.alpha_composite(image.resize((192, 256), Image.Resampling.LANCZOS), (x*192, y*276+20))
            ImageDraw.Draw(board).text((x*192+4, y*276+3), frame_id,
                                      fill='#6a4d2d' if name == 'light' else '#dbc59c')
        frames.append({'cell':cell, 'id':frame_id, 'source':path.relative_to(ROOT).as_posix(), **audit})
    master = directory / 'atlas-master.webp'
    atlas.save(master, quality=95, method=4)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    temporary = PUBLIC / (slug+'-packing.webp')
    atlas.resize((WEB_CELL[0]*columns, WEB_CELL[1]*rows), Image.Resampling.LANCZOS).save(temporary, quality=95, method=4)
    digest = sha(temporary)
    destination = PUBLIC / f'{slug}-{digest[:12]}.webp'
    temporary.replace(destination)
    asset = {'image':destination.relative_to(ROOT/'public').as_posix(), 'sha256':digest,
             'width':WEB_CELL[0]*columns, 'height':WEB_CELL[1]*rows, 'columns':columns, 'rows':rows,
             'cellWidth':WEB_CELL[0], 'cellHeight':WEB_CELL[1]}
    for name, board in boards.items():
        board.convert('RGB').save(directory/f'compiled-{name}.jpg', quality=95)
    review = {'status':'compiled', 'canvas':list(CANVAS), 'groundPivot':list(GROUND_PIVOT),
              'master':master.name, 'masterSha256':sha(master), 'frames':frames, 'production':asset,
              'selectionSha256':sha(directory/'selection.json') if (directory/'selection.json').exists() else None}
    (directory/'review-compiled.json').write_text(json.dumps(review, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    return asset, frames
