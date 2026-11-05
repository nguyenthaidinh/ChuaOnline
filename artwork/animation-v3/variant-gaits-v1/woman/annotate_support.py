"""Persist manually measured own-PNG heel landmarks; never infer/copy male contacts."""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
from pose_canvas import normalize_pose, GROUND_PIVOT

# Native1254 pixels, reviewed on feet-review grid crops and actual alpha/skin contour.
POINTS = {
    'rear/02-passing': ([620,1195], 'Right support heel under the pelvis, lower rear calcaneus curve; left sole is lifted.'),
    'rear/06-opposite-passing': ([600,1204], 'Left support heel under the pelvis, low rear calcaneus edge; right sole is lifted.'),
    'rearRight/02-passing': ([625,1186], 'Near/image-right anatomical RIGHT support heel on corrected v2. Far LEFT knee/foot suspended; replaced incorrectly planted far-left source after parent/sibling audit.'),
    'right/02-passing': ([520,1193], 'Right-support heel at the rear/lower edge of the planted profile foot; left swing foot is raised.'),
    'rearRight/06-opposite-passing': ([543,1192], 'Left support heel at the visible low posterior curve on corrected opposite-leg v4. Foreground right thigh swings across the far straight support; parent notified before source revision.'),
    'right/06-opposite-passing': ([521,1188], 'Left support heel at the low posterior curve of the planted profile foot; right knee/foot is bent compactly beside it.'),
    'frontRight/02-passing': ([558,1195], 'Right support heel at its visible low posterior/side curve; left foot is lifted.'),
    'frontRight/06-opposite-passing': ([578,1190], 'Left support heel at its visible low posterior/side curve; right foot is lifted.'),
    'front/02-passing': ([565,1226], 'The right support heel is occluded in this frontal view. This is an actual visible plantar toe-contact edge, not an inferred hidden heel.'),
    'front/06-opposite-passing': ([658,1209], 'The left support heel is occluded in this frontal view. This is an actual visible plantar toe-contact edge, not an inferred hidden heel.'),
    'frontLeft/02-passing': ([600,1190], 'Right support heel at the visible low posterior/side curve of the image-left planted foot.'),
    'frontLeft/06-opposite-passing': ([636,1201], 'The left support heel is occluded by the forefoot/cuff at this angle. This is a visible plantar toe-contact edge, not an inferred hidden heel.'),
    'left/02-passing': ([666,1193], 'Visible right support heel; generic supportPoint instead uses the central plantar forefoot pad because the matching neutral far-foot heel is occluded.'),
    'left/06-opposite-passing': ([658,1195], 'Visible low posterior curve of the near left supporting heel; the right thigh/foot is suspended behind it.'),
    'rearLeft/02-passing': ([691,1202], 'Right support heel at the low posterior curve of the far, image-right planted foot; left foot is suspended.'),
    'rearLeft/06-opposite-passing': ([601,1168], 'Left support heel at the low posterior curve of the near planted foot; the far right leg/foot is suspended on image-right.'),
}
PLANTAR = {'front/02-passing','front/06-opposite-passing','frontLeft/06-opposite-passing','right/06-opposite-passing','left/02-passing'}
MATCHING_POINTS = {'right/06-opposite-passing':[668,1192], 'left/02-passing':[537,1194]}


def main():
    selection = json.loads((SOURCE / 'selection.json').read_text(encoding='utf-8'))
    target = SOURCE / 'support-feet.json'
    previous = json.loads(target.read_text(encoding='utf-8'))['frames'] if target.exists() else {}
    for key, (point,note) in POINTS.items():
        path = (SOURCE / selection.get(key,key+'.png')).resolve()
        assert path.is_relative_to(SOURCE.resolve())
        support_point = MATCHING_POINTS.get(key,point)
        with Image.open(path) as image:
            rgba = image.getpixel(tuple(support_point))
            assert image.mode=='RGBA' and rgba[3]>160, (key,support_point,rgba)
            assert image.getpixel(tuple(point))[3]>160, (key,point)
        _,audit = normalize_pose(path)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if key in previous:
            assert previous[key]['sourceSha256']==digest, 'Notify downstream owner before changing a pinned support source'
            if previous[key].get('supportPoint',previous[key].get('supportHeel')) != support_point:
                assert key=='right/06-opposite-passing', 'Notify downstream owner before changing a pinned support landmark'
        offset = [round(GROUND_PIVOT[i]-audit['sourcePivot'][i]*audit['scale']) for i in range(2)]
        previous[key] = {'source':path.relative_to(ROOT).as_posix(),'sourceSha256':digest,
            'supportFoot':'right' if key.endswith('02-passing') else 'left',
            'supportPoint':support_point,'landmark':'visible-plantar' if key in PLANTAR else 'visible-heel',
            'coordinateSpace':'native source PNG pixels',
            'normalizedSupportPoint':[round(support_point[i]*audit['scale']+offset[i],3) for i in range(2)],
            'sampleRgba':rgba,'note':note}
        if key not in PLANTAR or key in MATCHING_POINTS:
            previous[key]['supportHeel'] = point
            previous[key]['normalizedSupportHeel'] = [round(point[i]*audit['scale']+offset[i],3) for i in range(2)]
        if key=='right/06-opposite-passing':
            previous[key]['note'] += ' Generic supportPoint is the visible central plantar forefoot pad to match neutral far-left foot; supportHeel stays secondary.'
    incoming = target.with_suffix('.incoming.json')
    incoming.write_text(json.dumps({'appearance':'woman','status':'complete' if len(previous)==16 else 'partial',
        'measurement':'Manually selected heel/sole landmark on the supporting foot in each own source PNG; grid crops and alpha contour checked.','frames':previous},
        ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    incoming.replace(target)
    print(json.dumps({'supportLandmarks':len(previous)}))


if __name__ == '__main__':
    main()
