import test from 'node:test';
import assert from 'node:assert/strict';
import {BLESSINGS,BLESSING_CARDS,BlessingDeck,blessingTitle} from '../src/data/blessings.ts';

test('blessings cover a full round without repeats, including the boundary between rounds',()=>{
  assert.equal(BLESSINGS.length,20);
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

test('Vietnamese titles and copy use composed accents, stable unique IDs and matching titles',()=>{
  assert.equal(new Set(BLESSING_CARDS.map(card=>card.id)).size,20);
  assert.ok(BLESSING_CARDS.some(card=>card.title.includes('điều')));
  assert.ok(BLESSINGS.some(text=>text.includes('đều')));
  for(const[index,card]of BLESSING_CARDS.entries()){
    assert.equal(blessingTitle(index),card.title);
    for(const text of [card.title,card.text]){
      assert.equal(text.normalize('NFC'),text);
      assert.doesNotMatch(text,/[\u0300-\u036f`]/u,'No detached combining marks or spacing grave in authored text.');
    }
  }
});
