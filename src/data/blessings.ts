import { BLESSING_CARDS } from './blessingCatalog.ts';
export { BLESSING_CARDS };
export const BLESSINGS = BLESSING_CARDS.map(card=>card.text.normalize('NFC'));
export const blessingTitle = (index:number) => (BLESSING_CARDS[index]??BLESSING_CARDS[0]).title.normalize('NFC');
export const blessingAudio = (index:number) => `assets/audio/blessings/${(BLESSING_CARDS[index]??BLESSING_CARDS[0]).id}.mp3`;

/** Shuffle once per round so every blessing is seen before any is repeated. */
export class BlessingDeck {
  private remaining:number[]=[];
  private previous=-1;
  private size:number;
  private random:()=>number;
  constructor(size=BLESSINGS.length,random:()=>number=Math.random) {
    if(size<1)throw new Error('A blessing deck needs at least one card.');
    this.size=size;this.random=random;
  }
  next() {
    if(!this.remaining.length) {
      this.remaining=Array.from({length:this.size},(_,i)=>i);
      for(let i=this.remaining.length-1;i>0;i--) {
        const j=Math.floor(this.random()*(i+1));
        [this.remaining[i],this.remaining[j]]=[this.remaining[j],this.remaining[i]];
      }
      const last=this.remaining.length-1;
      if(this.size>1&&this.remaining[last]===this.previous)[this.remaining[0],this.remaining[last]]=[this.remaining[last],this.remaining[0]];
    }
    this.previous=this.remaining.pop()!;
    return this.previous;
  }
}
