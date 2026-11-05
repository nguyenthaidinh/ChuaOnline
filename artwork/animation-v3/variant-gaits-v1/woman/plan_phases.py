"""Build six in-between requests only from locked, reviewed woman contact anchors."""
import hashlib
import json
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
HEADINGS = ('rear', 'rearRight', 'right', 'frontRight', 'front', 'frontLeft', 'left', 'rearLeft')
DETAILS = {
    '01-loading': ('00-contact', 'RIGHT-FOOT LOADING: after the right heel contact, roll that right foot flat and transfer weight onto it. Left heel stays raised with left toes finishing push-off behind. Keep left arm forward/right arm back, slightly smaller swing. No repeated contact or swapped leading leg.'),
    '02-passing': ('00-contact', 'RIGHT SUPPORT / LEFT PASSING: right support leg is near vertical beneath the pelvis, left knee bends and swings forward past the supporting right shin. Right foot still supports the body. Hands pass near hips with restrained swing. This is a compact mid-stride, not a second heel contact or long reach.'),
    '03-swing': ('04-opposite-contact', 'PRE-LEFT-HEEL CONTACT: retain the approved LEFT-leading opposite step. Nearly extend left knee forward; left heel hovers a few centimetres before landing with toes slightly raised. Right trailing toes remain planted, right heel lifted. Right arm forward/left arm back. Do not curl the leading knee or reset to the initial right-leading step.'),
    '05-opposite-loading': ('04-opposite-contact', 'LEFT-FOOT LOADING: after the left heel contact, roll left foot flat and transfer weight onto it. Right heel stays raised with right toes finishing push-off behind. Keep right arm forward/left arm back, slightly smaller swing. No repeated contact or swapped leading leg.'),
    '06-opposite-passing': ('04-opposite-contact', 'LEFT SUPPORT / RIGHT PASSING: left support leg is near vertical beneath the pelvis, right knee bends and swings forward past the supporting left shin. Left foot supports the body. Hands pass near hips with restrained swing. This is a compact mid-stride, not a second heel contact or long reach.'),
    '07-opposite-swing': ('00-contact', 'PRE-RIGHT-HEEL CONTACT: retain the approved RIGHT-leading initial step. Nearly extend right knee forward; right heel hovers a few centimetres before landing with toes slightly raised. Left trailing toes remain planted, left heel lifted. Left arm forward/right arm back. Do not curl the leading knee or reset to the opposite left-leading step.'),
}
DIRECTIONS = {
    'rear': 'STRAIGHT REAR walking away/screen-UP; centered black bun/spine, no face profile.',
    'rearRight': 'REAR-RIGHT45degrees walking screen-UP-RIGHT; back and left side visible, nose/profile points RIGHT.',
    'right': 'EXACT RIGHT SIDE PROFILE walking screen-RIGHT; head/chest/pelvis/toes aim RIGHT.',
    'frontRight': 'FRONT-RIGHT45degrees walking screen-DOWN-RIGHT; keep the approved female face/yaw.',
    'front': 'STRAIGHT FRONT walking toward viewer/screen-DOWN; centered face/buttons, shoulders balanced.',
    'frontLeft': 'FRONT-LEFT45degrees walking screen-DOWN-LEFT; keep the approved female face/yaw.',
    'left': 'EXACT LEFT SIDE PROFILE walking screen-LEFT; head/chest/pelvis/toes aim LEFT.',
    'rearLeft': 'REAR-LEFT45degrees walking screen-UP-LEFT; back and right side visible, nose/profile points LEFT.',
}


def main():
    references = json.loads((SOURCE / 'male-reference-manifest.json').read_text(encoding='utf-8'))
    locks = json.loads((SOURCE / 'locked-anchors.json').read_text(encoding='utf-8'))
    contacts = [frame for frame in locks['frames'] if frame['id'] in ('00-contact','04-opposite-contact')]
    assert locks['status'] == 'locked' and len(contacts) == 16
    anchors = {(frame['heading'], frame['id']): frame for frame in contacts}
    jobs = []
    for heading in HEADINGS:
        for phase, (anchor_id, description) in DETAILS.items():
            anchor = anchors[(heading, anchor_id)]
            source = ROOT / anchor['source']
            assert hashlib.sha256(source.read_bytes()).hexdigest() == anchor['sha256']
            target = ROOT / references[heading][phase]
            prompt = ('Use case: identity-preserve. Create ONE transparent full-body animation in-between pose. '
                'IMAGE1 is the approved adult WOMAN contact anchor: exact identity, garment, head/bun, view/camera and scale. '
                'IMAGE2 is ONLY the target male walking PHASE and limb placement; do not copy his face or masculine build. '
                'Move the SAME Vietnamese woman into image2\'s pose. Keep black hair in the same neat low bun, calm face, '
                'blue-grey ao lam and full loose trousers, feminine adult proportions and bare feet. '
                f'Physical heading: {DIRECTIONS[heading]} Phase: {description} '
                'Preserve the body yaw and head direction of image1; match image2\'s anatomical arms/legs. '
                'Same elevated camera and warm upper-left light/soft fill, matte cloth and semi-realistic game style. '
                'Same SQUARE1254canvas with UNUSED transparent margins, hair top aroundy30 and source floor/root nearx615,y1210. '
                'Do not zoom, trim, crop or recenter. Full head, hands and feet inside true RGBA alpha. Both hands EMPTY. '
                'No male identity, grey hair, mirror, ghost limbs, second person, floor, baked shadow, cushion, props, text, '
                'motion blur or colored alpha fringe. One individual pose only.')
            jobs.append({'heading': heading, 'id': phase, 'output': f'{heading}/{phase}.png',
                'anchor': anchor['source'], 'anchorSha256': anchor['sha256'],
                'references': [source.as_posix(), target.as_posix()], 'prompt': prompt})
    (SOURCE / 'phase-plan.json').write_text(json.dumps({'tool':'built-in image_gen','jobs':jobs},
        ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'phaseJobs':len(jobs)}))


if __name__ == '__main__':
    main()
