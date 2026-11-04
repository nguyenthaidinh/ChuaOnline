import test from 'node:test';
import assert from 'node:assert/strict';
import {BLESSINGS,BlessingDeck} from '../src/data/blessings.ts';

test('blessings cover a full round without repeats, including the boundary between rounds',()=>{
  assert.ok(BLESSINGS.length>=80);
  assert.equal(new Set(BLESSINGS).size,BLESSINGS.length);
  for(const random of [()=>0,()=>.999,Math.random]) {
    const deck=new BlessingDeck(BLESSINGS.length,random);
    let previous=-1;
    for(let round=0;round<3;round++) {
      const seen=new Set<number>();
      for(let i=0;i<BLESSINGS.length;i++) {
        const next=deck.next();assert.notEqual(next,previous);
        assert.ok(BLESSINGS[next]);seen.add(next);previous=next;
      }
      assert.equal(seen.size,BLESSINGS.length);
    }
  }
});
