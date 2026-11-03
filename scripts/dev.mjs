import { spawn } from 'node:child_process';
const children=[];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
function run(args,env){const child=spawn(process.execPath,args,{stdio:'inherit',env:{...process.env,...env},windowsHide:true});children.push(child);child.on('exit',code=>stop(code??1));child.on('error',error=>{console.error(error.message);stop(1);});}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
run(['--experimental-strip-types','server/index.ts'],{PORT:'8787'});
run(['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{});
