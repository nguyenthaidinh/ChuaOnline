"""Persist a manually reviewed contact pair; this does not judge anatomy automatically."""
import argparse
import json
from pathlib import Path

from review_sources import ROOT, SOURCE, HEADINGS, source_frame

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('heading', choices=HEADINGS)
parser.add_argument('--note', required=True)
parser.add_argument('--support', action='store_true', help='Lock the manually reviewed mid-stance phases02/06.')
args = parser.parse_args()
if len(args.note.strip()) < 30:
    raise SystemExit('Keep a concrete visual-review note before locking an anchor.')
selection = json.loads((SOURCE / 'selection.json').read_text(encoding='utf-8'))
path = SOURCE / 'locked-anchors.json'
locks = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {
    'appearance': 'granny',
    'note': 'Manually reviewed source anchors; notify the Site owner before replacing a locked PNG.',
    'frames': {},
}
for phase in ('stand', '02-passing', '06-opposite-passing') if args.support else ('stand', '00-contact', '04-opposite-contact'):
    _, audit = source_frame(args.heading, phase, selection)
    key = args.heading + '/' + phase
    current = locks['frames'].get(key)
    if current and current['sha256'] != audit['sha256']:
        raise SystemExit('Changed locked image: notify owner and deliberately revise the lock first: ' + key)
    locks['frames'][key] = {
        name: audit[name] for name in ('source', 'sha256', 'sourceSize', 'bounds')
    }
    locks['frames'][key]['review'] = args.note
path.write_text(json.dumps(locks, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value['sha256'] for key, value in locks['frames'].items()
                  if key.startswith(args.heading + '/')}))
