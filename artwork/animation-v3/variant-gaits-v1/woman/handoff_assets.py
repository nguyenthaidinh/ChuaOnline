"""Audit selected female source poses and retain an explicit rejected-candidate manifest."""
import hashlib
import json
from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
HEADINGS = ['rear','rearRight','right','frontRight','front','frontLeft','left','rearLeft']
REASONS = {
    'rearLeft/stand.png':'Rejected whole-body heading; selected stand-v2 faces rear-left.',
    'rearRight/02-passing.png':'Incorrect far-left support for a right-support label; selected v2 uses near right leg planted, far left foot suspended.',
    'rearRight/06-opposite-passing.png':'Broad alpha halo and ambiguous/repeated leg silhouette; superseded by reviewed v4.',
    'rearRight/06-opposite-passing-v2.png':'Halo refinement retained but full-source support-role audit required clearer foreground bent right thigh and far left support.',
    'rearRight/06-opposite-passing-v3.png':'Correct left-support/right-swing occlusion but knee height too high; v4 lowers it for natural passing.',
    'right/06-opposite-passing.png':'Swing leg extended too far for compact passing; selected v2 bends it beside the support shin.',
    'left/02-passing.png':'Long trailing split stride instead of compact passing; selected v2.',
    'left/06-opposite-passing.png':'Long forward reach instead of compact passing; selected v3.',
    'left/06-opposite-passing-v2.png':'Near raised thigh repeated phase02; selected v3 keeps near left thigh straight and far right leg bent behind.',
    'rearLeft/06-opposite-passing.png':'Repeated right support instead of opposite left support; selected v2.',
    'frontLeft/02-passing.png':'Returned during interrupted priority runner; preserved with recovered exact tool path/prompt, selected reviewed s3 sibling.',
}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def main():
    review = read(SOURCE/'source-review.json')
    assert len(review['frames']) == 72 and not review['missing']
    selected = {frame['source']:frame for frame in review['frames']}
    assert len(selected) == 72
    for frame in selected.values():
        path = ROOT/frame['source']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == frame['sha256']
        x0,y0,x1,y1 = frame['bounds']
        assert 0 < x0 < x1 < 384 and 0 < y0 < y1 < 512, frame
    for filename in ['locked-stands.json','locked-anchors.json']:
        for frame in read(SOURCE/filename)['frames']:
            assert selected[frame['source']]['sha256'] == frame['sha256']
    for frame in read(SOURCE/'support-feet.json')['frames'].values():
        assert selected[frame['source']]['sha256'] == frame['sourceSha256']
    for frame in read(SOURCE/'neutral-feet.json')['frames'].values():
        assert selected[frame['source']]['sha256'] == frame['sourceSha256']
    native = []
    drafts = []
    for heading in HEADINGS:
        for path in sorted((SOURCE/heading).glob('*.png')):
            with Image.open(path) as im:
                assert im.mode == 'RGBA' and im.size == (1254,1254), path
                assert im.getextrema()[3][0] == 0, path
            relative = path.relative_to(ROOT).as_posix()
            record = {'source':relative,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
            native.append(record)
            if relative not in selected:
                record['reason'] = REASONS[path.relative_to(SOURCE).as_posix()]
                drafts.append(record)
    reused = SOURCE/'rearRight/stand.png'
    original = ROOT/'artwork/animation-v3/variants-v1/woman/00-neutral.png'
    assert reused.read_bytes() == original.read_bytes()
    loops = []
    for heading in HEADINGS:
        path = SOURCE/(heading+'-loop.webp')
        with Image.open(path) as loop:
            assert loop.n_frames == 8 and loop.size == (384,512), path
            duration = 0
            for index in range(loop.n_frames):
                loop.seek(index)
                loop.load()
                duration += loop.info.get('duration',0)
            assert duration == 960, (path,duration)
        loops.append({'source':path.relative_to(ROOT).as_posix(),'frames':8,'durationMs':duration})
    generation = read(SOURCE/'generation.json')
    generation['records'] = generation['records'][:2]+[read(path) for path in sorted((SOURCE/'records').glob('*.json'))]
    for record in generation['records']:
        assert (SOURCE/record['output']).is_file()
        assert record['prompt'] and record['references'] and record['toolOutput']
    assert len({record['output'] for record in generation['records']}) == len(native)-1
    (SOURCE/'generation.json').write_text(json.dumps(generation,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    result = {'appearance':'woman','status':'source-complete','tool':'built-in image_gen',
        'selectedCount':len(selected),'selectedNewOutputs':71,'exactReusedOutputs':1,
        'retainedNewOutputs':len(native)-1,'nativeSourceFiles':len(native),'draftCount':len(drafts),
        'sourceGeometry':{'native':[1254,1254],'logical':[384,512],'pivot':[192,468],'runtimeCellPlanned':[144,192]},
        'validation':'All selected/native source SHA, 32 anchor locks, 16 passing contacts, 16 neutral contacts, native RGBA/square alpha, non-clipped normalized bounds, exact reused neutral, and eight 8-frame/960ms loops checked. Light/dark ordered-frame boards manually reviewed; runtime/browser rendering remains parent integration.',
        'selected':list(selected.values()),'drafts':drafts,'loops':loops}
    (SOURCE/'handoff.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:result[key] for key in ['selectedCount','retainedNewOutputs','nativeSourceFiles','draftCount']}))


if __name__ == '__main__':
    main()
