import { useEffect, useState, useSyncExternalStore } from 'react';
import { essentialAssets, roomAssets } from './layout';
import type { SceneLayoutId } from '../config/sceneLayout';
import { INCENSE_ARTWORK } from './incenseGeometry';
import { MOVEMENT_ARTWORK, WALK_ARTWORK } from './modernMovementGeometry';
import { INCENSE_VARIANTS } from './variantIncenseGeometry';
import { DIRECTIONAL_ARTWORK } from './directionalMovementGeometry';
import { FALLBACK_ARTWORK, type ArtworkAvailability } from './characterAnimation';
import type { Appearance } from './protocol';
import { RITUAL_ARTWORK } from './ritualPoseGeometry';
import { EXPANDED_DIRECTION_ARTWORK } from './expandedDirectionGeometry';
import { VARIANT_MOVEMENT } from './variantMovementGeometry';
import { VARIANT_GAITS } from './variantGaitGeometry';
import { STOP_CLOSES } from './stopCloseGeometry';
import { RITUAL_EXTENSION } from './bowPetalGeometry';
import { decodeImage } from './imageLoader';
export { decodeImage } from './imageLoader';

export function useSceneAssets(layout: SceneLayoutId) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ layout: SceneLayoutId | null; status: 'loading' | 'ready' | 'error' }>({ layout: null, status: 'loading' });
  useEffect(() => {
    let live = true;
    // Preserve the already decoded scene while a different layout is prepared.
    setResult(current => ({ ...current, status: current.layout ? 'ready' : 'loading' }));
    void Promise.all(essentialAssets(layout).map(decodeImage)).then(() => {
      if (live) setResult({ layout, status: 'ready' });
    }).catch(() => { if (live) setResult(current => ({ ...current, status: 'error' })); });
    return () => { live = false; };
  }, [layout, attempt]);
  return { status: result.status, displayLayout: result.layout, retry: () => setAttempt(n => n + 1) };
}

let artwork: ArtworkAvailability = { ...FALLBACK_ARTWORK, baseActors: { man: false, woman: false, granny: false } };
const listeners = new Set<() => void>();
const batches = new Map<string, Promise<void>>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => artwork;
function publish(patch: Partial<ArtworkAvailability>) {
  artwork = { ...artwork, ...patch };
  listeners.forEach(listener => listener());
}
function identityFlag(key: 'baseActors' | 'closingSteps' | 'incense' | 'rituals' | 'ritualExtension', appearance: Appearance) {
  return { [key]: { man: false, woman: false, granny: false, ...artwork[key], [appearance]: true } };
}
function batch(key: string, run: () => Promise<void>) {
  let promise = batches.get(key);
  if (!promise) {
    promise = run().catch(error => { batches.delete(key); throw error; });
    batches.set(key, promise);
  }
  return promise;
}
/** The fallback atlas is mandatory; optional movement banks publish atomically. */
export async function prepareMovement(appearance: Appearance) {
  await batch(`base:${appearance}`, async () => {
    await decodeImage(roomAssets.atlas(appearance));
    publish(identityFlag('baseActors', appearance));
  });
  await batch(`movement:${appearance}`, async () => {
    const assets = appearance === 'man'
      ? [MOVEMENT_ARTWORK, WALK_ARTWORK, DIRECTIONAL_ARTWORK, EXPANDED_DIRECTION_ARTWORK, STOP_CLOSES.man.asset]
      : [VARIANT_MOVEMENT[appearance].asset, VARIANT_GAITS[appearance].asset, STOP_CLOSES[appearance].asset];
    await Promise.all(assets.map(asset => decodeImage(import.meta.env.BASE_URL + asset.image)));
    publish({ ...identityFlag('closingSteps', appearance), ...(appearance === 'man'
      ? { movement: true, directions: true, expandedDirections: true }
      : { variantMovement: { woman: false, granny: false, ...artwork.variantMovement, [appearance]: true },
          variantGaits: { woman: false, granny: false, ...artwork.variantGaits, [appearance]: true } }) });
  }).catch(() => { /* Decoded legacy atlas remains usable; next request can retry. */ });
}
export async function prepareRitual(appearance: Appearance) {
  await prepareMovement(appearance);
  await batch(`ritual:${appearance}`, async () => {
    const incense = appearance === 'man' ? INCENSE_ARTWORK : INCENSE_VARIANTS[appearance].asset;
    await Promise.all([incense, RITUAL_ARTWORK[appearance].asset, RITUAL_EXTENSION[appearance].asset]
      .map(asset => decodeImage(import.meta.env.BASE_URL + asset.image)));
    publish({ ...identityFlag('incense', appearance), ...identityFlag('rituals', appearance), ...identityFlag('ritualExtension', appearance) });
  }).catch(() => { /* Keep one complete fallback ritual until its end. */ });
}
export function useCharacterArtwork(appearances: readonly Appearance[], rituals: readonly Appearance[] = []) {
  const ready = useSyncExternalStore(subscribe, snapshot);
  const order: Appearance[] = ['man', 'woman', 'granny'];
  const mask = order.reduce((value, appearance, index) => appearances.includes(appearance) ? value | (1 << index) : value, 0);
  const ritualMask = order.reduce((value, appearance, index) => rituals.includes(appearance) ? value | (1 << index) : value, 0);
  useEffect(() => {
    const prepare = () => {
      for (const [index, appearance] of order.entries()) {
        if (ritualMask & (1 << index)) void prepareRitual(appearance).catch(() => {});
        else if (mask & (1 << index)) void prepareMovement(appearance).catch(() => {});
      }
    };
    prepare();
    window.addEventListener('online', prepare);
    return () => window.removeEventListener('online', prepare);
  }, [mask, ritualMask]);
  return ready;
}
