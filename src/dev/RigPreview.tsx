import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadDevoteeAssets, type DevoteeAssets } from '../three/templeScene';

export type RigClip = 'walk' | 'kneel' | 'kneelDown' | 'incense';

interface PreviewProps {
  clip: RigClip;
  progress: number;
  angle: number;
  guides: boolean;
}

interface RigController {
  draw: (props: PreviewProps) => void;
  exportAtlas: () => void;
  dispose: () => void;
}

/** Authoring-only renderer. It is excluded from the production entry point. */
async function createRigPreview(host: HTMLDivElement): Promise<RigController> {
  const assets: DevoteeAssets = await loadDevoteeAssets();
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.05, 1.05, 1.4, -1.4, 0.01, 30);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch (error) {
    assets.dispose();
    throw error;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(384, 512);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.append(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xf7ead4, 0x4c3d31, 2.2));
  const key = new THREE.DirectionalLight(0xffdcb3, 3.2);
  key.position.set(-3, 6, 5);
  scene.add(key);

  const root = new THREE.Group();
  const model = assets.model;
  model.scale.multiplyScalar(1.8 / 0.46);
  const bounds = new THREE.Box3().setFromObject(model);
  model.position.y -= bounds.min.y;
  root.add(model);
  scene.add(root);
  const grid = new THREE.GridHelper(4, 16, 0xe2c68c, 0x8d7755);
  scene.add(grid);
  const skeleton = new THREE.SkeletonHelper(model);
  scene.add(skeleton);

  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<RigClip, THREE.AnimationAction>();
  for (const id of ['walk', 'kneel', 'kneelDown', 'incense'] as const) {
    const source = assets.clips[id];
    if (!source) continue;
    const action = mixer.clipAction(source);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    actions.set(id, action);
  }

  // Fit once across all clips. Never re-center/crop individual rendered frames.
  // SkinnedMesh caches bounds; recompute after every sampled bone pose for this audit.
  const envelope = new THREE.Box3();
  for (const [id, action] of actions) {
    mixer.stopAllAction();
    action.reset().play();
    for (let index = 0; index < 12; index++) {
      action.paused = false;
      mixer.setTime(index / 12 * assets.clips[id]!.duration);
      model.updateMatrixWorld(true);
      model.traverse(object => {
        if (object instanceof THREE.SkinnedMesh) object.computeBoundingBox();
      });
      envelope.union(new THREE.Box3().setFromObject(model));
    }
  }
  mixer.stopAllAction();
  const extent = envelope.getSize(new THREE.Vector3());
  const center = envelope.getCenter(new THREE.Vector3());
  const viewHeight = Math.max(extent.y, Math.hypot(extent.x, extent.z) / 0.75) * 1.25;
  camera.left = -viewHeight * 0.75 / 2;
  camera.right = viewHeight * 0.75 / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.position.set(0, center.y + 2.8, 8);
  camera.lookAt(0, center.y, 0);
  camera.updateProjectionMatrix();
  host.dataset.rigEnvelope = JSON.stringify({ min: envelope.min.toArray(), max: envelope.max.toArray() });

  let currentClip: RigClip | undefined;
  let currentProps: PreviewProps = { clip: 'walk', progress: 0, angle: 180, guides: true };
  const draw = (props: PreviewProps) => {
    currentProps = props;
    if (currentClip !== props.clip) {
      mixer.stopAllAction();
      actions.get(props.clip)?.reset().play();
      currentClip = props.clip;
    }
    const duration = assets.clips[props.clip]?.duration ?? 0;
    const action = actions.get(props.clip);
    if (action) { action.paused = false; action.enabled = true; }
    mixer.setTime(Math.min(props.progress * duration, Math.max(0, duration - 0.0001)));
    root.rotation.y = THREE.MathUtils.degToRad(props.angle);
    grid.visible = skeleton.visible = props.guides;
    renderer.render(scene, camera);
    host.dataset.rigClip = props.clip;
    host.dataset.rigTime = String(props.progress * duration);
    host.dataset.rigReady = 'true';
  };

  return {
    draw,
    exportAtlas() {
      const saved = currentProps;
      const atlas = document.createElement('canvas');
      atlas.width = 384 * 4;
      atlas.height = 512 * 3;
      const context = atlas.getContext('2d');
      if (!context) throw new Error('Không mở được canvas xuất ảnh.');
      renderer.setPixelRatio(1);
      renderer.setSize(384, 512);
      for (let frame = 0; frame < 12; frame++) {
        draw({ ...saved, progress: frame / 12, guides: false });
        context.drawImage(renderer.domElement, frame % 4 * 384, Math.floor(frame / 4) * 512);
      }
      draw(saved);
      atlas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `candidate-${saved.clip}-${saved.angle}-12frames.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }, 'image/png');
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      const skeletons = new Set<THREE.Skeleton>();
      model.traverse(object => {
        if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
      });
      skeletons.forEach(value => value.dispose());
      assets.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      skeleton.geometry.dispose();
      (skeleton.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

export function RigPreview(props: PreviewProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<RigController | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [status, setStatus] = useState('Đang đọc mô hình và chuyển động FBX…');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    let cancelled = false;
    void createRigPreview(host.current).then(value => {
      if (cancelled) { value.dispose(); return; }
      controller.current = value;
      value.draw(latest.current);
      setReady(true);
      setStatus('Nguồn FBX hiện có · mẫu thử chưa nghiệm thu');
    }).catch(() => { if (!cancelled) setStatus('Không mở được mô hình hoặc WebGL. Sprite vẫn xem được ở bên cạnh.'); });
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null; };
  }, []);

  useEffect(() => { controller.current?.draw(props); }, [props.clip, props.progress, props.angle, props.guides]);

  return <>
    <div ref={host} className="lab-rig" aria-label="Mẫu nhân vật có bộ xương" />
    <p className="lab-caption" role="status">{status}</p>
    <button disabled={!ready} onClick={() => controller.current?.exportAtlas()}>Xuất atlas thử 12 khung PNG</button>
  </>;
}
