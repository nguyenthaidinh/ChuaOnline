import { useEffect, useRef } from 'react';
import { RitualTimeline } from '../services/ritualTimeline';
import { WALK_SECONDS, INCENSE_SECONDS, type RoomMember } from './protocol';
import { altarPoint, roomAssets, seatPoint, visitorPosition } from './layout';
import type { SceneLayoutId } from '../config/sceneLayout';

function Visitor({ person, self, layout, offset }: { person: RoomMember; self: boolean; layout: SceneLayoutId; offset: number }) {
  const root = useRef<HTMLButtonElement>(null);
  const art = useRef<HTMLImageElement>(null);
  const walk = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const current = useRef({ person, layout, offset });
  current.current = { person, layout, offset };
  useEffect(() => {
    let frameId = 0;
    const command = person.action;
    const timeline = command ? new RitualTimeline(command, () => {}, WALK_SECONDS, INCENSE_SECONDS) : null;
    const render = () => {
      const { person, layout, offset } = current.current;
      const element = root.current;
      if (!element || !art.current || !walk.current || !name.current) return;
      const frame = timeline && command ? timeline.sampleAt((Date.now() + offset - command.startedAt) / 1000) : null;
      const home = seatPoint(person.seat, layout);
      const point = frame && command ? visitorPosition(home, altarPoint(command.slot, layout), frame.travel) : home;
      const walking = frame?.phase === 'moving' || frame?.phase === 'returning';
      const height = (layout === 'desktop' ? 11.5 : 8.5) * (0.88 + (point.y - (layout === 'desktop' ? 76 : 64)) / 100);
      element.style.left = `${point.x}%`; element.style.top = `${point.y}%`;
      element.style.height = `${height}%`; element.style.zIndex = String(Math.round(point.y * 10));
      element.dataset.phase = frame?.phase ?? 'idle';
      element.dataset.bows = String(frame?.completedBows ?? (person.completed?.kind === 'bow' ? 3 : 0));
      art.current.style.display = walking ? 'none' : 'block';
      art.current.style.transform = `scaleY(${1 - (frame?.bowWeight ?? 0) * 0.3}) rotate(${(frame?.bowWeight ?? 0) * -8}deg)`;
      walk.current.style.display = walking ? 'block' : 'none';
      walk.current.style.backgroundPosition = `${(Math.floor(Date.now() / 150) % 4) / 7 * 100}% 0`;
      walk.current.style.transform = frame?.phase === 'returning' ? 'scaleX(-1)' : '';
      name.current.dataset.active = String(self || Boolean(frame && frame.phase !== 'complete'));
      if (frame && frame.phase !== 'complete') frameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frameId);
  }, [person.action?.id, self, layout, person.seat]);
  return <button ref={root} className={`room-visitor ${self ? 'is-self' : ''}`} data-person-id={person.id} aria-label={`${person.name}${self ? ' · Bạn' : ''}`} title={person.name}>
    <img ref={art} className="visitor-art" src={roomAssets.sprite(person.appearance)} alt="" draggable={false} />
    <div ref={walk} className="visitor-walk" style={{ backgroundImage: `url('${roomAssets.walk(person.appearance)}')`, aspectRatio: person.appearance === 'granny' ? '195/300' : '212/300' }} />
    <span ref={name} className="visitor-label">{person.name}{self && <i> · Bạn</i>}</span>
    {person.action?.kind === 'incense' && <img className="visitor-incense" src={roomAssets.incense} alt="" />}
  </button>;
}

export function RoomScene({ people, selfId, layout, offset }: { people: RoomMember[]; selfId: string | null; layout: SceneLayoutId; offset: number }) {
  return <div className="room-painting" data-layout={layout} aria-label="Chánh điện chung">
    <img className="room-background" src={roomAssets.hall[layout]} alt="Chánh điện gỗ với tượng Phật, đèn lồng và lối đi thanh tịnh" fetchPriority="high" />
    <div className="painting-vignette" />
    {people.map(person => <Visitor key={person.id} person={person} self={person.id === selfId} layout={layout} offset={offset} />)}
  </div>;
}
