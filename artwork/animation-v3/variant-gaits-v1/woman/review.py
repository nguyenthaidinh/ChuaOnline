"""Source review utilities for the adult woman gait bank; no runtime atlas export."""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
from pose_canvas import CANVAS, normalize_pose

HEADINGS = ('rear', 'rearRight', 'right', 'frontRight', 'front', 'frontLeft', 'left', 'rearLeft')
PHASES = ('00-contact', '01-loading', '02-passing', '03-swing', '04-opposite-contact',
          '05-opposite-loading', '06-opposite-passing', '07-opposite-swing')


def json_read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def male_references():
    expanded = json_read(ROOT / 'artwork/animation-v3/directions-v2/review.json')['frames']
    lateral = json_read(ROOT / 'artwork/animation-v3/directions-v1/review.json')['frames']
    original = json_read(ROOT / 'artwork/animation-v3/walk-v1/review.json')['frames']
    rear_right_indices = (0, 1, 3, 5, 6, 7, 9, 11)
    mapped = {}
    for heading in HEADINGS:
        mapped[heading] = {}
        for index, phase in enumerate(PHASES):
            if heading == 'rearRight':
                frame = original[rear_right_indices[index]]
            else:
                bank = lateral if heading in ('left', 'right') else expanded
                frame = next(frame for frame in bank if frame['id'] == f'{heading}-{phase}')
            mapped[heading][phase] = frame['source']
    return mapped


def board(entries, destination, dark=False, columns=4, cell_width=192):
    rows = (len(entries) + columns - 1) // columns
    cell_height = cell_width * 4 // 3
    row_height = cell_height + 22
    image = Image.new('RGBA', (columns * cell_width, rows * row_height), '#251b13' if dark else '#e7e1d6')
    pen = ImageDraw.Draw(image)
    for index, (label, path) in enumerate(entries):
        pose, _ = normalize_pose(path)
        x, y = index % columns * cell_width, index // columns * row_height
        image.alpha_composite(pose.resize((cell_width, cell_height), Image.Resampling.LANCZOS), (x, y + 20))
        pen.text((x + 4, y + 4), label, fill='#dcc79f' if dark else '#6b5136')
    image.convert('RGB').save(destination, quality=95)


def main():
    selection = json_read(SOURCE / 'selection.json')
    def selected(heading, phase):
        path = (SOURCE / selection.get(f'{heading}/{phase}', f'{heading}/{phase}.png')).resolve()
        if not path.is_relative_to(SOURCE.resolve()) or path.suffix.lower() != '.png':
            raise ValueError('Unsafe woman source selection')
        return path
    references = male_references()
    (SOURCE / 'male-reference-manifest.json').write_text(json.dumps(references, indent=2)+'\n', encoding='utf-8')
    if '--male-contacts' in sys.argv:
        entries = [(f'{heading}/{phase}', ROOT / references[heading][phase])
                   for heading in HEADINGS for phase in (PHASES[0], PHASES[4])]
        board(entries, SOURCE / 'male-contact-references.jpg')
        return
    if '--male-phases' in sys.argv:
        for heading in HEADINGS:
            board([(phase, ROOT / references[heading][phase]) for phase in PHASES],
                  SOURCE / f'male-{heading}-references.jpg')
        return
    if '--contacts' in sys.argv:
        entries = [(f'{heading}/{phase}', selected(heading, phase))
                   for heading in HEADINGS for phase in (PHASES[0], PHASES[4])
                   if selected(heading, phase).is_file()]
        for dark in (False, True):
            board(entries, SOURCE / f'contacts-{"dark" if dark else "light"}.jpg', dark)
            board(entries, SOURCE / f'contacts-144-{"dark" if dark else "light"}.jpg', dark, cell_width=144)
        return
    if '--feet' in sys.argv or '--support-feet' in sys.argv or '--neutral-feet' in sys.argv:
        output = SOURCE / 'feet-review'
        output.mkdir(exist_ok=True)
        phases = ('stand',) if '--neutral-feet' in sys.argv else (PHASES[2], PHASES[6]) if '--support-feet' in sys.argv else (PHASES[0], PHASES[4])
        for heading in HEADINGS:
            for phase in phases:
                path = selected(heading, phase)
                if not path.is_file():
                    continue
                with Image.open(path) as raw:
                    image = Image.new('RGBA', raw.size, '#e7e1d6')
                    image.alpha_composite(raw.convert('RGBA'))
                box = (200, 900, 1050, 1254)
                crop = image.crop(box).convert('RGB')
                draw = ImageDraw.Draw(crop)
                for x in range(200, 1051, 25):
                    draw.line([(x-box[0], 0), (x-box[0], 354)], fill='#c4a5a5')
                    draw.text((x-box[0]+2, 3), str(x), fill='#6a2626')
                for y in range(900, 1254, 25):
                    draw.line([(0, y-box[1]), (850, y-box[1])], fill='#c4a5a5')
                    draw.text((3, y-box[1]+2), str(y), fill='#6a2626')
                crop.save(output / f'{heading}-{phase}-grid.jpg', quality=97)
        return
    if '--stands' in sys.argv:
        entries = [(heading, selected(heading, 'stand')) for heading in HEADINGS if selected(heading, 'stand').is_file()]
        for dark in (False, True):
            board(entries, SOURCE / f'stands-{"dark" if dark else "light"}.jpg', dark)
            board(entries, SOURCE / f'stands-144-{"dark" if dark else "light"}.jpg', dark, cell_width=144)
        return
    for heading in HEADINGS:
        entries = [(phase, selected(heading, phase)) for phase in PHASES if selected(heading, phase).is_file()]
        if not entries:
            continue
        for dark in (False, True):
            board(entries, SOURCE / f'{heading}-{"dark" if dark else "light"}.jpg', dark)
            board(entries, SOURCE / f'{heading}-144-{"dark" if dark else "light"}.jpg', dark, cell_width=144)
        if len(entries) == 8:
            frames = []
            for _, path in entries:
                pose, _ = normalize_pose(path)
                image = Image.new('RGBA', CANVAS, '#302318')
                image.alpha_composite(pose)
                frames.append(image)
            frames[0].save(SOURCE / f'{heading}-loop.webp', save_all=True, append_images=frames[1:],
                           duration=120, loop=0, quality=92, method=4)
    frames = []
    for heading in HEADINGS:
        for phase in ('stand', *PHASES):
            path = selected(heading, phase)
            if path.is_file():
                _, audit = normalize_pose(path)
                frames.append({'heading': heading, 'id': phase, 'source': path.relative_to(ROOT).as_posix(), **audit})
    (SOURCE / 'source-review.json').write_text(json.dumps({'appearance':'woman', 'frames':frames,
        'missing':[f'{heading}/{phase}' for heading in HEADINGS for phase in ('stand', *PHASES)
                   if not selected(heading, phase).is_file()]}, indent=2)+'\n', encoding='utf-8')
    records = json_read(SOURCE / 'generation.json')['records'][:2]
    records.extend(json_read(path) for path in sorted((SOURCE / 'records').glob('*.json')))
    generation = {'tool':'built-in image_gen','scope':'Adult woman own identity, 8 independent headings',
        'reused':[{'output':'rearRight/stand.png','source':'artwork/animation-v3/variants-v1/woman/00-neutral.png'}],
        'records':records}
    (SOURCE / 'generation.json').write_text(json.dumps(generation, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'selected':len(frames),'missing':72-len(frames),'generatedRecords':len(records)}))


if __name__ == '__main__':
    main()
