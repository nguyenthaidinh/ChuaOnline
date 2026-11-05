import {CharacterSprite} from './CharacterSprite';
import {OfferingLayer} from './OfferingLayer';
import {ShrineEffects} from './ShrineEffects';
import {actorMetrics,roomAssets,seatPoint} from './layout';
import {logicalSeat} from './motion';
import type {Appearance,RoomSnapshot} from './protocol';
import type {SceneLayoutId} from '../config/sceneLayout';
import {useCharacterArtwork} from './useSceneAssets';
import {AmbientSeatedCrowd} from './AmbientSeatedCrowd';
import type {AmbientDevotee} from './ambientDevotees';
export function RoomScene({room,selfId,layout,offset,reduced,ambient,warmAppearance='man'}:{room:RoomSnapshot;selfId:string|null;layout:SceneLayoutId;offset:number;reduced:boolean;ambient:readonly AmbientDevotee[];warmAppearance?:Appearance}) {
 const artwork=useCharacterArtwork([...room.people.map(person=>person.appearance),warmAppearance]);
 const modernReady=room.people.every(person=>artwork.incense[person.appearance]);
 return <div className="room-painting" data-layout={layout} data-modern-incense={modernReady?'ready':'fallback'} data-reduced-motion={String(reduced)} data-ambient-count={ambient.length} aria-label="Chánh điện chung">
 <img className="room-background" src={roomAssets.hall[layout]} alt="Chánh điện gỗ thanh tịnh với tượng Phật và sàn trống" fetchPriority="high"/>
 <div className="painting-vignette"/>
 <AmbientSeatedCrowd people={ambient} layout={layout}/>
 {room.people.map(person=>{const point=seatPoint(person.seat,layout),size=actorMetrics(logicalSeat(person.seat),layout);return <img key={`seat-${person.id}`} className="fixed-cushion" data-seat={person.seat} src={roomAssets.effect('cushion')} alt="" style={{left:`${point.x}%`,top:`${point.y}%`,height:`${size.height*.25}%`,zIndex:Math.round(point.y*100)-3}}/>;})}
 {room.people.map(person=><CharacterSprite key={person.id} person={person} self={person.id===selfId} layout={layout} offset={offset} reduced={reduced} artwork={artwork}/>)}
 <OfferingLayer room={room} layout={layout} offset={offset} reduced={reduced} incenseReady={artwork.incense} ritualExtensionReady={artwork.ritualExtension}/>
 <ShrineEffects room={room} offset={offset} reduced={reduced}/>
 </div>;
}
