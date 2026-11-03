import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { retargetClip, usesMixamoRig } from './retarget';
import { templeAssets } from '../config/templeAssets';
import { actorHeight, ritualPosition, type SceneLayout } from '../config/sceneLayout';
import { configureCamera, floorPointToWorld, scaleForActorHeight, worldPointToStage } from './sceneProjection';
import { RitualTimeline, type RitualFrame } from '../services/ritualTimeline';
import type { RitualCommand, RitualEvent } from '../types/experience';

type Clips = {
  walk: THREE.AnimationClip;
  kneel: THREE.AnimationClip;
  kneelDown?: THREE.AnimationClip;
  incense?: THREE.AnimationClip;
};
export type DevoteeAssets = { model: THREE.Group; clips: Clips; dispose: () => void };
const HEIGHT = 0.46;
const WALK_SPEED = 1.3;

function disposeObjects(objects: THREE.Object3D[]) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  for (const object of objects) object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

export async function loadDevoteeAssets(): Promise<DevoteeAssets> {
  const loader = new FBXLoader();
  const urls = [templeAssets.models.walk, templeAssets.models.kneel, templeAssets.models.kneelDown,
    templeAssets.models.incense, templeAssets.models.character];
  // Wait for every request before disposing on failure; late successes must not leak.
  const results = await Promise.allSettled(urls.map(url => loader.loadAsync(url)));
  const groups = results.map(result => result.status === 'fulfilled' ? result.value : undefined);
  const dispose = () => disposeObjects(groups.filter((group): group is THREE.Group => Boolean(group)));
  try {
    const walk = groups[0]?.animations[0];
    const kneel = groups[1]?.animations[0];
    if (!walk || !kneel || walk.duration <= 0 || kneel.duration <= 0) throw new Error('Thiếu hoạt ảnh đi hoặc quỳ');
    const own = groups[4];
    const model = own ?? groups[1]!;
    let clips: Clips = { walk, kneel, kneelDown: groups[2]?.animations[0], incense: groups[3]?.animations[0] };
    if (own && !usesMixamoRig(own)) {
      const convert = (clip?: THREE.AnimationClip) => clip ? retargetClip(own, groups[1]!, clip) : undefined;
      clips = { walk: convert(walk)!, kneel: convert(kneel)!, kneelDown: convert(clips.kneelDown), incense: convert(clips.incense) };
    }
    for (const track of clips.walk.tracks) {
      if (!/Hips\.position$/.test(track.name)) continue;
      for (let i = 3; i < track.values.length; i += 3) {
        track.values[i] = track.values[0];
        track.values[i + 2] = track.values[2];
      }
    }
    const box = new THREE.Box3().setFromObject(model);
    model.scale.multiplyScalar(HEIGHT / (box.max.y - box.min.y || 1));
    model.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.frustumCulled = false;
      if (!own) {
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
          if (material instanceof THREE.MeshPhongMaterial || material instanceof THREE.MeshStandardMaterial) material.color.set(0x6d7896);
        }
      }
    });
    return { model, clips, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

function makeIncense() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xa8321a });
  const tipMaterial = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  for (const x of [-0.008, 0, 0.008]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.28, 6), material);
    stick.position.set(x, 0.11, 0);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), tipMaterial);
    tip.position.set(x, 0.25, 0);
    group.add(stick, tip);
  }
  return group;
}

class TempleActor {
  readonly root = new THREE.Group();
  readonly head?: THREE.Object3D;
  private body: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  private actions: Partial<Record<keyof Clips, THREE.AnimationAction>> = {};
  private current?: THREE.AnimationAction;
  private bones: Array<[THREE.Object3D, number]> = [];
  private previousBow = 0;
  private hand?: THREE.Object3D;
  private incense?: THREE.Group;
  private shadow: THREE.Mesh;
  private robeParts = new Map<string, THREE.Object3D>();

