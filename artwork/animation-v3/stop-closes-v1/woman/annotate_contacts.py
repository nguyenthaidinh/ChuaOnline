"""Persist manually reviewed own-PNG support contacts with matching neutral landmarks."""
import hashlib
import json
import math
import sys
from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
GAIT = ROOT/'artwork/animation-v3/variant-gaits-v1/woman'
sys.path.insert(0, str(ROOT/'scripts'))
from pose_canvas import normalize_pose

# Manually selected on native pixel grids, then validated against actual skin/alpha.
# Order: right-gather, right-close, left-gather, left-close.
POINTS = {
    'rear': [[620,1195], [620,1195], [594,1201], [594,1203]],
    'rearRight': [[625,1186], [624,1186], [543,1192], [510,1184]],
    'right': [[490,1194], [490,1194], [670,1193], [670,1192]],
    'frontRight': [[557,1196], [552,1194], [621,1198], [612,1196]],
    'front': [[565,1226], [565,1226], [658,1209], [658,1209]],
    'frontLeft': [[600,1190], [600,1190], [636,1201], [636,1201]],
    'left': [[535,1194], [515,1187], [657,1196], [658,1196]],
    'rearLeft': [[691,1202], [676,1198], [602,1169], [604,1169]],
}
STATES = ['right-gather', 'right-close', 'left-gather', 'left-close']


def main():
    selection = json.loads((SOURCE/'selection.json').read_text(encoding='utf-8'))
    neutral = json.loads((GAIT/'neutral-feet.json').read_text(encoding='utf-8'))['frames']
    frames = {}
    for heading, points in POINTS.items():
        neutral_frame = neutral[heading]
        neutral_path = ROOT/neutral_frame['source']
        assert hashlib.sha256(neutral_path.read_bytes()).hexdigest() == neutral_frame['sourceSha256']
        for state, point in zip(STATES, points):
            key = heading+'/'+state
            foot = state.split('-')[0]
            path = (SOURCE/selection.get(key,key+'.png')).resolve()
            assert path.is_relative_to(SOURCE.resolve())
            with Image.open(path) as im:
                assert im.mode == 'RGBA' and im.size == (1254,1254), key
                rgba = im.getpixel(tuple(point))
                assert rgba[3] > 160, (key,point,rgba)
            _, audit = normalize_pose(path)
            landmark = neutral_frame['landmark'][foot]
            neutral_point = neutral_frame['points'][foot]
            distance = math.dist(point,neutral_point)*audit['scale']
            assert distance <= 45, (key,distance)
            phase_review = ('The planted support leg stays straight while the opposite knee/foot remains visibly suspended and gathers toward the ankle.'
                if state.endswith('gather') else
                'Both feet have settled beside each other; the selected supporting foot is traced from the same-foot gather and matched to its neutral foot, not inferred from the filename alone.')
            if heading == 'rearRight':
                phase_review += ' Explicit anatomical convention checked: RIGHT=near/image-right, LEFT=far/image-left. Both gather siblings replace the rejected far-left-support repetition; full body refs reviewed.'
            landmark_review = ('Visible lower posterior calcaneus/heel edge on this actual supporting foot.'
                if landmark=='visible-heel' else
                'Visible central plantar forefoot/toe-pad contact, matching the same foot in neutral. No hidden heel is inferred or subtracted against a toe point.')
            frames[key] = {
                'source':path.relative_to(ROOT).as_posix(),
                'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                'point':point,
                'landmark':landmark,
                'supportFoot':foot,
                'coordinateSpace':'native source PNG pixels',
                'sampleRgba':rgba,
                'reviewed':True,
                'review':phase_review+' '+landmark_review,
                'evidence':[
                    (SOURCE/'review'/(heading+'-144.jpg')).relative_to(ROOT).as_posix(),
                    (SOURCE/'feet-review'/(heading+'-'+state+'-grid.jpg')).relative_to(ROOT).as_posix(),
                ],
                'targetNeutral':{
                    'source':neutral_frame['source'],
                    'sourceSha256':neutral_frame['sourceSha256'],
                    'point':neutral_point,
                    'landmark':landmark,
                },
                'nativeToNeutralDistanceLogical':round(distance,3),
            }
    data = {'appearance':'woman','status':'complete','count':len(frames),
        'measurement':'Manual native-source skin/alpha landmarks reviewed with full body and fixed-scale light/dark boards; each support contact uses the same landmark kind as its own neutral foot.',
        'frames':frames}
    target = SOURCE/'support-contacts.json'
    incoming = target.with_suffix('.incoming.json')
    incoming.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    incoming.replace(target)
    print(json.dumps({'reviewedContacts':len(frames),'maxDistanceLogical':max(f['nativeToNeutralDistanceLogical'] for f in frames.values())}))


if __name__ == '__main__':
    main()
