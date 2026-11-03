import { useEffect, useRef } from 'react';
import { sampleEntry, sampleSharedRitual, SPRITES } from './ritual';
import { altarPoint, roomAssets, seatPoint, visitorPosition } from './layout';
import type { RoomMember } from './protocol';
import type { SceneLayoutId } from '../config/sceneLayout';

function Visitor({ person, self, layout, offset }: { person: RoomMember; self: boolean; layout: SceneLayoutId; offset: number }) {
  const root = useRef<HTMLButtonElement>(null);
  const art = useRef<HTMLImageElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const current = useRef({ person, layout, offset });
  current.current = { person, layout, offset };
  useEffect(() => {
    let frameId = 0;
    const render = () => {
      const { person, layout, offset } = current.current;
      const element = root.current;
      if (!element || !art.current || !strip.current || !name.current) return;
      const now = Date.now() + offset;
      const entry = sampleEntry(person.joinedAt, now);
      const entering = entry.phase !== 'idle';
      const pose = !entering && person.action ? sampleSharedRitual(person.action, now) : null;
      const home = seatPoint(person.seat, layout);
      const point = entering ? visitorPosition(home, { x: 50, y: 104 }, entry.travel)
        : pose && person.action ? visitorPosition(home, altarPoint(person.action.slot, layout), pose.travel) : home;
      const spriteFrame = entering ? entry.spriteFrame : pose?.spriteFrame ?? null;
      const phase = entering ? entry.phase : pose?.phase ?? 'idle';
      const height = (layout === 'desktop' ? 11.5 : 8.5) * (0.88 + (point.y - (layout === 'desktop' ? 76 : 64)) / 100);
      element.style.left = `${point.x}%`; element.style.top = `${point.y}%`;
      element.style.height = `${height}%`; element.style.zIndex = String(Math.round(point.y * 10));
      element.dataset.phase = phase;
      element.dataset.bows = String(pose?.completedBows ?? (person.completed?.kind === 'bow' ? 3 : 0));
      element.dataset.spriteFrame = spriteFrame === null ? 'static' : String(spriteFrame);
      art.current.style.display = spriteFrame === null ? 'block' : 'none';
      art.current.style.transform = `scaleY(${1 - (pose?.bowWeight ?? 0) * 0.3}) rotate(${(pose?.bowWeight ?? 0) * -8}deg)`;
      strip.current.style.display = spriteFrame === null ? 'none' : 'block';
      if (spriteFrame !== null) strip.current.style.backgroundPosition = `${spriteFrame / 7 * 100}% 0`;
      strip.current.style.transform = phase === 'returning' ? 'scaleX(-1)' : '';
      const sheet = SPRITES[person.appearance];
      name.current.style.bottom = `calc(${spriteFrame === null ? 100 : sheet.height / sheet.seatedHeight * 100}% + 4px)`;
      name.current.dataset.active = String(self || entering || Boolean(pose && pose.phase !== 'complete'));
      if (entering || (pose && pose.phase !== 'complete')) frameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frameId);
  }, [person.action?.id, person.joinedAt, self, layout, person.seat]);
  const sheet = SPRITES[person.appearance];
  const offering = person.action?.kind === 'incense' ? person.action.offering ?? 'incense' : null;
  return <button ref={root} className={`room-visitor ${self ? 'is-self' : ''}`} data-person-id={person.id} data-offering={offering ?? ''} aria-label={`${person.name}${self ? ' · Bạn' : ''}`} title={person.name}>
    <img ref={art} className="visitor-art" src={roomAssets.sprite(person.appearance)} alt="" draggable={false} />
    <div ref={strip} className="visitor-walk" style={{ backgroundImage: `url('${roomAssets.walk(person.appearance)}')`, height: `${sheet.height / sheet.seatedHeight * 100}%`, aspectRatio: `${sheet.width}/${sheet.height}` }} />
    <span ref={name} className="visitor-label">{person.name}{self && <i> · Bạn</i>}</span>
    {offering && <img className="visitor-offering" src={roomAssets.effect(offering)} alt="" />}
  </button>;
}

function OfferingEffect({ person, layout, offset }: { person: RoomMember; layout: SceneLayoutId; offset: number }) {
  const root = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const petals = useRef<HTMLDivElement>(null);
  const pulse = useRef<HTMLDivElement>(null);
  const current = useRef({ person, layout, offset });
  current.current = { person, layout, offset };
  useEffect(() => {
    let frameId = 0;
    const render = () => {
      const { person, layout, offset } = current.current;
      const element = root.current;
      if (!element || !image.current || !petals.current || !pulse.current || !person.action) return;
      const pose = sampleSharedRitual(person.action, Date.now() + offset);
      const active = pose.phase === 'performing';
      const p = pose.offeringProgress ?? 0;
      element.dataset.phase = pose.phase;
      element.style.opacity = active ? String(Math.min(1, p * 8, (1 - p) * 6)) : '0';
      element.style.left = `${50 + (person.action.slot - 1.5) * (layout === 'desktop' ? 2.5 : 4)}%`;
      element.style.top = `${layout === 'desktop' ? 57 : 50}%`;
      image.current.style.transform = `translateY(${-p * 22}px) scale(${0.7 + Math.min(1, p * 5) * 0.3})`;
      pulse.current.style.transform = `translate(-50%,-50%) scale(${0.8 + p * 0.6})`;
      Array.from(petals.current.children).forEach((child, index) => {
        const petal = child as HTMLElement;
        const seed = ((person.action!.id.charCodeAt(index % person.action!.id.length) + index * 13) % 100) / 100;
        const distance = (25 + seed * 60) * p;
        const angle = index * Math.PI * 2 / 8;
        petal.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance * 0.4 - p * 45}px) rotate(${index * 40 + p * 80}deg)`;
        petal.style.opacity = String(Math.min(1, p * 5) * (1 - p));
      });
      if (pose.phase !== 'complete') frameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frameId);
  }, [person.action?.id]);
  const offering = person.action?.offering ?? 'incense';
  return <div ref={root} className={`offering-effect effect-${offering}`} data-owner-id={person.id} data-effect={offering} aria-hidden="true">
    <div ref={pulse} className="offering-pulse"><img src={roomAssets.effect('halo')} alt="" /></div>
    <img ref={image} className="altar-offering" src={roomAssets.effect(offering)} alt="" />
    <div ref={petals} className="offering-petals">{Array.from({ length: 8 }, (_, index) => <img key={index} src={roomAssets.effect('petal')} alt="" />)}</div>
  </div>;
}

export function RoomScene({ people, selfId, layout, offset }: { people: RoomMember[]; selfId: string | null; layout: SceneLayoutId; offset: number }) {
  return <div className="room-painting" data-layout={layout} aria-label="Chánh điện chung">
    <img className="room-background" src={roomAssets.hall[layout]} alt="Chánh điện gỗ với tượng Phật, đèn lồng và lối đi thanh tịnh" fetchPriority="high" />
    <div className="painting-vignette" />
    {people.map(person => <Visitor key={person.id} person={person} self={person.id === selfId} layout={layout} offset={offset} />)}
    {people.filter(person => person.action?.kind === 'incense').map(person => <OfferingEffect key={person.action!.id} person={person} layout={layout} offset={offset} />)}
  </div>;
}
