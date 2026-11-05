"""Prepare ImageGen prompts only after the artist has locked each supporting-leg reference."""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw
from pose_canvas import normalize_pose

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'artwork/animation-v3/stop-closes-v1'
GAITS=ROOT/'artwork/animation-v3/variant-gaits-v1'
HEADINGS=('rear','rearRight','right','frontRight','front','frontLeft','left','rearLeft')


def frame_map(frames):
    if isinstance(frames,dict):return frames
    return {frame['heading']+'/'+frame.get('id','stand'):frame for frame in frames}


def checked(frame):
    path=(ROOT/frame['source']).resolve()
    if not path.is_relative_to(GAITS.resolve()) or path.suffix.lower()!='.png':
        raise ValueError('Support reference escapes its approved gait group.')
    if hashlib.sha256(path.read_bytes()).hexdigest()!=frame['sha256']:
        raise ValueError('Locked reference changed: '+str(path))
    return path.relative_to(ROOT).as_posix()


def main():
    manifest=SOURCE/'female-generation.json'
    recorded=json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else {'tool':'built-in image_gen','jobs':[]}
    existing={job['output']:job for job in recorded['jobs']}
    ready=[]
    reference_frames={}
    for appearance in ('woman','granny'):
        directory=GAITS/appearance
        anchors=frame_map(json.loads((directory/'locked-anchors.json').read_text(encoding='utf-8'))['frames'])
        stands=frame_map(json.loads((directory/'locked-stands.json').read_text(encoding='utf-8'))['frames']) if (directory/'locked-stands.json').exists() else anchors
        identity='adult Vietnamese woman, dark low bun and blue-grey ao lam' if appearance=='woman' else 'elderly Vietnamese woman, grey low bun and warm brown ao lam'
        for heading in HEADINGS:
            ids=[heading+'/'+phase for phase in ('02-passing','06-opposite-passing')]
            if not all(key in anchors for key in ids) or heading+'/stand' not in stands:
                continue
            neutral=checked(stands[heading+'/stand'])
            for support,key in zip(('right','left'),ids):
                anchor=checked(anchors[key])
                other='LEFT' if support=='right' else 'RIGHT'
                for phase in ('gather','close'):
                    output=f'artwork/animation-v3/stop-closes-v1/{appearance}/{heading}/{support}-{phase}.png'
                    if (ROOT/output).exists():continue
                    action=(f'The airborne anatomical {other} foot moves halfway toward its neutral position, staying slightly off the floor. Arms soften toward their resting sides.' if phase=='gather' else f'The moving anatomical {other} toes softly touch down close beside the supporting foot, knees straighten gently, both arms nearly neutral. Keep weight on the original support leg until the second foot has landed.')
                    prompt=f'''Use case: identity-preserve. Asset: ONE transparent ChuaOnline stopping animation pose, not a sheet. Image1 is the approved MID-STANCE/PASSING pose: anatomical {support.upper()} leg is the straight planted weight-bearing support UNDER THE HIP, and anatomical {other} leg is airborne. Image2 is the matching neutral identity/stance target. Create the {phase.upper()} intermediate closing step. {action} The original {support.upper()} support heel/sole stays FLAT at the EXACT source pixel location in image1; do not swap legs, lift that heel, or slide it. Preserve the same {identity}, face/bun/garment, root/body scale, elevated orthographic-style camera, heading {heading}, warm upper-left light and fixed framing. Keep the head and torso aimed in precisely image1's direction; do not turn toward the camera. Same square1254 transparent canvas, root origin nearx615,y1210 and original transparent margins. No zoom, recenter, cropping, mirrored anatomy, extra limbs/person, props, cushion, floor, baked shadow, text or motion blur. Genuine clean RGBA transparency.'''
                    job={'appearance':appearance,'heading':heading,'supportFoot':support,'phase':phase,'prompt':prompt,
                         'references':[anchor,neutral],'referenceHashes':[anchors[key]['sha256'],stands[heading+'/stand']['sha256']], 'output':output}
                    if output in existing and existing[output]!=job:raise ValueError('Prepared job changed: '+output)
                    existing[output]=job;ready.append(job)
                    reference_frames[appearance+'/'+heading+'/'+support]=anchor
                    reference_frames[appearance+'/'+heading+'/neutral']=neutral
                    (ROOT/output).parent.mkdir(parents=True,exist_ok=True)
    recorded['jobs']=list(existing.values())
    manifest.write_text(json.dumps(recorded,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    scratch=ROOT/'.local-qa';scratch.mkdir(exist_ok=True)
    (scratch/'stop-jobs-ready.json').write_text(json.dumps(ready,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    rows=max(1,(len(reference_frames)+3)//4)
    board=Image.new('RGBA',(192*4,276*rows),'#2a2015');draw=ImageDraw.Draw(board)
    for i,(key,path) in enumerate(reference_frames.items()):
        image,_=normalize_pose(ROOT/path);x,y=i%4*192,i//4*276
        board.alpha_composite(image.resize((192,256)),(x,y+20));draw.text((x+3,y+3),key,fill='#e4cda1')
    board.convert('RGB').save(scratch/'stop-ready-references.jpg',quality=95)
    print(json.dumps({'ready':len(ready),'groups':sorted({job['appearance']+'/'+job['heading'] for job in ready})}))


if __name__=='__main__':main()
