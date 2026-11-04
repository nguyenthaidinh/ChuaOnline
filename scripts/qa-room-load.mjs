import {writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const base=process.argv[2]??'http://127.0.0.1:4173';
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname))throw new Error('QA load runner is local-only');
const guests=[],controllers=[],report={startedAt:new Date().toISOString(),ownedClients:0,initialBrowserGuests:0,maxPeople:0,maxActions:0,sseEvents:0,sseBytes:0,actions:0,errors:[]};
let stopping=false;process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function post(path,body,token){const response=await fetch(base+'/api/room/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});const data=await response.json();if(!response.ok)throw new Error(`${path}: ${response.status} ${data.error}`);return data;}
async function watch(){const controller=new AbortController();controllers.push(controller);try{const response=await fetch(base+'/api/room/events',{signal:controller.signal}),reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';while(!stopping){const{done,value}=await reader.read();if(done)break;report.sseBytes+=value.length;buffer+=decoder.decode(value,{stream:true});let split;while((split=buffer.indexOf('\n\n'))>=0){const message=buffer.slice(0,split);buffer=buffer.slice(split+2);if(message.startsWith('event: room'))report.sseEvents++;}}}catch(error){if(!stopping&&error.name!=='AbortError')report.errors.push(String(error));}}
try{
 const initial=await(await fetch(base+'/api/room')).json();report.initialBrowserGuests=initial.people.length;
 for(let i=initial.people.length;i<24;i++){const guest=await post('join',{name:`Kiểm thử ${String(i+1).padStart(2,'0')}`,appearance:['man','woman','granny'][i%3]});guests.push(guest);void watch();}
 report.ownedClients=guests.length;console.log(JSON.stringify({stage:'joined',owned:guests.length,total:24}));
 await sleep(8000);let heartbeatAt=Date.now();const start=Date.now();
 while(!stopping&&Date.now()-start<90000){
  let room=await(await fetch(base+'/api/room')).json();report.maxPeople=Math.max(report.maxPeople,room.people.length);
  for(const[index,guest]of guests.slice(0,4).entries())if(!room.people.find(p=>p.id===guest.selfId)?.action){await post('action',{kind:['bow','incense','lotus','bell'][index],requestId:randomUUID()},guest.token);report.actions++;}
  room=await(await fetch(base+'/api/room')).json();report.maxActions=Math.max(report.maxActions,room.people.filter(p=>p.action).length);
  if(Date.now()-heartbeatAt>20000){await Promise.all(guests.map(g=>post('heartbeat',{},g.token)));heartbeatAt=Date.now();}
  await mkdir('.local-qa',{recursive:true});await writeFile('.local-qa/load-live.json',JSON.stringify({...report,people:room.people.length,active:room.people.filter(p=>p.action).length},null,2));
  await sleep(2000);
 }
}catch(error){report.errors.push(String(error));process.exitCode=1;}
finally{stopping=true;controllers.forEach(c=>c.abort());await Promise.allSettled(guests.map(g=>post('leave',{},g.token)));report.endedAt=new Date().toISOString();report.remainingPeople=(await(await fetch(base+'/api/room')).json()).people.length;await mkdir('docs/visual-upgrade',{recursive:true});await writeFile('docs/visual-upgrade/load-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
