import {writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const base='http://127.0.0.1:4186';
const guests=[],controllers=[],tasks=[],requests=[],errors=[];
let events=0,bytes=0;
const post=async(path,body,token)=>{
 const start=performance.now();
 const response=await fetch(base+'/api/room/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
 const result=await response.json();requests.push({path,status:response.status,ms:performance.now()-start});
 if(!response.ok)throw Error(`${path} ${response.status}`);return result;
};
const watch=async()=>{const controller=new AbortController();controllers.push(controller);try{const response=await fetch(base+'/api/room/events',{signal:controller.signal});for await(const chunk of response.body){bytes+=chunk.length;events+=(new TextDecoder().decode(chunk).match(/event: room/g)||[]).length;}}catch(e){if(e.name!=='AbortError')errors.push(String(e));}};
const initial=await(await fetch(base+'/api/room')).json();
let peakPeople=initial.people.length,peakActions=0;
try{
 for(let i=initial.people.length;i<24;i++){guests.push(await post('join',{name:`Audit ${i+1}`,appearance:['man','woman','granny'][i%3]}));tasks.push(watch());}
 console.log('24 clients ready');
 await new Promise(r=>setTimeout(r,8000));
 let room=await(await fetch(base+'/api/room')).json();
 const free=4-room.people.filter(p=>p.action).length;
 for(const [i,g] of guests.slice(0,free).entries())await post('action',{kind:['petal','incense','lotus','bow'][i],requestId:randomUUID()},g.token);
 for(let i=0;i<6;i++){
  room=await(await fetch(base+'/api/room')).json();peakPeople=Math.max(peakPeople,room.people.length);peakActions=Math.max(peakActions,room.people.filter(p=>p.action).length);
  if(i===3)await Promise.all(guests.map(g=>post('heartbeat',{},g.token)));
  console.log(JSON.stringify({sample:i,people:room.people.length,actions:room.people.filter(p=>p.action).length}));
  await new Promise(r=>setTimeout(r,5000));
 }
}catch(e){errors.push(String(e));}
finally{
 controllers.forEach(c=>c.abort());await Promise.allSettled(tasks);
 await Promise.allSettled(guests.map(g=>post('leave',{},g.token)));
 const sorted=requests.map(r=>r.ms).sort((a,b)=>a-b);
 const report={note:'Single localhost run, synthetic API/SSE clients plus one real browser; not 24 rendered browsers or a WAN benchmark.',initialPeople:initial.people.length,ownedClients:guests.length,peakPeople,peakActions,sseEvents:events,sseBytes:bytes,requests:requests.length,statusCounts:requests.reduce((out,r)=>(out[r.status]=(out[r.status]||0)+1,out),{}),p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],errors,remainingPeople:(await(await fetch(base+'/api/room')).json()).people.length};
 await writeFile('docs/performance-audit/local-load.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
