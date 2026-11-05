"""Compile true bow/petal poses without changing the public choreography clock.

Source scale/camera are fixed. Own contact annotations are SHA-locked and never
inferred from a different identity. Preview modes cannot emit runtime placeholders.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw
from pose_canvas import CANVAS, GROUND_PIVOT, normalize_pose

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'artwork/animation-v3/bow-petal-v1'
PUBLIC = ROOT / 'public/assets/animation-v3'
APPEARANCES = ('man', 'woman', 'granny')
NEUTRALS = {
    'man': ROOT / 'artwork/animation-v3/transitions-v1/00-stand-angled.png',
    'woman': ROOT / 'artwork/animation-v3/variants-v1/woman/00-neutral.png',
    'granny': ROOT / 'artwork/animation-v3/variants-v1/granny/00-neutral.png',
}
WEB_CELL = (144, 192)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def read_definitions():
    definition = read_json(SOURCE / 'sequences.json')
    expected = {'kneelDown': 720, 'kneeling': 400, 'bowDown': 1040,
                'bowHold': 380, 'bowUp': 1020, 'rise': 760,
                'offerRaise': 700, 'offerHold': 650, 'petalRelease': 1050,
                'offerRelease': 880}
    ids = definition['ids']
    if len(ids) != 24 or len(set(ids)) != 24 or ids[0] != '00-neutral':
        raise ValueError('Expected 24 distinct bow/petal pose IDs.')
    for kind in ('bow', 'petal'):
        for clip, keys in definition[kind].items():
            if any(key['id'] not in ids or not isinstance(key['durationMs'], int)
                   or key['durationMs'] <= 0 for key in keys):
                raise ValueError(f'Invalid source keys in {clip}.')
            if sum(key['durationMs'] for key in keys) != expected[clip]:
                raise ValueError(f'Public clip duration changed: {clip}.')
    contact = definition['petalContact']
    local = 0
    for key in definition['petal'][contact['clip']]:
        if key['id'] == contact['frame']:
            break
        local += key['durationMs']
    if local != 350 or contact['offsetMs'] != 350:
        raise ValueError('Petal release must remain at 350 ms.')
    if definition['bow']['bowUp'][-1]['id'] != definition['bow']['bowDown'][0]['id']:
        raise ValueError('Consecutive bows need the same upright prayer endpoint.')
    if sum(key['durationMs'] for key in definition['bow']['rise'][:-1]) != 500:
        raise ValueError('Bow return pivot needs the final 260 ms standing window.')
    return definition


def selected_path(appearance, frame_id, selections):
    name = selections.get(f'{appearance}/{frame_id}', f'{appearance}/{frame_id}.png')
    if not isinstance(name, str) or not name:
        raise ValueError(f'Invalid source selection: {appearance}/{frame_id}')
    path = (SOURCE / name).resolve()
    if not path.is_relative_to((SOURCE / appearance).resolve()) or path.suffix.lower() != '.png':
        raise ValueError(f'Selection escapes its identity: {appearance}/{frame_id}')
    return path


def point(raw, audit):
    if not isinstance(raw, list) or len(raw) != 2 or not all(
            isinstance(value, (float, int)) and not isinstance(value, bool)
            and math.isfinite(value) for value in raw):
        raise ValueError('Contact must contain two finite source coordinates.')
    if any(raw[i] < 0 or raw[i] >= audit['sourceSize'][i] for i in range(2)):
        raise ValueError('Contact lies outside its source.')
    scale = audit['scale']
    offset = [round(GROUND_PIVOT[i] - audit['sourcePivot'][i] * scale) for i in range(2)]
    return {axis: round(raw[i] * scale + offset[i], 3) for i, axis in enumerate(('x', 'y'))}


def load_sources(appearance, definition, selections):
    frames = []
    for index, frame_id in enumerate(definition['ids']):
        path = selected_path(appearance, frame_id, selections)
        with Image.open(path) as source:
            if source.format != 'PNG' or source.mode != 'RGBA':
                raise ValueError(f'Review source format; expected actual RGBA PNG: {path.name}')
        image, audit = normalize_pose(path)
        if index == 0 and audit['sha256'] != digest(NEUTRALS[appearance]):
            raise ValueError(f'Neutral identity bridge was changed: {appearance}')
        frames.append((image, {'id': frame_id, 'cell': index,
                               'source': path.relative_to(ROOT).as_posix(), **audit}))
    return frames


def geometry(frames, annotations, definition, strict=True):
    by_id = {audit['id']: audit for _, audit in frames}
    result = {}
    for _, audit in frames:
        frame_id = audit['id']
        entry = {'id': frame_id, 'cell': audit['cell'], 'top': audit['bounds'][1],
                 'holdsOffering': frame_id in definition['petalHeld']}
        annotation = annotations.get(frame_id)
        needs_hand = frame_id.startswith(('15-', '16-', '17-', '18-', '19-', '20-', '21-'))
        needs_support = 2 <= int(frame_id[:2]) <= 14 or frame_id.startswith('22-')
        if strict and needs_hand and not annotation:
            raise ValueError(f'Missing own hand annotation: {frame_id}')
        if strict and needs_support and not (annotation or {}).get('support'):
            raise ValueError(f'Missing own floor-contact annotation: {frame_id}')
        if annotation:
            if annotation.get('sourceSha256') != audit['sha256']:
                raise ValueError(f'Remeasure changed source: {frame_id}')
            if needs_hand:
                entry['hand'] = point(annotation['hand'], audit)
                polygon = annotation['handMask']
                if len(polygon) < 3:
                    raise ValueError(f'Invalid hand mask: {frame_id}')
                entry['handMask'] = [point(value, audit) for value in polygon]
            support = annotation.get('support')
            if support:
                with Image.open(ROOT / audit['source']) as source:
                    alpha = source.convert('RGBA').getchannel('A')
                    x, y = (round(value) for value in support['point'])
                    nearby = alpha.crop((max(0, x - 5), max(0, y - 5),
                                         min(alpha.width, x + 6), min(alpha.height, y + 6)))
                    if nearby.getextrema()[1] < 200:
                        raise ValueError(f'Support annotation misses the body: {frame_id}')
                reference_id = support['reference']
                reference = annotations.get(reference_id, {}).get('support')
                if not reference or reference['landmark'] != support['landmark']:
                    raise ValueError(f'Invalid own support reference: {frame_id}')
                current_point = point(support['point'], audit)
                reference_point = point(reference['point'], by_id[reference_id])
                offset = {axis: round(reference_point[axis] - current_point[axis], 3)
                          for axis in ('x', 'y')}
                if max(abs(value) for value in offset.values()) > 20:
                    raise ValueError(f'Review source rather than large root correction: {frame_id}')
                bounds = audit['bounds']
                if not (0 < bounds[0] + offset['x'] < bounds[2] + offset['x'] < CANVAS[0]
                        and 0 < bounds[1] + offset['y'] < bounds[3] + offset['y'] < CANVAS[1]):
                    raise ValueError(f'Root correction clips source: {frame_id}')
                entry['rootOffset'] = offset
        result[frame_id] = entry
    return result


def boards(appearance, frames, data, definition):
    directory = SOURCE / appearance
    columns, rows = 4, math.ceil(len(frames) / 4)
    for name, background in [('light', '#e8e2d7'), ('dark', '#20170f')]:
        board = Image.new('RGBA', (192 * columns, 276 * rows), background)
        draw = ImageDraw.Draw(board)
        for image, audit in frames:
            cell = audit['cell']
            x, y = cell % columns * 192, cell // columns * 276
            board.alpha_composite(image.resize((192, 256), Image.Resampling.LANCZOS), (x, y + 20))
            draw.text((x + 5, y + 3), audit['id'], fill='#765936' if name == 'light' else '#dbc29a')
        board.convert('RGB').save(directory / f'contact-sheet-{name}.jpg', quality=95)
    images = {audit['id']: image for image, audit in frames}
    for kind in ('bow', 'petal'):
        for clip, keys in definition[kind].items():
            story = Image.new('RGBA', (192 * len(keys), 278), '#302318')
            draw = ImageDraw.Draw(story)
            loop = []
            durations = []
            for index, key in enumerate(keys):
                frame = Image.new('RGBA', CANVAS)
                offset = data[key['id']].get('rootOffset', {'x': 0, 'y': 0})
                frame.alpha_composite(images[key['id']], (round(offset['x']), round(offset['y'])))
                story.alpha_composite(frame.resize((192, 256), Image.Resampling.LANCZOS), (index * 192, 22))
                draw.text((index * 192 + 4, 3), key['id'], fill='#dbc29a')
                preview = Image.new('RGBA', CANVAS, '#302318')
                preview.alpha_composite(frame)
                loop.append(preview)
                durations.append(key['durationMs'])
            story.convert('RGB').save(directory / f'{clip}-storyboard.jpg', quality=95)
            loop[0].save(directory / f'{clip}-loop.webp', save_all=True, append_images=loop[1:],
                         duration=durations, loop=0, quality=92, method=4)
    bow = definition['bow']
    bow_keys = bow['kneelDown'] + bow['kneeling'] + (
        bow['bowDown'] + bow['bowHold'] + bow['bowUp']) * 3 + bow['rise']
    petal_keys = [key for clip in definition['petal'].values() for key in clip]
    for name, keys in [('bow', bow_keys), ('petal', petal_keys)]:
        loop = []
        for key in keys:
            frame = Image.new('RGBA', CANVAS, '#302318')
            offset = data[key['id']].get('rootOffset', {'x': 0, 'y': 0})
            frame.alpha_composite(images[key['id']], (round(offset['x']), round(offset['y'])))
            loop.append(frame.resize((192, 256), Image.Resampling.LANCZOS))
        loop[0].save(directory / f'performance-{name}-loop.webp', save_all=True,
                     append_images=loop[1:], duration=[key['durationMs'] for key in keys],
                     loop=0, quality=93, method=4)


def hand_review(appearance):
    directory = SOURCE / appearance
    selections = read_json(SOURCE / 'selection.json')
    definition = read_definitions()
    selected = [(frame_id, selected_path(appearance, frame_id, selections))
                for frame_id in definition['ids'] if 15 <= int(frame_id[:2]) <= 21]
    board = Image.new('RGB', (7 * 360, 420), '#eee6d5')
    draw = ImageDraw.Draw(board)
    for index, (frame_id, path) in enumerate(selected):
        with Image.open(path) as source:
            image = source.convert('RGBA')
        crop = image.crop((680, 180, 1220, 800))
        background = Image.new('RGBA', crop.size, '#eee6d5')
        background.alpha_composite(crop)
        pen = ImageDraw.Draw(background)
        for x in range(700, 1220, 50):
            pen.line((x - 680, 0, x - 680, 620), fill='#68946680')
            pen.text((x - 678, 3), str(x), fill='#315f38')
        for y in range(200, 800, 50):
            pen.line((0, y - 180, 540, y - 180), fill='#68946680')
            pen.text((3, y - 178), str(y), fill='#315f38')
        background.thumbnail((350, 350))
        board.paste(background.convert('RGB'), (index * 360, 45))
        draw.text((index * 360 + 5, 10), frame_id, fill='#43351e')
    board.save(directory / 'hand-calibration.jpg', quality=97)
    print(f'Hand grid only: {appearance}; no annotations are invented.')


def contact_review(appearance):
    directory = SOURCE / appearance
    definition = read_definitions()
    selections = read_json(SOURCE / 'selection.json')
    ids = [frame_id for frame_id in definition['ids']
           if int(frame_id[:2]) == 0 or 2 <= int(frame_id[:2]) <= 14 or frame_id.startswith('22-')]
    board = Image.new('RGB', (5 * 360, math.ceil(len(ids) / 5) * 240), '#eee6d5')
    draw = ImageDraw.Draw(board)
    for index, frame_id in enumerate(ids):
        path = selected_path(appearance, frame_id, selections)
        with Image.open(path) as source:
            image = source.convert('RGBA')
        crop = image.crop((350, 950, 950, 1250))
        background = Image.new('RGBA', crop.size, '#eee6d5')
        background.alpha_composite(crop)
        pen = ImageDraw.Draw(background)
        for x in range(350, 950, 50):
            pen.line((x - 350, 0, x - 350, 300), fill='#68946680')
            pen.text((x - 348, 3), str(x), fill='#315f38')
        for y in range(950, 1250, 25):
            pen.line((0, y - 950, 600, y - 950), fill='#68946680')
            pen.text((3, y - 948), str(y), fill='#315f38')
        background.thumbnail((350, 190))
        x, y = index % 5 * 360, index // 5 * 240
        board.paste(background.convert('RGB'), (x, y + 35))
        draw.text((x + 5, y + 10), frame_id, fill='#43351e')
    board.save(directory / 'foot-calibration.jpg', quality=97)
    print(f'Own source foot grid only: {appearance}; no annotation values are filled.')


def compile_appearance(appearance, definition, selections, annotations, export):
    frames = load_sources(appearance, definition, selections)
    own = annotations.get('appearances', {}).get(appearance, {})
    data = geometry(frames, own, definition, strict=export)
    boards(appearance, frames, data, definition)
    if not export:
        return None
    directory = SOURCE / appearance
    rows = math.ceil(len(frames) / 4)
    atlas = Image.new('RGBA', (CANVAS[0] * 4, CANVAS[1] * rows))
    for image, audit in frames:
        atlas.alpha_composite(image, (audit['cell'] % 4 * CANVAS[0], audit['cell'] // 4 * CANVAS[1]))
    master = directory / 'bow-petal-atlas.webp'
    atlas.save(master, quality=93, method=4)
    preview = directory / 'web-preview-192.webp'
    atlas.resize((4 * 192, rows * 256), Image.Resampling.LANCZOS).save(preview, quality=93, method=4)
    texture = atlas.resize((4 * WEB_CELL[0], rows * WEB_CELL[1]), Image.Resampling.LANCZOS)
    temporary = PUBLIC / f'{appearance}-bow-petal-packing.webp'
    texture.save(temporary, quality=93, method=4)
    sha = digest(temporary)
    destination = PUBLIC / f'{appearance}-bow-petal-{sha[:12]}.webp'
    temporary.replace(destination)
    for label, path in [('192', preview), ('144', destination)]:
        with Image.open(path) as decoded:
            decoded = decoded.convert('RGBA')
        for theme, background in [('light', '#e8e2d7'), ('dark', '#20170f')]:
            view = Image.new('RGBA', decoded.size, background)
            view.alpha_composite(decoded)
            view.convert('RGB').save(directory / f'production-{label}-{theme}.png')
    asset = {'image': destination.relative_to(ROOT / 'public').as_posix(), 'sha256': sha,
             'width': texture.width, 'height': texture.height, 'columns': 4, 'rows': rows,
             'cellWidth': WEB_CELL[0], 'cellHeight': WEB_CELL[1]}
    audit = {'status': 'compiled', 'appearance': appearance, 'canvas': list(CANVAS),
             'groundPivot': list(GROUND_PIVOT), 'frames': [audit for _, audit in frames],
             'geometry': data, 'production': asset, 'master': master.name,
             'masterSha256': digest(master), 'timelineSha256': digest(SOURCE / 'sequences.json'),
             'selectionSha256': digest(SOURCE / 'selection.json'),
             'annotationsSha256': digest(SOURCE / 'annotations.json'), 'annotations': own}
    (directory / 'review.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return {'asset': asset, 'frames': data}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--review', choices=APPEARANCES)
    parser.add_argument('--hands-review', choices=APPEARANCES)
    parser.add_argument('--contacts-review', choices=APPEARANCES)
    args = parser.parse_args()
    definition = read_definitions()
    selections = read_json(SOURCE / 'selection.json')
    allowed = {f'{appearance}/{frame_id}' for appearance in APPEARANCES for frame_id in definition['ids']}
    if not isinstance(selections, dict) or set(selections) - allowed:
        raise ValueError('Selections must use known identity/pose IDs.')
    if args.hands_review:
        hand_review(args.hands_review)
        return
    if args.contacts_review:
        contact_review(args.contacts_review)
        return
    annotations_path = SOURCE / 'annotations.json'
    annotations = read_json(annotations_path) if annotations_path.exists() else {}
    if args.review:
        compile_appearance(args.review, definition, selections, annotations, export=False)
        return
    PUBLIC.mkdir(parents=True, exist_ok=True)
    compiled = {appearance: compile_appearance(appearance, definition, selections, annotations, export=True)
                for appearance in APPEARANCES}
    code = '// Generated by scripts/pack-bow-petal.py; own source annotations, logical384x512.\n'
    code += "import type { Appearance } from './protocol.ts';\nimport type { HandAnchor } from './animationManifest.ts';\n"
    code += 'export interface RitualExtensionFrame {id:string;cell:number;top:number;rootOffset?:HandAnchor;hand?:HandAnchor;handMask?:HandAnchor[];holdsOffering:boolean}\n'
    code += 'export const RITUAL_EXTENSION:Record<Appearance,{asset:{image:string;sha256:string;width:number;height:number;columns:number;rows:number;cellWidth:number;cellHeight:number};frames:Record<string,RitualExtensionFrame>}> = '
    code += json.dumps(compiled, separators=(',', ':')) + ';\n'
    for name, key in [('BOW_EXTENSION_CLIPS', 'bow'), ('PETAL_EXTENSION_CLIPS', 'petal')]:
        keys = '|'.join("'" + clip + "'" for clip in definition[key])
        code += f'export const {name}:Record<{keys},readonly {{id:string;durationMs:number}}[]> = '
        code += json.dumps(definition[key], separators=(',', ':')) + ';\n'
    (ROOT / 'src/room/bowPetalGeometry.ts').write_text(code, encoding='utf-8')
    print(json.dumps({appearance: {'frames': len(value['frames']), **value['asset']}
                      for appearance, value in compiled.items()}))


if __name__ == '__main__':
    main()
