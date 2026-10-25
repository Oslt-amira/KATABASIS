import assert from 'node:assert/strict';
import {AmbientSoundscape} from '../components/ambient-soundscape.ts';
class Parameter{
 value=0;targets=[];
 setValueAtTime(value){assert.ok(Number.isFinite(value));this.value=value;return this;}
 linearRampToValueAtTime(value){return this.setValueAtTime(value);}
 exponentialRampToValueAtTime(value){assert.ok(value>0);return this.setValueAtTime(value);}
 setTargetAtTime(value){this.targets.push(value);return this.setValueAtTime(value);}
}
class Node{
 disconnected=false;started=false;stopped=false;onended=null;buffer=null;
 constructor(){for(const name of ['gain','frequency','detune','Q','pan','threshold','knee','ratio','attack','release'])this[name]=new Parameter();}
 connect(){return this;}
 disconnect(){this.disconnected=true;}
 start(){this.started=true;}
 stop(){this.stopped=true;}
 setPeriodicWave(){}
}
class Context{
 state='suspended';sampleRate=8000;currentTime=0;destination=new Node();nodes=[];closed=0;resumes=0;deferred=null;
 make(){const node=new Node();this.nodes.push(node);return node;}
 createGain(){return this.make();}createDynamicsCompressor(){return this.make();}createConvolver(){return this.make();}createBiquadFilter(){return this.make();}createStereoPanner(){return this.make();}createOscillator(){return this.make();}createBufferSource(){return this.make();}
 createPeriodicWave(){return {};}
 createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {getChannelData:index=>data[index]};}
 async resume(){this.resumes++;if(this.deferred)await this.deferred;this.state='running';}
 async suspend(){this.state='suspended';}
 async close(){this.state='closed';this.closed++;}
}
const context=new Context(),ambience=new AmbientSoundscape(()=>context);
assert.equal(context.resumes,0,'Construction must not autoplay');assert.equal(context.nodes[0].gain.value,0);
await ambience.setEnabled(true);ambience.setDepth(.8);assert.equal(context.state,'running');assert.ok(context.nodes[0].gain.value>0&&context.nodes[0].gain.value<1);
await ambience.setEnabled(false);await ambience.setEnabled(true);assert.ok(context.nodes[0].gain.value>0,'A rapid unmute must cancel the previous mute/suspend');
ambience.dispose();ambience.dispose();assert.equal(context.closed,1);assert.ok(context.nodes.filter(n=>n.started).every(n=>n.stopped));assert.ok(context.nodes.every(n=>n.disconnected));
const raceContext=new Context();let resume;raceContext.deferred=new Promise(resolve=>{resume=resolve;});const race=new AmbientSoundscape(()=>raceContext);const enabling=race.setEnabled(true);await race.setEnabled(false);resume();await enabling;assert.equal(raceContext.nodes[0].gain.value,0,'A late resume must not override mute');race.dispose();
console.log('Audio checks passed: opt-in playback, mute/unmute race, bounded master gain, and complete disposal.');
