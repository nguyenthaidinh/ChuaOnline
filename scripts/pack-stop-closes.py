"""Compile independent gather/close poses for either leading foot in all eight headings."""
import json
from animation_bank import ROOT, compile_bank, read_selection, sha
from pose_canvas import GROUND_PIVOT, normalize_pose
from PIL import Image

SOURCE = ROOT/'artwork/animation-v3/stop-closes-v1'
HEADINGS = ('rear', 'rearRight', 'right', 'frontRight', 'front', 'frontLeft', 'left', 'rearLeft')
LEADS = ('right', 'left')
PHASES = ('gather', 'close')
IDS = [heading+'/'+lead+'-'+phase for heading in HEADINGS for lead in LEADS for phase in PHASES]
PASSING_IDS = [heading+'/'+lead+'-passing' for heading in HEADINGS for lead in LEADS]


def normalize_selected_pose(path):
    appearance=path.relative_to(SOURCE).parts[0]
    directory=SOURCE/appearance
    manifest=directory/'canvas-overrides.json'
    overrides=json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else {}
    override=overrides.get(path.relative_to(directory).as_posix())
    if override:
        if not override.get('reviewed') or override['sourceSha256']!=sha(path):
            raise ValueError('Rereview changed near-square source before packing.')
    return normalize_pose(path,allow_near_square=bool(override))


def landmark_kind(value):
    value=value.lower().replace('-', '').replace('_', '')
    if value in ('heel','visibleheel'):return 'heel'
    if value in ('plantartoepad','visibletoepad','toepad','visibleplantar','plantar'):return 'plantar-toe-pad'
    raise ValueError('Unknown support landmark: '+value)


def normalized_contact(annotation, point):
    path=(ROOT/annotation['source']).resolve()
    if not path.is_relative_to((ROOT/'artwork/animation-v3').resolve()) or sha(path)!=annotation['sourceSha256']:
        raise ValueError('Source contact changed: '+str(path))
    _,audit=normalize_selected_pose(path) if path.is_relative_to(SOURCE) else normalize_pose(path)
    if len(point)!=2 or not all(isinstance(value,(int,float)) for value in point):
        raise ValueError('Invalid support coordinates.')
    with Image.open(path) as raw:
        x,y=(round(value) for value in point)
        if not (0<=x<raw.width and 0<=y<raw.height):raise ValueError('Support is outside source.')
        if raw.convert('RGBA').getchannel('A').crop((max(0,x-3),max(0,y-3),x+4,y+4)).getextrema()[1]<160:
            raise ValueError('Support point has no source pixels.')
    return {axis:round(point[i]*audit['scale']+round(GROUND_PIVOT[i]-audit['sourcePivot'][i]*audit['scale']),4)
            for i,axis in enumerate(('x','y'))}


def reference_contacts(appearance):
    if appearance=='man':
        directory=SOURCE/'man/passing-v2'
        neutrals=json.loads((directory/'reference-feet.json').read_text(encoding='utf-8'))['frames']
        passing=json.loads((directory/'support-feet.json').read_text(encoding='utf-8'))['frames']
        result={}
        for heading in HEADINGS:
            own=[neutrals[heading+'/'+lead] for lead in LEADS]
            if own[0]['source']!=own[1]['source']:raise ValueError('Neutral feet use different sources.')
            result[heading]={'neutral':{**own[0],
                'points':{lead:own[i]['sourcePoint'] for i,lead in enumerate(LEADS)},
                'landmarks':{lead:own[i]['landmark'] for i,lead in enumerate(LEADS)}},'passing':{}}
            for lead in LEADS:
                pose=passing[heading+'/'+lead]
                if not pose.get('reviewed'):raise ValueError('Unreviewed passing pose.')
                result[heading]['passing'][lead]={**pose,'point':pose['sourcePoint']}
        return result
    directory=ROOT/'artwork/animation-v3/variant-gaits-v1'/appearance
    supports=json.loads((directory/'support-feet.json').read_text(encoding='utf-8'))['frames']
    neutrals=json.loads((directory/'neutral-feet.json').read_text(encoding='utf-8'))['frames']
    if isinstance(supports,list):supports={f['heading']+'/'+f['id']:f for f in supports}
    if isinstance(neutrals,list):neutrals={f['heading']+'/stand':f for f in neutrals}
    neutrals={key if '/' in key else key+'/stand':value for key,value in neutrals.items()}
    output={}
    for heading in HEADINGS:
        output[heading]={'neutral':neutrals[heading+'/stand'],'passing':{}}
        for lead,phase in [('right','02-passing'),('left','06-opposite-passing')]:
            frame=supports[heading+'/'+phase]
            if frame['supportFoot']!=lead:raise ValueError('Wrong annotated support foot.')
            output[heading]['passing'][lead]={**frame,'point':frame.get('supportPoint',frame.get('supportHeel'))}
    return output


