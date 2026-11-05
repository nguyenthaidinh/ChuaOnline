"""Assemble reviewed male closing provenance without changing source/selection/contact files."""
from pathlib import Path
import hashlib,json
root=Path.cwd();own=root/'artwork/animation-v3/stop-closes-v1/man';group=own.parent
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
contacts=read(own/'support-contacts.json');assert len(contacts['frames'])==32 and all(f['reviewed'] for f in contacts['frames'].values())
manifests=[group/'generation.json',group/'male-refinement-generation.json',group/'male-role-refinement-generation.json',group/'male-square-refinement-generation.json',own/'support-role-final-generation.json',own/'profile-gather-final-generation.json']
provenance=[]
for manifest in manifests:
 doc=read(manifest);assert doc['tool']=='built-in image_gen'
 for job in doc['jobs']:
  output=job['output'];p=root/output if output.startswith('artwork/') else group/output if output.startswith('man/') else own/output
  assert p.is_file(),p
  references=[]
  for reference in job.get('references',[{'source':job['source'],'sha256':job.get('sourceSha256')}] if 'source' in job else []):
   r={'source':reference} if isinstance(reference,str) else reference.copy();digest=sha(root/r['source'])
   if r.get('sha256'):assert digest==r['sha256']
   references.append({'source':r['source'],'sha256':digest})
  provenance.append({'source':p.relative_to(root).as_posix(),'sha256':sha(p),'generationManifest':manifest.relative_to(root).as_posix(),'promptSha256':hashlib.sha256(job['prompt'].encode()).hexdigest(),'references':references})
index={f['source']:f for f in provenance};selected=[]
for key,frame in contacts['frames'].items():
 assert frame['source'] in index and frame['sourceSha256']==index[frame['source']]['sha256'],key
 selected.append({'id':key,**frame})
selected_paths={f['source'] for f in selected};drafts=[{'source':f['source'],'sha256':f['sha256'],'reason':'Retained superseded draft; selected source is explicit in selection.json and measured support-contacts.json.'} for f in provenance if f['source'] not in selected_paths]
boards=[f'closing-sequence-{i}-{name}.png' for i in [1,2] for name in ['light','dark']]
audit=read(own/'source-audit.json');audit['status']='reviewed-native-and-decoded-144-sequences';audit['reviewedBoards']=[{'source':name,'sha256':sha(own/name)} for name in boards];(own/'source-audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf8')
result={'tool':'built-in image_gen','selectedClosingPoses':32,'generatedClosingOutputs':len(provenance),'retainedClosingDrafts':drafts,'frames':selected,'provenance':provenance,'contactsSha256':sha(own/'support-contacts.json'),'canvasOverridesSha256':sha(own/'canvas-overrides.json'),'passingHandoffSha256':sha(own/'passing-v2/handoff.json'),'reviewedBoards':audit['reviewedBoards'],'limits':'Manual roughly2nativepixel contact landmarks, not optical tracking. Browser/runtime QA belongs to root. Source images unchanged; near-square geometry uses explicit uniformscale virtualsquare.'}
(own/'handoff.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print({'selected':len(selected),'generated':len(provenance),'drafts':len(drafts),'maxPin':max(max(map(abs,f['pinLogicalOffset'])) for f in contacts['frames'].values())})
