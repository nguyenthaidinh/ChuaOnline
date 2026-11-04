import test from 'node:test';
import assert from 'node:assert/strict';
import { HEADING_ORDER } from '../src/room/locomotion.ts';
import { turnHeading } from '../src/room/headingTurns.ts';

test('all authored turn paths reach their target with at most four adjacent view changes',()=>{
  for(const from of HEADING_ORDER)for(const to of HEADING_ORDER){
    const visited=[...new Set(Array.from({length:101},(_,i)=>turnHeading(from,to,i/100)))];
    assert.equal(visited[0],from);assert.equal(visited.at(-1),to);assert.ok(visited.length<=5);
    for(let index=1;index<visited.length;index++){
      const a=HEADING_ORDER.indexOf(visited[index-1]),b=HEADING_ORDER.indexOf(visited[index]);
      assert.equal(Math.min((a-b+8)%8,(b-a+8)%8),1);
    }
    assert.equal(turnHeading(from,to,-Infinity),from);assert.equal(turnHeading(from,to,Infinity),to);
    assert.equal(turnHeading(from,to,NaN),from);
  }
});

test('opposite headings always use the same deterministic pivot direction',()=>{
  assert.deepEqual([0,.25,.5,.75,1].map(t=>turnHeading('rear','front',t)),
    ['rear','rearLeft','left','frontLeft','front']);
  assert.deepEqual([0,.25,.5,.75,1].map(t=>turnHeading('front','rear',t)),
    ['front','frontRight','right','rearRight','rear']);
});
