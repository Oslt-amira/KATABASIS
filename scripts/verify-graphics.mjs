import assert from 'node:assert/strict';
import {createNailRenderer} from '../components/webgl.ts';
let constructorCalls=0;
for(const getContext of [()=>null,()=>{throw new Error('Blocked by browser');},()=>({isContextLost:()=>true})]){
 let removed=0;const canvas={getContext,remove(){removed++;}};
 assert.equal(createNailRenderer(()=>canvas,()=>{constructorCalls++;throw new Error('Must not construct Three');}),null);
 assert.equal(removed,1);
}
assert.equal(constructorCalls,0,'Unavailable WebGL must never reach the Three renderer constructor');
let live=0,disposed=0,lost=0;
for(let cycle=0;cycle<30;cycle++){
 const context={isContextLost:()=>false,getExtension:name=>name==='WEBGL_lose_context'?{loseContext(){lost++;live--;}}:null};
 const canvas={getContext(type,attributes){assert.equal(type,'webgl2');assert.equal(attributes.antialias,false);assert.equal(attributes.powerPreference,'default');live++;return context;},remove(){}};
 const handle=createNailRenderer(()=>canvas,options=>{assert.equal(options.context,context);assert.equal(options.canvas,canvas);return {dispose(){disposed++;}};});
 assert.ok(handle);assert.equal(live,1,'Remounts should retain only the current context');handle.release();handle.release();assert.equal(live,0);
}
assert.equal(disposed,30);assert.equal(lost,30);
let failedContextReleased=false;
const canvas={getContext:()=>({isContextLost:()=>false,getExtension:()=>({loseContext(){failedContextReleased=true;}})}),remove(){}};
assert.equal(createNailRenderer(()=>canvas,()=>{throw new Error('Driver rejected initialization');}),null);
assert.equal(failedContextReleased,true);
console.log('Graphics checks passed: unsupported/blocked/lost contexts, driver failure, and 30 mount/release cycles.');