  constructor(assets: DevoteeAssets) {
    this.body = cloneSkinned(assets.model);
    this.root.add(this.body);
    let head: THREE.Object3D | undefined;
    const angles: Record<string, number> = { Spine: 0.7, Spine1: 0.6, Spine2: 0.45, Chest: 0.6, Neck: 0.25, Head: 0.2 };
    this.body.traverse(child => {
      const name = child.name.replace(/^mixamorig:?/, '');
      if (name in angles) this.bones.push([child, angles[name]]);
      if (name === 'Head') head = child;
      if (/(RightHand|HandR)$/.test(name)) this.hand = child;
      this.robeParts.set(name, child);
    });
    this.head = head;
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(HEIGHT * 0.3, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.01;
    this.root.add(this.shadow);
    this.mixer = new THREE.AnimationMixer(this.body);
    for (const [name, clip] of Object.entries(assets.clips)) {
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      if (name === 'incense' || name === 'kneelDown') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions[name as keyof Clips] = action;
    }
    this.pose('kneel');
  }

  pose(name: keyof Clips, seconds?: number) {
    const next = this.actions[name] ?? this.actions.kneel!;
    if (next === this.current) return;
    next.reset().setEffectiveTimeScale(seconds ? next.getClip().duration / seconds : 1).play();
    this.current?.crossFadeTo(next, 0.25, false);
    this.current = next;
  }

  showIncense(show: boolean) {
    if (show && this.hand && !this.incense) {
      this.incense = makeIncense();
      this.incense.scale.setScalar(1 / this.body.scale.x);
      this.hand.add(this.incense);
    } else if (!show && this.incense) {
      this.incense.removeFromParent();
      disposeObjects([this.incense]);
      this.incense = undefined;
    }
  }

  update(delta: number, bowWeight: number) {
    // Remove the previous procedural offset before mixing; do not accumulate bends.
    for (const [bone, angle] of this.bones) bone.rotation.x -= angle * this.previousBow;
    this.mixer.update(delta);
    for (const [bone, angle] of this.bones) bone.rotation.x += angle * bowWeight;
    this.previousBow = bowWeight;
    for (const side of ['L', 'R']) {
      for (const [part, leg, amount] of [
        ['RobeUpperFront', 'Thigh', 0.9], ['RobeUpperBack', 'Thigh', 0.45],
        ['RobeLowerFront', 'Shin', 0.6], ['RobeLowerBack', 'Shin', 0.3],
      ] as const) {
        const panel = this.robeParts.get(part + side), bone = this.robeParts.get(leg + side);
        if (panel && bone) panel.quaternion.slerpQuaternions(new THREE.Quaternion(), bone.quaternion, amount);
      }
    }
    if (this.incense && this.hand) {
      this.hand.updateWorldMatrix(true, false);
      this.incense.quaternion.copy(this.hand.getWorldQuaternion(new THREE.Quaternion()).invert());
    }
  }

  dispose() {
    this.showIncense(false);
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.body);
    this.body.traverse(child => { if (child instanceof THREE.SkinnedMesh) child.skeleton.dispose(); });
    disposeObjects([this.shadow]);
  }
}

