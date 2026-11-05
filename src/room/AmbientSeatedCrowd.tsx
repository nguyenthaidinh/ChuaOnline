import { Fragment } from 'react';
import { characterManifest } from './animationManifest';
import { actorMetrics, roomAssets, seatPoint } from './layout';
import { logicalSeat } from './motion';
import type { SceneLayoutId } from '../config/sceneLayout';
import type { AmbientDevotee } from './ambientDevotees';
import './ambientDevotees.css';

export function AmbientSeatedCrowd({ people, layout }: {
  people: readonly AmbientDevotee[];
  layout: SceneLayoutId;
}) {
  return <div className="ambient-devotees" aria-hidden="true">
    {people.map(person => {
      const manifest = characterManifest(person.appearance);
      const point = seatPoint(person.seat, layout);
      const size = actorMetrics(logicalSeat(person.seat), layout);
      const pivotX = manifest.groundPivot.x / manifest.frameWidth * 100;
      const pivotY = manifest.groundPivot.y / manifest.frameHeight * 100;
      return <Fragment key={person.seat}>
        <img className="fixed-cushion" data-ambient-cushion={person.seat}
          src={roomAssets.effect('cushion')} alt="" draggable={false}
          style={{ left: `${point.x}%`, top: `${point.y}%`, height: `${size.height * .25}%`, zIndex: Math.round(point.y * 100) - 3 }} />
        <div className="ambient-devotee" data-ambient-seat={person.seat} data-appearance={person.appearance}
          style={{
            left: `${point.x}%`, top: `${point.y}%`, height: `${size.canvasHeight}%`,
            aspectRatio: `${manifest.frameWidth}/${manifest.frameHeight}`,
            transform: `translate(-${pivotX}%,-${pivotY}%)`, zIndex: Math.round(point.y * 100),
          }}>
          <div className="actor-shadow" style={{ left: `${pivotX}%`, top: `${pivotY}%` }} />
          <img className="ambient-devotee-sprite" alt="" draggable={false}
            src={roomAssets.frameImage(manifest.poseAssets.seatedRear.image)} />
        </div>
      </Fragment>;
    })}
  </div>;
}
