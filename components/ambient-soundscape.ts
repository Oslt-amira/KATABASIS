// An original, quiet chapel soundscape. Nothing plays before the sound button is pressed.
// Bowed harmonics, filtered cave air and distant struck-metal overtones share a long room tail.
export class AmbientSoundscape {
 private context:AudioContext;
 private master:GainNode;
 private dry:GainNode;
 private reverb:ConvolverNode;
 private wet:GainNode;
 private tone:BiquadFilterNode;
 private air:GainNode;
 private sources=new Set<AudioScheduledSourceNode>();
 private nodes=new Set<AudioNode>();
 private bellTimer:ReturnType<typeof setInterval>|undefined;
 private suspendTimer:ReturnType<typeof setTimeout>|undefined;
 private enabled=false;
 private disposed=false;
 private nextBell=0;
 private bellIndex=0;
 private intent=0;
 private lastDepth=-1;
 constructor(createContext:()=>AudioContext=()=>{
  const Constructor=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
  if(!Constructor)throw new Error('Audio is unavailable');
  return new Constructor({latencyHint:'playback'});
 }){
  this.context=createContext();const ac=this.context;
  const track=<T extends AudioNode>(node:T)=>{this.nodes.add(node);return node;};
  this.master=track(ac.createGain());this.master.gain.value=0;
  const limiter=track(ac.createDynamicsCompressor());limiter.threshold.value=-18;limiter.knee.value=18;limiter.ratio.value=4;limiter.attack.value=.025;limiter.release.value=.6;
  this.master.connect(limiter);limiter.connect(ac.destination);
  this.dry=track(ac.createGain());this.dry.gain.value=.56;this.dry.connect(this.master);
  this.reverb=track(ac.createConvolver());this.reverb.buffer=this.roomImpulse();
  const roomHighpass=track(ac.createBiquadFilter());roomHighpass.type='highpass';roomHighpass.frequency.value=150;
  const roomLowpass=track(ac.createBiquadFilter());roomLowpass.type='lowpass';roomLowpass.frequency.value=3300;
  this.wet=track(ac.createGain());this.wet.gain.value=.52;this.reverb.connect(roomHighpass);roomHighpass.connect(roomLowpass);roomLowpass.connect(this.wet);this.wet.connect(this.master);
  this.tone=track(ac.createBiquadFilter());this.tone.type='lowpass';this.tone.frequency.value=800;this.tone.Q.value=.45;this.tone.connect(this.dry);this.tone.connect(this.reverb);
  const real=new Float32Array(24),imaginary=new Float32Array(24);for(let i=1;i<24;i++)imaginary[i]=Math.pow(i,-1.9)*(i%2?1:.38);
  const bowedWave=ac.createPeriodicWave(real,imaginary);
  [[73.416,.10,-.28],[110,.055,.3],[174.614,.025,-.08]].forEach(([frequency,level,pan],index)=>{
   const voice=track(ac.createGain());voice.gain.value=level;
   const panner=track(ac.createStereoPanner());panner.pan.value=pan;voice.connect(panner);panner.connect(this.tone);
   [-3.2,3.2].forEach(detune=>{const oscillator=ac.createOscillator();oscillator.setPeriodicWave(bowedWave);oscillator.frequency.value=frequency;oscillator.detune.value=detune;oscillator.connect(voice);this.start(oscillator);});
   const swell=ac.createOscillator();swell.frequency.value=.035+index*.013;
   const swellAmount=track(ac.createGain());swellAmount.gain.value=level*.26;swell.connect(swellAmount);swellAmount.connect(voice.gain);this.start(swell);
  });
  this.air=track(ac.createGain());this.air.gain.value=.018;
  const airFilter=track(ac.createBiquadFilter());airFilter.type='bandpass';airFilter.frequency.value=420;airFilter.Q.value=.55;
  const airSource=ac.createBufferSource();airSource.buffer=this.airBuffer();airSource.loop=true;airSource.connect(airFilter);airFilter.connect(this.air);this.air.connect(this.reverb);this.air.connect(this.dry);this.start(airSource);
  const breath=ac.createOscillator();breath.frequency.value=.065;const breathAmount=track(ac.createGain());breathAmount.gain.value=.006;breath.connect(breathAmount);breathAmount.connect(this.air.gain);this.start(breath);
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',this.onVisibility);
 }
 private start(source:AudioScheduledSourceNode){this.sources.add(source);source.start();}
 private roomImpulse(){
  const ac=this.context,length=Math.floor(ac.sampleRate*5.8),buffer=ac.createBuffer(2,length,ac.sampleRate);
  let seed=719;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296*2-1;};
  for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<length;i++){const t=i/ac.sampleRate;data[i]=random()*Math.exp(-t*1.15)*Math.min(1,t/.035)*.43;}
   [.071,.137,.229].forEach((delay,index)=>{data[Math.floor((delay+channel*.011)*ac.sampleRate)]+=.18/(index+1);});}
  return buffer;
 }
 private airBuffer(){
  const ac=this.context,length=Math.floor(ac.sampleRate*4),buffer=ac.createBuffer(1,length,ac.sampleRate),data=buffer.getChannelData(0);
  let filtered=0;for(let i=0;i<length;i++){filtered=(filtered+.025*(Math.random()*2-1))/1.025;data[i]=filtered*3;}
  // Crossfade the loop seam, so quiet listening never picks up a periodic click.
  const fade=Math.floor(ac.sampleRate*.12);for(let i=0;i<fade;i++){const t=i/fade;data[length-fade+i]=data[length-fade+i]*(1-t)+data[i]*t;}
  return buffer;
 }
 private ring(){
  const ac=this.context,now=ac.currentTime,base=[146.832,220,174.614,293.665][this.bellIndex++%4];
  const pan=ac.createStereoPanner();pan.pan.value=this.bellIndex%2?.5:-.5;
  const filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2600;filter.Q.value=.35;
  filter.connect(pan);pan.connect(this.reverb);
  const direct=ac.createGain();direct.gain.value=.14;pan.connect(direct);direct.connect(this.dry);
  let remaining=3;
  [[1,.095],[2.756,.027],[5.404,.008]].forEach(([ratio,volume])=>{
   const oscillator=ac.createOscillator(),envelope=ac.createGain();oscillator.frequency.value=base*ratio;oscillator.type='sine';
   envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(volume,now+.12);envelope.gain.exponentialRampToValueAtTime(.00001,now+6.4);
   oscillator.connect(envelope);envelope.connect(filter);this.sources.add(oscillator);
   oscillator.onended=()=>{this.sources.delete(oscillator);oscillator.disconnect();envelope.disconnect();if(--remaining===0){filter.disconnect();pan.disconnect();direct.disconnect();}};
   oscillator.start(now);oscillator.stop(now+6.5);
  });
 }
 private beginBells(){
  if(this.bellTimer)return;this.nextBell=this.context.currentTime+3;
  this.bellTimer=setInterval(()=>{if(this.disposed||!this.enabled||this.context.state!=='running')return;if(this.context.currentTime>=this.nextBell){this.ring();this.nextBell=this.context.currentTime+10+(this.bellIndex%3)*2;}},800);
 }
 async setEnabled(enabled:boolean){
  if(this.disposed)return;this.enabled=enabled;const intent=++this.intent;clearTimeout(this.suspendTimer);this.suspendTimer=undefined;
  const ac=this.context;
  if(enabled){await ac.resume();if(this.disposed||intent!==this.intent)return;this.master.gain.setTargetAtTime(.6,ac.currentTime,.85);this.beginBells();}
  else{this.master.gain.setTargetAtTime(0,ac.currentTime,.4);clearInterval(this.bellTimer);this.bellTimer=undefined;this.suspendTimer=setTimeout(()=>{if(!this.disposed&&!this.enabled)void ac.suspend().catch(()=>{});},1800);}
 }
 setDepth(depth:number){
  if(this.disposed||!this.enabled||Math.abs(depth-this.lastDepth)<.015)return;this.lastDepth=depth;const now=this.context.currentTime;
  this.tone.frequency.setTargetAtTime(820-depth*350,now,1.5);this.air.gain.setTargetAtTime(.018+depth*.008,now,1.5);this.wet.gain.setTargetAtTime(.52+depth*.16,now,1.5);
 }
 private onVisibility=()=>{if(this.disposed)return;if(document.hidden){void this.context.suspend().catch(()=>{});}else if(this.enabled){void this.context.resume().catch(()=>{});}};
 dispose(){
  if(this.disposed)return;this.disposed=true;this.enabled=false;++this.intent;clearInterval(this.bellTimer);clearTimeout(this.suspendTimer);
  if(typeof document!=='undefined')document.removeEventListener('visibilitychange',this.onVisibility);
  for(const source of this.sources){source.onended=null;try{source.stop();}catch{/* A distant bell may have already ended. */}source.disconnect();}this.sources.clear();this.nodes.forEach(node=>node.disconnect());this.nodes.clear();void this.context.close().catch(()=>{});
 }
}
