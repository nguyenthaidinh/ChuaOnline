"""Bind retained generated sources and exact reference selections to content hashes."""
import hashlib
import json
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
PROJECT = SOURCE.parents[2]
MANIFESTS = ['generation.json', 'pilot-generation.json', 'pilot-bow-refinement.json',
             'man-generation.json', 'rise-refinement-generation.json',
             'petal-refinement-generation.json', 'rise-foot-refinement-generation.json',
             'variant-pilot-generation.json', 'variant-generation.json',
             'floor-contact-refinement-generation.json']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    jobs = []
    selections = json.loads((SOURCE/'selection.json').read_text(encoding='utf-8'))
    definition = json.loads((SOURCE/'sequences.json').read_text(encoding='utf-8'))
    selected = {selections.get(f'{appearance}/{frame_id}', f'{appearance}/{frame_id}.png')
                for appearance in ('man', 'woman', 'granny') for frame_id in definition['ids']}
    for name in MANIFESTS:
        manifest = json.loads((SOURCE/name).read_text(encoding='utf-8'))
        if manifest['tool'] != 'built-in image_gen':
            raise ValueError(f'Unexpected generator: {name}')
        for job in manifest['jobs']:
            output = (SOURCE/job['output']).resolve()
            if not output.is_relative_to(SOURCE) or output.suffix != '.png':
                raise ValueError(f'Invalid generated output: {output}')
            references = []
            for path in job['references']:
                record=path if isinstance(path,dict) else None
                reference = Path(record['source'] if record else path)
                reference=(reference if reference.is_absolute() else PROJECT/reference).resolve()
                if record and record.get('sha256')!=sha(reference):
                    raise ValueError('Reference changed after generation: '+str(reference))
                references.append({'source': reference.relative_to(PROJECT).as_posix(),
                                   'sha256': sha(reference)})
            jobs.append({'manifest': name, 'output': job['output'], 'sha256': sha(output),
                         'selected': job['output'] in selected,
                         'promptSha256': hashlib.sha256(job['prompt'].encode('utf-8')).hexdigest(),
                         'references': references})
    outputs = [job['output'] for job in jobs]
    if len(set(outputs)) != len(outputs):
        raise ValueError('Generation manifests contain duplicate output paths.')
    reuse = json.loads((SOURCE/'generation.json').read_text(encoding='utf-8'))['reuse']
    reused = {appearance: {'source': path, 'sha256': sha(PROJECT/path)}
              for appearance, path in reuse.items()}
    generated_selected = sum(job['selected'] for job in jobs)
    if generated_selected != 69 or len(selected) != 72:
        raise ValueError('Every one of the 69 new selected poses must have provenance.')
    audit = {'generator': 'built-in image_gen', 'selectedPoses': len(selected),
             'generatedSelected': generated_selected, 'retainedDrafts': len(jobs)-generated_selected,
             'generatedOutputs': len(jobs), 'reusedNeutral': reused, 'jobs': jobs}
    (SOURCE/'provenance.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:value for key,value in audit.items() if key not in ('jobs','reusedNeutral')}))


if __name__ == '__main__':
    main()
