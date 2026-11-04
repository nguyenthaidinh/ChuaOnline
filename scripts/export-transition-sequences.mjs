import { readFileSync, writeFileSync } from 'node:fs';
import { parseStudyAtlas } from '../src/dev/studyAtlas.ts';
import { compileStudySequence, transitionDefinition } from '../src/dev/transitionTimeline.ts';

const directory = 'artwork/animation-v3/transitions-v2';
const atlases = {
  walk: parseStudyAtlas(JSON.parse(readFileSync('artwork/animation-v3/walk-v1/review.json', 'utf8'))),
  transition: parseStudyAtlas(JSON.parse(readFileSync(`${directory}/review.json`, 'utf8'))),
};
const ids = ['sequence', 'standUp', 'turn', 'startWalk', 'stopWalk', 'sitDown'];
const clips = Object.fromEntries(ids.map(id => [id, compileStudySequence(transitionDefinition(id), atlases)]));
writeFileSync(`${directory}/sequences.json`, JSON.stringify({ atlases, clips }, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(ids.map(id => [id, {
  frames: clips[id].steps.length,
  durationMs: clips[id].durationMs,
}]))));
