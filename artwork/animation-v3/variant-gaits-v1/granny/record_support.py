"""Record manually inspected heel coordinates; never infer a heel from a male ref."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('heading')
    parser.add_argument('right_x', type=int)
    parser.add_argument('right_y', type=int)
    parser.add_argument('left_x', type=int)
    parser.add_argument('left_y', type=int)
    parser.add_argument('--right-note')
    parser.add_argument('--left-note')
    args = parser.parse_args()
    manifest_path = SOURCE / 'support-feet.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8-sig'))
    locked = json.loads((SOURCE / 'locked-anchors.json').read_text(encoding='utf-8-sig'))
    result = {}
    for phase, foot, point in (
        ('02-passing', 'right', (args.right_x, args.right_y)),
        ('06-opposite-passing', 'left', (args.left_x, args.left_y)),
    ):
        key = f'{args.heading}/{phase}'
        anchor = locked['frames'][key]
        path = ROOT / anchor['source']
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != anchor['sha256']:
            raise ValueError(f'Source changed after lock: {key}')
        with Image.open(path) as source:
            if source.mode != 'RGBA' or source.getpixel(point)[3] < 160:
                raise ValueError(f'Heel point must lie on visible own source: {key}')
            size = list(source.size)
        entry = {
            'source': anchor['source'],
            'sourceSha256': digest,
            'sourceSize': size,
            'supportFoot': foot,
            'supportHeel': list(point),
            'evidence': f'feet-review/{args.heading}-{phase}.jpg',
            'review': f'Manually inspected own native source grid: underside of planted {foot} heel below hips; raised swing foot excluded.',
        }
        custom_note = args.right_note if foot == 'right' else args.left_note
        if custom_note:
            entry['review'] = custom_note
            entry['landmark'] = 'visible-plantar-point-heel-occluded'
        if key in manifest['frames'] and manifest['frames'][key] != entry:
            raise ValueError(f'Existing support point is immutable: {key}')
        manifest['frames'][key] = entry
        result[key] = entry
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
