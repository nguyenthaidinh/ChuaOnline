/** true requests another frame; a timestamp sleeps until the next visible change. */
type Draw = (now: number) => boolean | number;
const drawings = new Map<Draw, boolean | number>();
let raf = 0, timer = 0, last = 0, windowStart = 0, frames = 0, totalCost = 0;
function schedule() {
  clearTimeout(timer); timer = 0;
  if (document.hidden || raf) return;
  if ([...drawings.values()].some(value => value === true)) {
    raf = requestAnimationFrame(tick);
    return;
  }
  const deadlines = [...drawings.values()].filter((value): value is number => typeof value === 'number');
  if (deadlines.length) timer = window.setTimeout(() => { timer = 0; raf = requestAnimationFrame(tick); }, Math.max(0, Math.min(...deadlines) - Date.now()));
}
function tick(timestamp: number) {
  raf = 0;
  if (document.hidden) return;
  if (timestamp - last < 32) { raf = requestAnimationFrame(tick); return; }
  last = timestamp;
  const started = performance.now(), now = Date.now();
  let count = 0;
  for (const [draw, state] of drawings) {
    if (state === true || (typeof state === 'number' && now >= state)) {
      drawings.set(draw, draw(now)); count++;
    }
  }
  if (count) { totalCost += performance.now() - started; frames++; }
  if (!windowStart) windowStart = timestamp;
  if (timestamp - windowStart >= 1500) {
    const scene = document.querySelector<HTMLElement>('.room-painting');
    if (scene) {
      scene.dataset.sceneFps = (frames * 1000 / (timestamp - windowStart)).toFixed(1);
      scene.dataset.sceneDrawMs = (totalCost / Math.max(1, frames)).toFixed(3);
      scene.dataset.sceneDrawCount = String(count);
    }
    windowStart = timestamp; frames = 0; totalCost = 0;
  }
  if (![...drawings.values()].some(value => value === true)) { windowStart = 0; frames = 0; totalCost = 0; }
  schedule();
}
function visible() {
  cancelAnimationFrame(raf); clearTimeout(timer); raf = timer = 0;
  if (document.hidden) return;
  const now = Date.now();
  for (const [draw] of drawings) drawings.set(draw, draw(now));
  schedule();
}
export function subscribeSceneAnimation(draw: Draw) {
  drawings.set(draw, draw(Date.now()));
  if (drawings.size === 1) document.addEventListener('visibilitychange', visible);
  schedule();
  return () => {
    drawings.delete(draw);
    if (!drawings.size) {
      cancelAnimationFrame(raf); clearTimeout(timer); raf = timer = 0;
      document.removeEventListener('visibilitychange', visible);
    } else schedule();
  };
}
