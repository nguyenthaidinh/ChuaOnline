"""Append manually reviewed anchors without silently changing downstream references."""
import hashlib
import json
import sys
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
from pose_canvas import normalize_pose


def main():
    selection = json.loads((SOURCE / 'selection.json').read_text(encoding='utf-8'))
    target = SOURCE / 'locked-anchors.json'
    previous = json.loads(target.read_text(encoding='utf-8'))['frames'] if target.exists() else []
    locked = {(frame['heading'], frame['id']): frame for frame in previous}
    for key in sys.argv[1:]:
        heading, phase = key.split('/')
        assert heading in ('rear','rearRight','right','frontRight','front','frontLeft','left','rearLeft')
        assert phase in ('00-contact','02-passing','04-opposite-contact','06-opposite-passing')
        path = (SOURCE / selection.get(key, key+'.png')).resolve()
        assert path.is_relative_to(SOURCE.resolve()) and path.suffix == '.png'
        _, audit = normalize_pose(path)
        frame = {'heading':heading,'id':phase,'source':path.relative_to(ROOT).as_posix(),
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceSize':audit['sourceSize'],
            'bounds':audit['bounds'],'review':'Manually viewed: same female identity and physical heading; leg/arm roles match the selected phase target. Passing uses the straight support leg beneath the pelvis.'}
        if (heading,phase) in locked:
            assert locked[(heading,phase)]['sha256'] == frame['sha256'], 'Notify downstream owner before replacing a locked anchor'
        locked[(heading,phase)] = frame
    frames = list(locked.values())
    contacts = sum(frame['id'] in ('00-contact','04-opposite-contact') for frame in frames)
    passing = sum(frame['id'] in ('02-passing','06-opposite-passing') for frame in frames)
    result = {'appearance':'woman','status':'locked' if contacts==16 else 'partial',
        'contactAnchors':contacts,'passingAnchors':passing,'expectedContactAnchors':16,
        'expectedPassingAnchors':16,'frames':frames}
    incoming = target.with_suffix('.incoming.json')
    incoming.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
    incoming.replace(target)
    print(json.dumps({'locked':len(frames),'status':result['status']}))


if __name__ == '__main__':
    main()
