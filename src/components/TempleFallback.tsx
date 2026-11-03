import { useEffect, useRef } from 'react';
import { RitualTimeline } from '../services/ritualTimeline';
import { RITUAL_POINTS } from '../config/ritual';
import type { RitualCommand, RitualEvent } from '../types/experience';

export function TempleFallback({ name, command, onEvent }: {
  name: string; command: RitualCommand | null; onEvent: (event: RitualEvent) => void;
}) {
  const person = useRef<HTMLDivElement>(null);
  const upper = useRef<SVGGElement>(null);
  const callback = useRef(onEvent);
  callback.current = onEvent;
  useEffect(() => {
    const element = person.current;
    if (!element) return;
    element.style.left = `${RITUAL_POINTS.home.x}%`;
    element.style.top = `${RITUAL_POINTS.home.y}%`;
    upper.current?.setAttribute('transform', 'rotate(0 24 42)');
    if (!command) return;
    const timeline = new RitualTimeline(command, event => callback.current(event));
    let frameId = 0;
    let previous = performance.now();
    const render = () => {
      try {
        const now = performance.now();
        const frame = timeline.advance(Math.min((now - previous) / 1000, 0.1));
        previous = now;
        element.style.top = `${RITUAL_POINTS.home.y + (RITUAL_POINTS.altar.y - RITUAL_POINTS.home.y) * frame.travel}%`;
        upper.current?.setAttribute('transform', `rotate(${-65 * frame.bowWeight} 24 42)`);
        if (frame.phase !== 'complete') frameId = requestAnimationFrame(render);
      } catch {
        callback.current({ type: 'error', commandId: command.id, message: 'Nghi lễ bị gián đoạn. Bạn có thể thử lại.' });
      }
    };
    frameId = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frameId); timeline.cancel(); };
  }, [command]);
  return <div ref={person} className="fallback-avatar" style={{ left: `${RITUAL_POINTS.home.x}%`, top: `${RITUAL_POINTS.home.y}%` }}>
    <svg width="42" height="62" viewBox="0 0 48 70" role="img" aria-label="Nhân vật 2D">
      <ellipse cx="24" cy="64" rx="20" ry="4" fill="#000" opacity=".25" />
      <path d="M10 48h28l5 15H5z" fill="#626f71" />
      <g ref={upper}>
        <path d="M13 25q11-7 22 0l5 28H8z" fill="#899391" stroke="#bbc0b8" />
        <circle cx="24" cy="16" r="9" fill="#c9ac8b" />
        <path d="M13 31l11 10 11-10" fill="none" stroke="#d8c5a9" strokeWidth="5" strokeLinecap="round" />
        {command?.kind === 'incense' && <path d="M22 38V18m3 20V15m3 23V18" stroke="#d59652" strokeWidth="1.5" />}
      </g>
    </svg>
    <small>{name}</small>
  </div>;
}
