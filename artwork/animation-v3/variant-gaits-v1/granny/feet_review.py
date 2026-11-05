"""Draw native-pixel contact grids for manual annotation; never infer heel points."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw
from review_sources import ROOT, SOURCE, HEADINGS, selected_path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('headings', nargs='+', choices=HEADINGS)
mode = parser.add_mutually_exclusive_group()
mode.add_argument('--support', action='store_true', help='Inspect the mid-stance support phases02/06 instead of contact0/4.')
mode.add_argument('--stand', action='store_true', help='Inspect both soles in the neutral stand.')
args = parser.parse_args()
selection = json.loads((SOURCE / 'selection.json').read_text(encoding='utf-8'))
output = SOURCE / 'feet-review'
output.mkdir(exist_ok=True)
audits = []
phases = ('stand',) if args.stand else ('02-passing', '06-opposite-passing') if args.support else ('00-contact', '04-opposite-contact')
for heading in args.headings:
    for phase in phases:
        path = selected_path(heading, phase, selection)
        source = Image.open(path).convert('RGBA')
        # This is an inspection crop only. Production normalization keeps the whole source.
        box = (200, 850, min(source.width, 1050), source.height)
        crop = source.crop(box)
        panel = Image.new('RGBA', crop.size, '#e8e2d7')
        panel.alpha_composite(crop)
        overlay = Image.new('RGBA', panel.size)
        draw = ImageDraw.Draw(overlay)
        for x in range(box[0], box[2], 10):
            local = x - box[0]
            draw.line((local, 0, local, panel.height), fill=(30, 80, 170, 65 if x % 50 == 0 else 20))
            if x % 50 == 0:
                draw.text((local + 2, 3), str(x), fill=(10, 45, 110, 240))
        for y in range(box[1], box[3], 10):
            local = y - box[1]
            draw.line((0, local, panel.width, local), fill=(30, 80, 170, 65 if y % 50 == 0 else 20))
            if y % 50 == 0:
                draw.text((3, local + 2), str(y), fill=(10, 45, 110, 240))
        panel.alpha_composite(overlay)
        evidence = output / f'{heading}-{phase}.jpg'
        panel.convert('RGB').save(evidence, quality=97)
        audits.append({'id': heading + '/' + phase, 'source': path.relative_to(ROOT).as_posix(),
                       'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                       'sourceSize': list(source.size), 'crop': list(box),
                       'evidence': evidence.relative_to(SOURCE).as_posix()})
index = output / ('neutral-grids.json' if args.stand else 'support-grids.json' if args.support else 'grids.json')
existing = json.loads(index.read_text(encoding='utf-8'))['frames'] if index.exists() else []
merged = {frame['id']: frame for frame in existing + audits}
index.write_text(json.dumps({'coordinateSpace': 'Native PNG pixels, origin top-left',
                            'frames': list(merged.values())}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'grids': len(audits), 'manualAnnotationRequired': True}))
