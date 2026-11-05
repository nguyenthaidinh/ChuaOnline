"""Freeze actual saved ImageGen provenance after all selected poses are reviewed."""
import hashlib
import json
from pathlib import Path

from PIL import Image

from review_sources import HEADINGS, PHASES, ROOT, SOURCE, selected_path


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    selection = json.loads((SOURCE / 'selection.json').read_text(encoding='utf-8'))
    review = json.loads((SOURCE / 'review.json').read_text(encoding='utf-8'))
    if review['status'] != 'source-reviewed' or len(review['frames']) != 72:
        raise ValueError('Full 72-pose board review is required before freezing provenance.')
    visual = json.loads((SOURCE / 'visual-review.json').read_text(encoding='utf-8'))
    if visual['status'] != 'approved-source-review' or set(visual['headings']) != set(HEADINGS):
        raise ValueError('Manual visual review of every heading is required.')
    rows = [json.loads(line.lstrip('\ufeff')) for line in
            (SOURCE / 'generation-results.ndjson').read_text(encoding='utf-8-sig').splitlines()
            if line.strip()]
    outputs = [row['output'] for row in rows]
    if len(outputs) != len(set(outputs)):
        raise ValueError('Duplicate output provenance. Preserve edits under versioned filenames.')
    selected = {f'{h}/{phase}': selected_path(h, phase, selection)
                for h in HEADINGS for phase in ('stand',) + PHASES}
    review_by_source = {frame['source']: frame for frame in review['frames']}
    jobs, drafts = [], []
    for row in rows:
        path = (SOURCE / row['output']).resolve()
        if not path.is_relative_to(SOURCE) or not path.is_file():
            raise ValueError(f'Invalid saved output: {row["output"]}')
        digest = sha(path)
        builtin = Path(row['builtinOutput'])
        if builtin.exists() and sha(builtin) != digest:
            raise ValueError(f'Saved PNG differs from actual built-in output: {path}')
        references = []
        for value in row['references']:
            ref = Path(value).resolve()
            references.append({'source': ref.relative_to(ROOT).as_posix(), 'sha256': sha(ref)})
        key = row['heading'] + '/' + row['id']
        is_selected = selected[key] == path
        if is_selected and path.relative_to(ROOT).as_posix() not in review_by_source:
            raise ValueError(f'Selected source absent from review: {key}')
        if is_selected and review_by_source[path.relative_to(ROOT).as_posix()]['sha256'] != digest:
            raise ValueError(f'Source changed after board review: {key}')
        with Image.open(path) as image:
            if image.mode != 'RGBA' or image.getchannel('A').getextrema() != (0, 255):
                raise ValueError(f'Invalid alpha: {path}')
            source_size = list(image.size)
        job = {**row, 'status': 'reviewed-selected' if is_selected else 'retained-draft',
               'sha256': digest, 'sourceSize': source_size, 'referenceAssets': references}
        jobs.append(job)
        if not is_selected:
            drafts.append({'id': key, 'source': row['output'], 'sha256': digest})
    reuse_source = ROOT / 'artwork/animation-v3/variants-v1/granny/00-neutral.png'
    reuse_output = SOURCE / 'rearRight/stand.png'
    if sha(reuse_source) != sha(reuse_output):
        raise ValueError('Reused neutral must remain byte-identical.')
    selected_generated = sum(job['status'] == 'reviewed-selected' for job in jobs)
    if selected_generated != 71 or len(selected) != 72:
        raise ValueError('Exactly 71 generated selections and one reused neutral are required.')
    loops = []
    for heading in HEADINGS:
        for suffix, size in (('', (384, 512)), ('-lod144', (144, 192))):
            path = SOURCE / f'{heading}-loop{suffix}.webp'
            with Image.open(path) as loop:
                if loop.n_frames != 8 or loop.size != size:
                    raise ValueError(f'Expected eight complete frames at {size}: {path}')
                hashes = []
                for frame_index in range(loop.n_frames):
                    loop.seek(frame_index)
                    hashes.append(hashlib.sha256(loop.convert('RGBA').tobytes()).hexdigest())
                if len(set(hashes)) != 8:
                    raise ValueError(f'Duplicate encoded phase: {path}')
            loops.append({'source': path.relative_to(SOURCE).as_posix(), 'sha256': sha(path),
                          'frames': 8, 'size': list(size), 'loopMs': 960})
    manifest = {
        'tool': 'built-in image_gen', 'appearance': 'granny',
        'canvasIntent': '1254 square RGBA source; fixed elevated camera; no source crop, recenter, mirror, recolor or semantic pixel edits.',
        'normalization': {'module': 'scripts/pose_canvas.py', 'canvas': [384, 512], 'groundPivot': [192, 468]},
        'counts': {'selected': 72, 'generatedSelected': selected_generated, 'reusedSelected': 1,
                   'toolOutputs': len(jobs), 'drafts': len(drafts)},
        'reuse': [{'id': 'rearRight/stand', 'source': reuse_source.relative_to(ROOT).as_posix(),
                   'output': 'rearRight/stand.png', 'sha256': sha(reuse_output), 'byteIdentical': True}],
        'jobs': jobs, 'drafts': drafts,
        'review': {'manifest': 'review.json', 'visual': 'visual-review.json', 'loops': loops,
                   'note': 'Reviewed source boards and frame sequence; browser verification belongs to the integration owner.'},
    }
    (SOURCE / 'generation.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    sources = [{'id': key, 'source': path.relative_to(ROOT).as_posix(), 'sha256': sha(path)}
               for key, path in selected.items()]
    (SOURCE / 'selected-sources.json').write_text(json.dumps({'appearance': 'granny', 'count': len(sources), 'sources': sources,
                                                            'draftCount': len(drafts), 'drafts': drafts}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest['counts']))


if __name__ == '__main__':
    main()
