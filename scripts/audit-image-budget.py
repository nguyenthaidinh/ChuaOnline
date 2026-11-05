"""Measure disk bytes and RGBA pixel footprint; check sampled atlas cells for empty alpha."""
import json
import sys
from pathlib import Path
from PIL import Image

output = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/performance-audit')
source = json.loads((output / 'source-and-http.json').read_text(encoding='utf-8'))
rows = []
for directory in ['visual-v2', 'animation-v3', 'seating-direction']:
    for path in Path('public/assets', directory).glob('*.webp'):
        with Image.open(path) as im:
            rows.append(dict(path=path.relative_to('public').as_posix(), bytes=path.stat().st_size,
                             width=im.width, height=im.height, rgbaBytes=im.width * im.height * 4))
inventory = {row['path']: row for row in rows}
errors = []
by_image = {}
for frame in source['frames']:
    by_image.setdefault(frame['image'], []).append(frame)
for image, frames in by_image.items():
    with Image.open(Path('public', image)) as im:
        alpha = im.convert('RGBA').getchannel('A')
        for frame in frames:
            columns, count_rows, cell = frame['columns'], frame['rows'], frame['cell']
            if not 0 <= cell < columns * count_rows:
                errors.append(dict(**frame, error='out-of-bounds'))
                continue
            w, h = im.width / columns, im.height / count_rows
            x, y = (cell % columns) * w, (cell // columns) * h
            if alpha.crop((round(x), round(y), round(x + w), round(y + h))).getbbox() is None:
                errors.append(dict(**frame, error='fully-transparent'))
budgets = {}
for layout, files in source['essential'].items():
    paths = {file['path'] for file in files}
    budgets[layout] = dict(count=len(paths), bytes=sum(inventory[p]['bytes'] for p in paths),
                           rgbaBytes=sum(inventory[p]['rgbaBytes'] for p in paths))
report = dict(note='RGBA is width × height × 4, not measured browser RAM/VRAM. Totals include both backgrounds and unused optional assets.',
              inventory=sorted(rows, key=lambda row: row['rgbaBytes'], reverse=True),
              essential=budgets, totalBytes=sum(row['bytes'] for row in rows),
              totalRGBABytes=sum(row['rgbaBytes'] for row in rows),
              sampledCells=len(source['frames']), cellErrors=errors)
(output / 'image-budget.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in report.items() if key != 'inventory'}, indent=2))
