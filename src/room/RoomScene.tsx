import { memo, useState } from 'react';
import { ArtworkSessions } from './artworkSessions';
import { CharacterSprite } from './CharacterSprite';
import { OfferingLayer } from './OfferingLayer';
import { ShrineEffects } from './ShrineEffects';
import { actorMetrics, roomAssets, seatPoint } from './layout';
import { logicalSeat } from './motion';
import type { Appearance, RoomSnapshot } from './protocol';
import type { SceneLayoutId } from '../config/sceneLayout';
import { useCharacterArtwork } from './useSceneAssets';
import { AmbientSeatedCrowd } from './AmbientSeatedCrowd';
import type { AmbientDevotee } from './ambientDevotees';

interface RoomSceneProps {
  room: RoomSnapshot;
  selfId: string | null;
  layout: SceneLayoutId;
  offset: number;
  reduced: boolean;
  ambient: readonly AmbientDevotee[];
  warmAppearance?: Appearance;
}

export const RoomScene = memo(function RoomScene({
  room, selfId, layout, offset, reduced, ambient, warmAppearance,
}: RoomSceneProps) {
  const artwork = useCharacterArtwork(
    [...room.people.map(person => person.appearance), ...(warmAppearance ? [warmAppearance] : [])],
    room.people.filter(person => person.action).map(person => person.appearance),
  );
  const [sessions] = useState(() => new ArtworkSessions());
  const keep = new Set(room.people.flatMap(person => [
    ...(person.action ? [person.action.id] : []), `entry:${person.id}:${person.joinedAt}`,
  ]));
  room.offerings.forEach(item => keep.add(item.actionId));
  sessions.retain(keep);
  const now = Date.now() + offset;
  const actorArtwork = new Map(room.people.map(person => [person.id, sessions.forPerson(person, now, artwork)]));
  const modernReady = room.people.every(person => actorArtwork.get(person.id)!.incense[person.appearance]);

  return <div className="room-painting" data-layout={layout}
    data-modern-incense={modernReady ? 'ready' : 'fallback'}
    data-reduced-motion={String(reduced)} data-ambient-count={ambient.length} aria-label="Chánh điện chung">
    <img className="room-background" src={roomAssets.hall[layout]}
      alt="Chánh điện gỗ thanh tịnh với tượng Phật và sàn trống" fetchPriority="high" />
    <div className="painting-vignette" />
    <AmbientSeatedCrowd people={ambient} layout={layout} />
    {room.people.map(person => {
      const point = seatPoint(person.seat, layout);
      const size = actorMetrics(logicalSeat(person.seat), layout);
      return <img key={`seat-${person.id}`} className="fixed-cushion" data-seat={person.seat}
        src={roomAssets.effect('cushion')} alt="" style={{
          left: `${point.x}%`, top: `${point.y}%`, height: `${size.height * .25}%`,
          zIndex: Math.round(point.y * 100) - 3,
        }} />;
    })}
    {room.people.map(person => <CharacterSprite key={person.id} person={person}
      self={person.id === selfId} layout={layout} offset={offset} reduced={reduced}
      artwork={actorArtwork.get(person.id)!} />)}
    <OfferingLayer room={room} layout={layout} offset={offset} reduced={reduced}
      incenseReady={artwork.incense} ritualExtensionReady={artwork.ritualExtension}
      actionArtwork={id => sessions.forAction(id, artwork)} />
    <ShrineEffects room={room} offset={offset} reduced={reduced} />
  </div>;
});
