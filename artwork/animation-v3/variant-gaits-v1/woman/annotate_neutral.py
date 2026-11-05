"""Own-source stance landmarks, manually selected on grid crops and alpha checked."""
import hashlib
import json
from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
POINTS = {
    'rear': {
        'right': ([675,1206], 'visible-heel', 'Lower rear heel curve on the image-right foot; heel is directly visible.'),
        'left': ([570,1206], 'visible-heel', 'Lower rear heel curve on the image-left foot; heel is directly visible.'),
    },
    'rearRight': {
        'right': ([627,1183], 'visible-heel', 'Lower posterior heel edge of the near, image-right foot.'),
        'left': ([535,1177], 'visible-heel', 'Visible low rear heel curve of the far, image-left foot.'),
    },
    'right': {
        'right': ([562,1189], 'visible-heel', 'Low posterior heel edge of the near profile foot.'),
        'left': ([690,1164], 'visible-plantar', 'Far heel is occluded by the near ankle/foot. This is the visible plantar edge below the far forefoot, not an inferred heel.'),
    },
    'frontRight': {
        'right': ([539,1195], 'visible-heel', 'Visible lower posterior/side heel edge of the near, image-left foot.'),
        'left': ([635,1193], 'visible-heel', 'Low posterior heel edge of the far foot, just before the arch.'),
    },
    'front': {
        'right': ([570,1215], 'visible-plantar', 'Heel is behind the forefoot/cuff in the frontal view. This is a visible plantar toe-contact edge on the anatomical right, image-left foot.'),
        'left': ([665,1215], 'visible-plantar', 'Heel is behind the forefoot/cuff in the frontal view. This is a visible plantar toe-contact edge on the anatomical left, image-right foot.'),
    },
    'frontLeft': {
        'right': ([592,1190], 'visible-heel', 'Low posterior/side heel edge of the far, image-left foot.'),
        'left': ([635,1221], 'visible-plantar', 'Visible central plantar toe-pad on the near, image-right foot. This matches passing06, whose heel is occluded; the heel remains a secondary visible feature only.'),
    },
    'left': {
        'right': ([530,1177], 'visible-plantar', 'Far heel is occluded by the near leg/ankle. This is the actual visible plantar edge below the far forefoot, not an inferred heel.'),
        'left': ([682,1197], 'visible-heel', 'Low posterior heel curve of the near profile foot.'),
    },
    'rearLeft': {
        'right': ([674,1191], 'visible-heel', 'Low posterior heel curve of the far, image-right foot.'),
        'left': ([590,1200], 'visible-heel', 'Visible low posterior heel curve of the near, image-left foot.'),
    },
}


def main():
    selected = json.loads((SOURCE/'selection.json').read_text(encoding='utf-8'))
    frames = {}
    for heading, feet in POINTS.items():
        path = (SOURCE/selected.get(heading+'/stand',heading+'/stand.png')).resolve()
        assert path.is_relative_to(SOURCE.resolve())
        samples = {}
        with Image.open(path) as im:
            assert im.mode == 'RGBA'
            for foot, (point, _, _) in feet.items():
                samples[foot] = im.getpixel(tuple(point))
                assert samples[foot][3] > 160, (heading, foot, point, samples[foot])
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        frames[heading] = {
            'source':path.relative_to(ROOT).as_posix(),
            'sourceSha256':digest,
            'coordinateSpace':'native source PNG pixels',
            'points':{foot:entry[0] for foot,entry in feet.items()},
            'landmark':{foot:entry[1] for foot,entry in feet.items()},
            'landmarkNote':{foot:entry[2] for foot,entry in feet.items()},
            'sampleRgba':samples,
        }
    target = SOURCE/'neutral-feet.json'
    data = {'appearance':'woman','status':'complete','measurement':'Sixteen manually selected native-source heel/plantar landmarks. Anatomical left/right, own female PNGs, grid and alpha checked; occluded heels explicitly use a visible plantar edge.', 'frames':frames}
    incoming = target.with_suffix('.incoming.json')
    incoming.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    incoming.replace(target)
    print(json.dumps({'neutralHeadings':len(frames),'neutralFootLandmarks':sum(len(f['points']) for f in frames.values())}))


if __name__ == '__main__':
    main()
