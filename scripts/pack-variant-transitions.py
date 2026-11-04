"""Compile identity-specific standing/sitting sources and measured support contacts.

Clip timing comes from the reviewed transition study. Source pixels and foot contacts
belong to the selected identity; no male root compensation is copied into a variant.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw
from pose_canvas import CANVAS, GROUND_PIVOT, normalize_pose

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'artwork/animation-v3/variant-transitions-v1'
BASE = ROOT / 'artwork/animation-v3/transitions-v2'
PUBLIC = ROOT / 'public/assets/animation-v3'
APPEARANCES = ('woman', 'granny')
CLIPS = ('standUp', 'sitDown')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_inputs():
    review = json.loads((BASE / 'review.json').read_text(encoding='utf-8'))
    sequences = json.loads((BASE / 'sequences.json').read_text(encoding='utf-8'))
    frames = review['frames']
    if len(frames) != 24 or len({frame['id'] for frame in frames}) != 24:
        raise ValueError('Expected the reviewed 24-pose transition source.')
    clips = {name: sequences['clips'][name] for name in CLIPS}
    for name, clip in clips.items():
        previous = 0
        for step in clip['steps']:
            if step['bank'] != 'transition' or step['frameId'] != frames[step['index']]['id']:
                raise ValueError(f'Unsupported source bank or ID mapping in {name}.')
            if step['startMs'] != previous or step['endMs'] <= previous:
                raise ValueError(f'Non-contiguous timing in {name}.')
            previous = step['endMs']
        if previous != clip['durationMs']:
            raise ValueError(f'Timeline duration mismatch in {name}.')
    return frames, clips


def selected_path(appearance, frame_id, selection):
    relative = selection.get(f'{appearance}/{frame_id}', f'{appearance}/{frame_id}.png')
    path = (SOURCE / relative).resolve()
    if (path.parent != (SOURCE / appearance).resolve() or path.suffix.lower() != '.png'
            or not path.stem.startswith(frame_id)):
        raise ValueError(f'Unsafe source selection: {relative}')
    return path


def contact_ids(clips):
    return {step['frameId'] for clip in clips.values() for step in clip['steps']
            if step.get('rightFootReference')}


def normalize_contact(path, audit, annotation):
    if annotation.get('sourceSha256') != audit['sha256']:
        raise ValueError(f'Remeasure contact after changing source: {path.name}')
    point = annotation.get('rightHeel')
    if not isinstance(point, list) or len(point) != 2 or not all(
            isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
            for value in point):
        raise ValueError(f'Missing own measured heel: {path.name}')
    if not all(0 <= point[i] < audit['sourceSize'][i] for i in range(2)):
        raise ValueError(f'Heel outside source: {path.name}')
    with Image.open(path) as image:
        image = image.convert('RGBA')
        x, y = (round(value) for value in point)
        neighbourhood = image.getchannel('A').crop((max(0, x-5), max(0, y-5),
                                                    min(image.width, x+6), min(image.height, y+6)))
        if neighbourhood.getextrema()[1] < 160:
            raise ValueError(f'Measured heel is not near visible source pixels: {path.name}')
    factor = audit['scale']
    offset = [round(GROUND_PIVOT[i] - audit['sourcePivot'][i] * factor) for i in range(2)]
    result = {axis: round(point[i] * factor + offset[i], 3) for i, axis in enumerate(('x', 'y'))}
    if not (0 <= result['x'] <= CANVAS[0] and 0 <= result['y'] <= CANVAS[1]):
        raise ValueError(f'Heel outside logical canvas: {path.name}')
    return result


def source_frames(appearance, definitions, selection, annotations, required, strict):
    images, records = [], []
    for index, definition in enumerate(definitions):
        frame_id = definition['id']
        path = selected_path(appearance, frame_id, selection)
        if not path.is_file():
            raise ValueError(f'Missing {appearance} pose: {frame_id}')
        image, audit = normalize_pose(path)
        entry = {'id': frame_id, 'index': index, 'phase': definition['phase'], 'selected': True,
                 'source': path.relative_to(ROOT).as_posix(), **audit}
        annotation = annotations.get(frame_id)
        if frame_id in required:
            if annotation:
                entry['rightFoot'] = normalize_contact(path, audit, annotation)
                entry['rightHeelSource'] = annotation['rightHeel']
                entry['contactNote'] = annotation.get('note', '')
            elif strict:
                raise ValueError(f'Missing own heel annotation: {appearance}/{frame_id}')
        images.append(image)
        records.append(entry)
    return images, records


def write_boards(appearance, images, records):
    directory = SOURCE / appearance
    for name, colour, ink in [('light', '#e8e2d7', '#765936'), ('dark', '#20170f', '#dbc29a')]:
        board = Image.new('RGBA', (768, 1656), colour)
        pen = ImageDraw.Draw(board)
        for record, image in zip(records, images):
            x, y = record['index'] % 4 * 192, record['index'] // 4 * 276
            board.alpha_composite(image.resize((192, 256), Image.Resampling.LANCZOS), (x, y+20))
            pen.text((x+5, y+3), record['id'], fill=ink)
            if 'rightFoot' in record:
                point = record['rightFoot']
                cx, cy = x+point['x']/2, y+20+point['y']/2
                pen.ellipse((cx-3, cy-3, cx+3, cy+3), outline='#4dcf9b', width=2)
        board.convert('RGB').save(directory / f'contact-sheet-{name}.jpg', quality=95)


def write_contact_calibration(appearance, definitions, selection, required, annotations=None):
    """Show source pixels/grid for independent heel measurements, without making annotations."""
    order = [frame['id'] for frame in definitions if frame['id'] in required]
    board = Image.new('RGB', (600 * len(order), 460), '#eee6d5')
    pen = ImageDraw.Draw(board)
    bodies = Image.new('RGBA', (192*len(order), 276), '#eee6d5')
    body_pen = ImageDraw.Draw(bodies)
    records = []
    for index, frame_id in enumerate(order):
        path = selected_path(appearance, frame_id, selection)
        if not path.is_file():
            raise ValueError(f'Missing foot source: {appearance}/{frame_id}')
        with Image.open(path) as image:
            image = image.convert('RGBA')
        normalized, _ = normalize_pose(path)
        bodies.alpha_composite(normalized.resize((192, 256), Image.Resampling.LANCZOS), (index*192, 20))
        body_pen.text((index*192+4, 3), frame_id, fill='#43351e')
        factor = image.width / 1254
        box = tuple(round(value * factor) for value in (480, 1040, 870, 1254))
        crop = image.crop(box)
        tile = Image.new('RGBA', crop.size, '#eee6d5')
        tile.alpha_composite(crop)
        tile = tile.resize((600, 330), Image.Resampling.NEAREST)
        board.paste(tile.convert('RGB'), (index*600, 65))
        pen.text((index*600+6, 4), frame_id, fill='#43351e')
        pen.text((index*600+6, 21), f'source {image.width}x{image.height}; x={box[0]}..{box[2]}, y={box[1]}..{box[3]}', fill='#43351e')
        for x in range(500, 870, 20):
            screen = index*600+(x*factor-box[0])/(box[2]-box[0])*600
            pen.line((screen, 65, screen, 395), fill='#a8bdb8', width=1)
            pen.text((screen-10, 405), str(round(x*factor)), fill='#43351e')
        for y in range(1060, 1254, 20):
            screen = 65+(y*factor-box[1])/(box[3]-box[1])*330
            pen.line((index*600, screen, (index+1)*600, screen), fill='#a8bdb8', width=1)
            pen.text((index*600+4, screen+2), str(round(y*factor)), fill='#43351e')
        annotation = (annotations or {}).get(frame_id)
        if annotation and annotation.get('sourceSha256') == digest(path):
            cx, cy = annotation['rightHeel']
            px = index*600+(cx-box[0])/(box[2]-box[0])*600
            py = 65+(cy-box[1])/(box[3]-box[1])*330
            pen.line((px-9, py, px+9, py), fill='#c62828', width=2)
            pen.line((px, py-9, px, py+9), fill='#c62828', width=2)
            pen.text((index*600+6, 438), f'heel ({cx}, {cy})', fill='#a01818')
        records.append({'id': frame_id, 'source': path.relative_to(ROOT).as_posix(),
                        'sourceSize': list(image.size), 'sourceSha256': digest(path),
                        'crop': list(box), 'displaySize': [600, 330]})
    directory = SOURCE/appearance
    board.save(directory/'foot-calibration.jpg', quality=97)
    bodies.convert('RGB').save(directory/'support-poses.jpg', quality=96)
    (directory/'foot-calibration.json').write_text(json.dumps(records, indent=2)+'\n', encoding='utf-8')


def compile_clips(records, definitions):
    by_id = {record['id']: record for record in records}
    compiled = {}
    for name, clip in definitions.items():
        steps = []
        for source in clip['steps']:
            frame = by_id[source['frameId']]
            offset = {'x': 0, 'y': 0}
            reference_id = source.get('rightFootReference')
            if reference_id:
                reference = by_id[reference_id]['rightFoot']
                offset = {axis: round(reference[axis] - frame['rightFoot'][axis], 3)
                          for axis in ('x', 'y')}
                if max(abs(value) for value in offset.values()) > 20:
                    raise ValueError(f'Large root correction requires source review: {frame["id"]}')
            bounds = frame['bounds']
            shifted = (bounds[0]+offset['x'], bounds[1]+offset['y'],
                       bounds[2]+offset['x'], bounds[3]+offset['y'])
            if not (0 < shifted[0] < shifted[2] < CANVAS[0]
                    and 0 < shifted[1] < shifted[3] < CANVAS[1]):
                raise ValueError(f'Root correction would clip the pose: {frame["id"]}')
            steps.append({'id': frame['id'], 'index': frame['index'], 'bank': 'transition',
                          'startMs': source['startMs'], 'endMs': source['endMs'],
                          'rootOffset': offset, 'top': frame['bounds'][1]})
        compiled[name] = steps
    return compiled


def write_loops(directory, images, clips):
    for name, steps in clips.items():
        sequence, durations = [], []
        columns, rows = 7, math.ceil(len(steps)/7)
        storyboard = Image.new('RGBA', (columns*192, rows*276), '#302318')
        pen = ImageDraw.Draw(storyboard)
        for index, step in enumerate(steps):
            image = Image.new('RGBA', CANVAS, '#302318')
            offset = step['rootOffset']
            # Preview rounds to atlas pixels. Runtime uses the unrounded logical root offset.
            image.alpha_composite(images[step['index']], (round(offset['x']), round(offset['y'])))
            sequence.append(image)
            durations.append(step['endMs']-step['startMs'])
            x, y = index % columns*192, index // columns*276
            storyboard.alpha_composite(image.resize((192, 256), Image.Resampling.LANCZOS), (x, y+20))
            pen.text((x+4, y+3), step['id'], fill='#dbc29a')
        sequence[0].save(directory/f'{name}-loop.webp', save_all=True,
                         append_images=sequence[1:]+[sequence[-1]], duration=durations+[600],
                         loop=0, quality=92, method=4)
        storyboard.convert('RGB').save(directory/f'{name}-storyboard.jpg', quality=96)


def export_appearance(appearance, images, records, clips):
    directory = SOURCE / appearance
    atlas = Image.new('RGBA', (1536, 3072))
    for index, image in enumerate(images):
        atlas.alpha_composite(image, (index % 4 * 384, index // 4 * 512))
    master = directory/'movement-atlas.webp'
    atlas.save(master, quality=93, method=4)
    texture = atlas.resize((768, 1536), Image.Resampling.LANCZOS)
    temporary = PUBLIC/f'{appearance}-movement-packing.webp'
    texture.save(temporary, quality=93, method=4)
    sha = digest(temporary)
    destination = PUBLIC/f'{appearance}-movement-{sha[:12]}.webp'
    temporary.replace(destination)
    # Review the decoded production texture as well as the lossless source poses.
    with Image.open(destination) as encoded:
        decoded = encoded.convert('RGBA')
    for name, colour in [('light', '#e8e2d7'), ('dark', '#20170f')]:
        board = Image.new('RGBA', decoded.size, colour)
        board.alpha_composite(decoded)
        board.convert('RGB').save(directory/f'production-atlas-{name}.jpg', quality=96)
    asset = {'image': destination.relative_to(ROOT/'public').as_posix(), 'sha256': sha,
             'width': 768, 'height': 1536, 'columns': 4, 'rows': 6,
             'cellWidth': 192, 'cellHeight': 256}
    idle = next(frame for frame in records if frame['id'] == '10-seated-rear')
    write_boards(appearance, images, records)
    write_loops(directory, images, clips)
    review = {'status': 'compiled', 'appearance': appearance, 'canvas': list(CANVAS),
              'groundPivot': list(GROUND_PIVOT), 'master': master.name, 'masterSha256': digest(master),
              'sourceManifestSha256': digest(BASE/'review.json'),
              'sourceTimelineSha256': digest(BASE/'sequences.json'),
              'selectionManifestSha256': digest(SOURCE/'selection.json'),
              'contactsManifestSha256': digest(SOURCE/'contacts.json'), 'frames': records,
              'clips': clips, 'production': asset,
              'reviewNote': 'Own annotated heel contacts; image boards/source loops require visual review.'}
    (directory/'review.json').write_text(json.dumps(review, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    return {'asset': asset, 'clips': clips,
            'idle': {'id': idle['id'], 'index': idle['index'], 'top': idle['bounds'][1]}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--review', choices=APPEARANCES,
                        help='Render source boards for one complete identity without exporting runtime assets.')
    parser.add_argument('--contacts-review', choices=APPEARANCES,
                        help='Render source-pixel foot crops/grid for the five required support poses.')
    args = parser.parse_args()
    definitions, clips = read_inputs()
    selection_path = SOURCE/'selection.json'
    selection = json.loads(selection_path.read_text(encoding='utf-8')) if selection_path.is_file() else {}
    annotations_path = SOURCE/'contacts.json'
    annotations = json.loads(annotations_path.read_text(encoding='utf-8')) if annotations_path.is_file() else {}
    required = contact_ids(clips)
    if args.contacts_review:
        write_contact_calibration(args.contacts_review, definitions, selection, required,
                                  annotations.get('appearances', {}).get(args.contacts_review, {}))
        print(json.dumps({'appearance': args.contacts_review, 'contactSources': len(required), 'runtimeExport': False}))
        return
    if args.review:
        images, records = source_frames(args.review, definitions, selection,
                                         annotations.get('appearances', {}).get(args.review, {}), required, False)
        write_boards(args.review, images, records)
        loops = all('rightFoot' in record for record in records if record['id'] in required)
        if loops:
            write_loops(SOURCE/args.review, images, compile_clips(records, clips))
        print(json.dumps({'appearance': args.review, 'frames': len(records), 'sourceLoops': loops, 'runtimeExport': False}))
        return
    prepared = {}
    for appearance in APPEARANCES:
        frames = annotations.get('appearances', {}).get(appearance, {})
        images, records = source_frames(appearance, definitions, selection, frames, required, True)
        prepared[appearance] = (images, records, compile_clips(records, clips))
    PUBLIC.mkdir(parents=True, exist_ok=True)
    result = {appearance: export_appearance(appearance, *data) for appearance, data in prepared.items()}
    generated = '// Generated by scripts/pack-variant-transitions.py from own annotated contact sources.\n'
    generated += "import type { MovementGeometry } from './modernArtworkTypes.ts';\n"
    generated += 'export interface VariantMovementAtlas {asset:{image:string;sha256:string;width:number;height:number;columns:number;rows:number;cellWidth:number;cellHeight:number};clips:Record<\'standUp\'|\'sitDown\',readonly MovementGeometry[]>;idle:{id:string;index:number;top:number}}\n'
    generated += "export const VARIANT_MOVEMENT:Record<'woman'|'granny',VariantMovementAtlas> = "+json.dumps(result, separators=(',', ':'))+';\n'
    (ROOT/'src/room/variantMovementGeometry.ts').write_text(generated, encoding='utf-8')
    print(json.dumps({appearance: {'frames': len(prepared[appearance][1]), 'asset': value['asset']}
                      for appearance, value in result.items()}))


if __name__ == '__main__':
    try:
        main()
    except (KeyError, TypeError, ValueError) as error:
        raise SystemExit(f'Variant movement export failed: {error}') from error