export class TempleScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 9 / 16, 0.1, 200);
  private actor: TempleActor;
  private home = new THREE.Vector3();
  private altar = new THREE.Vector3();
  private timeline: RitualTimeline | null = null;
  private command: RitualCommand | null = null;
  private lastCommandId: string | null = null;
  private lastPhase = '';
  private previousFrame = performance.now();
  private frameId = 0;
  private disposed = false;
  private canvas: HTMLCanvasElement;
  private assets: DevoteeAssets;
  private notify: (event: RitualEvent) => void;
  private onFailure: () => void;
  private label: HTMLElement;
  private resizeObserver: ResizeObserver;
  private layout: SceneLayout;
  private travel = 0;
  private homeScale = 1;
  private altarScale = 1;

  constructor(canvas: HTMLCanvasElement, assets: DevoteeAssets, label: HTMLElement,
    notify: (event: RitualEvent) => void, onFailure: () => void, layout: SceneLayout) {
    this.canvas = canvas;
    this.assets = assets;
    this.notify = notify;
    this.onFailure = onFailure;
    this.label = label;
    this.layout = layout;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.add(new THREE.HemisphereLight(0xfff0d6, 0x3a1f0b, 1.4));
    const light = new THREE.DirectionalLight(0xffd9a0, 1.6);
    light.position.set(2, 10, 6);
    this.scene.add(light);
    this.actor = new TempleActor(assets);
    this.scene.add(this.actor.root);
    this.resize();
    this.actor.root.position.copy(this.home);
    this.actor.root.rotation.y = Math.PI;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.frameId = requestAnimationFrame(this.render);
  }

  setLayout(layout: SceneLayout) {
    this.layout = layout;
    this.resize();
  }

  private placeActor() {
    this.actor.root.position.copy(floorPointToWorld(this.camera, ritualPosition(this.layout, this.travel)));
    this.actor.root.scale.setScalar(this.homeScale + (this.altarScale - this.homeScale) * this.travel);
  }

  private resize() {
    const width = this.canvas.clientWidth, height = this.canvas.clientHeight;
    if (!width || !height || this.disposed) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2, 1080 / width));
    this.renderer.setSize(width, height, false);
    configureCamera(this.camera, this.layout, width / height);
    this.home.copy(floorPointToWorld(this.camera, this.layout.points.home));
    this.altar.copy(floorPointToWorld(this.camera, this.layout.points.altar));
    this.homeScale = scaleForActorHeight(this.camera, this.home, HEIGHT, actorHeight(this.layout, 0));
    this.altarScale = scaleForActorHeight(this.camera, this.altar, HEIGHT, actorHeight(this.layout, 1));
    this.placeActor();
  }

  setCommand(command: RitualCommand | null) {
    if (!command) {
      this.timeline?.cancel();
      this.timeline = null;
      this.command = null;
      this.travel = 0;
      this.actor.showIncense(false);
      this.actor.pose('kneel');
      this.placeActor();
      this.actor.root.rotation.y = Math.PI;
      return;
    }
    if (this.timeline || command.id === this.lastCommandId) return;
    this.command = command;
    this.lastCommandId = command.id;
    this.lastPhase = '';
    this.timeline = new RitualTimeline(command, this.notify, this.home.distanceTo(this.altar) / WALK_SPEED, this.assets.clips.incense?.duration ?? 4);
  }

  private render = () => {
    if (this.disposed) return;
    try {
      const now = performance.now();
      const delta = Math.min((now - this.previousFrame) / 1000, 0.1);
      this.previousFrame = now;
      const frame: RitualFrame | null = this.timeline?.advance(delta) ?? null;
      if (frame) {
        this.travel = frame.travel;
        this.placeActor();
        const moving = frame.phase === 'moving' || frame.phase === 'returning';
        this.actor.root.rotation.y = frame.phase === 'returning' ? 0 : Math.PI;
        if (frame.phase !== this.lastPhase) {
          this.lastPhase = frame.phase;
          this.actor.pose(moving ? 'walk' : frame.phase === 'performing' && this.command?.kind === 'incense' ? 'incense' : 'kneel',
            frame.phase === 'performing' && this.command?.kind === 'incense' ? this.timeline?.performSeconds : undefined);
        }
        this.actor.showIncense(frame.phase === 'performing' && this.command?.kind === 'incense');
      }
      this.actor.update(delta, frame?.bowWeight ?? 0);
      this.renderer.render(this.scene, this.camera);
      const position = (this.actor.head ?? this.actor.root).getWorldPosition(new THREE.Vector3());
      position.y += HEIGHT * this.actor.root.scale.y * 0.12;
      position.project(this.camera);
      this.label.style.left = `${(position.x + 1) * 50}%`;
      this.label.style.top = `${(1 - position.y) * 50}%`;
      this.label.style.visibility = 'visible';
      const feet = worldPointToStage(this.camera, this.actor.root.position);
      this.canvas.dataset.feetX = feet.x.toFixed(3);
      this.canvas.dataset.feetY = feet.y.toFixed(3);
      this.canvas.dataset.travel = this.travel.toFixed(3);
      this.frameId = requestAnimationFrame(this.render);
    } catch {
      this.onFailure();
    }
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.timeline?.cancel();
    this.actor.dispose();
    this.renderer.dispose();
  }
}
