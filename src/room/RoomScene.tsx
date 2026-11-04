import {CharacterSprite} from './CharacterSprite';
import {OfferingLayer} from './OfferingLayer';
import {ShrineEffects} from './ShrineEffects';
import {actorMetrics,roomAssets,seatPoint} from './layout';
import {logicalSeat} from './motion';
import type {RoomSnapshot} from './protocol';
import type {SceneLayoutId} from '../config/sceneLayout';
import {useModernIncenseAssets} from './useSceneAssets';
export function RoomScene({room,selfId,layout,offset,reduced}:{room:RoomSnapshot;selfId:string|null;layout:SceneLayoutId;offset:number;reduced:boolean}) {
 const artwork=useModernIncenseAssets();
 const modernReady=Object.values(artwork.incense).every(Boolean);
 return <div className="room-painting" data-layout={layout} data-modern-incense={modernReady?'ready':'fallback'} data-reduced-motion={String(reduced)} aria-label="Chánh điện chung">
 <img className="room-background" src={roomAssets.hall[layout]} alt="Chánh điện gỗ thanh tịnh với tượng Phật và sàn trống" fetchPriority="high"/>
 <div className="painting-vignette"/>
 {room.people.map(person=>{const point=seatPoint(person.seat,layout),size=actorMetrics(logicalSeat(person.seat),layout);return <img key={`seat-${person.id}`} className="fixed-cushion" data-seat={person.seat} src={roomAssets.effect('cushion')} alt="" style={{left:`${point.x}%`,top:`${point.y}%`,height:`${size.height*.25}%`,zIndex:Math.round(point.y*100)-3}}/>;})}
 {room.people.map(person=><CharacterSprite key={person.id} person={person} self={person.id===selfId} layout={layout} offset={offset} reduced={reduced} artwork={artwork}/>)}
 <OfferingLayer room={room} layout={layout} offset={offset} reduced={reduced} incenseReady={artwork.incense}/>
 <ShrineEffects room={room} offset={offset} reduced={reduced}/>
 </div>;
}
