import { useEffect, useLayoutEffect, useRef } from 'react';
import { TempleScene, loadDevoteeAssets, type DevoteeAssets } from './templeScene';
import type { RitualCommand, RitualEvent } from '../types/experience';
import type { SceneLayout } from '../config/sceneLayout';

export function Temple3D({ name, command, layout, onReady, onEvent }: {
  name: string;
  command: RitualCommand | null;
  layout: SceneLayout;
  onReady: (ready: boolean) => void;
  onEvent: (event: RitualEvent) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TempleScene | null>(null);
  const callbacks = useRef({ onReady, onEvent });
  callbacks.current = { onReady, onEvent };
  const commandRef = useRef(command);
  commandRef.current = command;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    let cancelled = false;
    let ownedAssets: DevoteeAssets | null = null;
    const canvas = canvasRef.current;
    const release = () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
      ownedAssets?.dispose();
      ownedAssets = null;
    };
    const unavailable = () => {
      if (cancelled) return;
      cancelled = true;
      clearTimeout(timeout);
      release();
      callbacks.current.onReady(false);
    };
    const timeout = window.setTimeout(unavailable, 30000);
    const lost = (event: Event) => { event.preventDefault(); unavailable(); };
    canvas?.addEventListener('webglcontextlost', lost);
    void loadDevoteeAssets().then(assets => {
      if (cancelled || !canvas || !labelRef.current) { assets.dispose(); return; }
      ownedAssets = assets;
      const scene = new TempleScene(canvas, assets, labelRef.current,
        event => callbacks.current.onEvent(event), unavailable, layoutRef.current);
      sceneRef.current = scene;
      scene.setCommand(commandRef.current);
      clearTimeout(timeout);
      callbacks.current.onReady(true);
    }).catch(unavailable);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      canvas?.removeEventListener('webglcontextlost', lost);
      release();
    };
  }, []);

  useEffect(() => {
    try { sceneRef.current?.setCommand(command); }
    catch { callbacks.current.onReady(false); }
  }, [command]);

  useLayoutEffect(() => {
    try { sceneRef.current?.setLayout(layout); }
    catch { callbacks.current.onReady(false); }
  }, [layout]);

  return <div className="scene-characters" aria-label="Nhân vật trong chánh điện">
    <canvas ref={canvasRef} aria-label="Nhân vật 3D" />
    <div ref={labelRef} className="actor-label" style={{ visibility: 'hidden' }}>{name}</div>
  </div>;
}