def main():
    for appearance in ('man', 'woman', 'granny'):
        read_selection(SOURCE/appearance, IDS+(PASSING_IDS if appearance=='man' else []))
    output = {}
    annotations=json.loads((SOURCE/'support-contacts.json').read_text(encoding='utf-8'))['appearances']
    for appearance in ('man', 'woman', 'granny'):
        asset, frames = compile_bank(SOURCE/appearance, IDS+(PASSING_IDS if appearance=='man' else []), appearance+'-closes',normalizer=normalize_selected_pose)
        references=reference_contacts(appearance)
        headings={}
        for heading in HEADINGS:
            headings[heading]={}
            neutral=references[heading]['neutral']
            for lead in LEADS:
                target=normalized_contact(neutral,neutral['points'][lead])
                neutral_landmarks=neutral.get('landmarks',neutral.get('landmark'))
                target_kind=landmark_kind(neutral_landmarks[lead])
                passing=references[heading]['passing'][lead]
                if landmark_kind(passing['landmark'])!=target_kind:raise ValueError('Mismatched passing/neutral landmark.')
                passing_point=normalized_contact(passing,passing['point'])
                entry_offset={axis:target[axis]-passing_point[axis] for axis in ('x','y')}
                if max(map(abs,entry_offset.values()))>45:raise ValueError('Review gait/neutral support before export.')
                keys=[]
                for phase in PHASES:
                    frame_id=heading+'/'+lead+'-'+phase
                    frame=next(f for f in frames if f['id']==frame_id)
                    point=annotations[appearance]['frames'][frame_id]
                    if not point.get('reviewed'):raise ValueError('Unreviewed support: '+appearance+'/'+frame_id)
                    if point['supportFoot']!=lead or landmark_kind(point['landmark'])!=target_kind:
                        raise ValueError('Mismatched closing support: '+appearance+'/'+frame_id)
                    if point['source']!=frame['source'] or point['sourceSha256']!=frame['sha256']:
                        raise ValueError('Remeasure changed stopping source: '+frame_id)
                    contact=normalized_contact(point,point['point'])
                    offset={axis:target[axis]-contact[axis] for axis in ('x','y')}
                    if max(map(abs,offset.values()))>45:raise ValueError('Excessive stopping correction: '+frame_id)
                    l,t,r,b=frame['bounds']
                    if not (0<l+offset['x']<r+offset['x']<384 and 0<t+offset['y']<b+offset['y']<512):
                        raise ValueError('Contact correction clips source: '+frame_id)
                    glyph={'cell':frame['cell'],'id':frame_id.replace('/','-'),'top':frame['bounds'][1],
                           'rootOffset':offset,'supportContact':contact}
                    keys.append(glyph)
                headings[heading][lead]={'frames':keys,'entryOffset':entry_offset,
                                         'referenceContact':target,'passingContact':passing_point}
                if appearance=='man':
                    source=next(frame for frame in frames if frame['id']==heading+'/'+lead+'-passing')
                    if passing['source']!=source['source'] or passing['sourceSha256']!=source['sha256']:
                        raise ValueError('Passing source changed after annotation.')
                    headings[heading][lead]['passing']={'cell':source['cell'],'id':source['id'].replace('/','-'),
                        'top':source['bounds'][1],'rootOffset':entry_offset,'supportContact':passing_point}
        output[appearance]={'asset':asset,'headings':headings}
        (SOURCE/appearance/'support-review-compiled.json').write_text(json.dumps({
            'supportManifestSha256':sha(SOURCE/'support-contacts.json'),'references':references,
            'headings':headings},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    declaration = '''// Generated by pack-stop-closes.py; logical canvas384x512, webLOD144x192.
import type { Appearance } from './protocol.ts';
import type { Heading8 } from './locomotion.ts';
interface Point{x:number;y:number}
interface Glyph{cell:number;id:string;top:number;rootOffset:Point;supportContact:Point}
interface CloseBank {asset:{image:string;sha256:string;width:number;height:number;columns:number;rows:number;cellWidth:number;cellHeight:number};headings:Record<Heading8,Record<'right'|'left',{frames:readonly Glyph[];passing?:Glyph;entryOffset:Point;referenceContact:Point;passingContact:Point}>>}
export const STOP_CLOSES:Record<Appearance,CloseBank> = '''
    (ROOT/'src/room/stopCloseGeometry.ts').write_text(declaration+json.dumps(output)+';\n', encoding='utf-8')
    print(json.dumps({key:value['asset'] for key,value in output.items()}))


if __name__ == '__main__':
    main()
