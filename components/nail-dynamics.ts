import RAPIER from '@dimforge/rapier3d-compat';
export type PanPose={x:number;y:number;width:number;a:number};
type Vector={x:number;y:number;z:number};
type Rotation=Vector&{w:number};
export type FallingNail={body:RAPIER.RigidBody;featured:boolean;length:number;previousVY:number;bounces:number;firstHit:number;nudged:boolean;previousPosition:Vector;previousRotation:Rotation};
export const PHYSICS_UNIT=90;
export const RAIN_INTERVAL=.065;
export const GUIDE_SPAWN_AT=1.95;
const STEP=1/120,GRAVITY=16.5;
const random=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};
const rotate=(v:Vector,q:Rotation):Vector=>{const tx=2*(q.y*v.z-q.z*v.y),ty=2*(q.z*v.x-q.x*v.z),tz=2*(q.x*v.y-q.y*v.x);return{x:v.x+q.w*tx+q.y*tz-q.z*ty,y:v.y+q.w*ty+q.z*tx-q.x*tz,z:v.z+q.w*tz+q.x*ty-q.y*tx};};
export class NailDynamics{
 world:RAPIER.World;
 pans:RAPIER.RigidBody[]=[];
 nails:FallingNail[]=[];
 guide:FallingNail|undefined;
 time=0;edgeReady=false;edgeAt=0;alpha=0;
 width:number;height:number;count:number;
 private events=new RAPIER.EventQueue(true);
 private panColliders=new Set<number>();
 private nailColliders=new Map<number,FallingNail>();
 private layout:PanPose[];
 private rimJoint:RAPIER.ImpulseJoint|undefined;
 constructor(width:number,height:number,layout:PanPose[]){
  this.width=width;this.height=height;this.count=width<600?22:28;this.layout=layout.map(p=>({...p}));
  this.world=new RAPIER.World({x:0,y:-GRAVITY,z:0});this.world.timestep=STEP;this.world.numSolverIterations=10;
  this.pans=layout.map(p=>{
   const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x,p.y,0).setRotation({x:0,y:0,z:Math.sin(p.a/2),w:Math.cos(p.a/2)}));
   // A shallow concave metal pan. Each segment has its own contact normal.
   for(let i=0;i<8;i++){
    const x1=(i/8-.5)*p.width,x2=((i+1)/8-.5)*p.width;
    const y1=.11*Math.pow(x1/(p.width/2),2)-.08,y2=.11*Math.pow(x2/(p.width/2),2)-.08;
    const a=Math.atan2(y2-y1,x2-x1),half=Math.hypot(x2-x1,y2-y1)/2;
    const collider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(half,.018,.38).setTranslation((x1+x2)/2,(y1+y2)/2,0).setRotation({x:0,y:0,z:Math.sin(a/2),w:Math.cos(a/2)}).setFriction(.46).setRestitution(.13),body);this.panColliders.add(collider.handle);
   }
   return body;
  });
 }
 reset(){if(this.rimJoint)this.world.removeImpulseJoint(this.rimJoint,true);this.rimJoint=undefined;this.nails.forEach(n=>this.world.removeRigidBody(n.body));this.nails=[];this.nailColliders.clear();this.guide=undefined;this.time=0;this.edgeReady=false;this.edgeAt=0;this.alpha=0;}
 private spawn(index:number,featured:boolean,pan:PanPose){
  const u=random(index+1),v=random(index+39),length=featured?(this.width<600?57:65):(this.width<600?35:42)+v*13;
  // Side streams miss the pans; the main stream has a spread instead of a single spawn line.
  const miss=index%5===0;
  const x=featured?pan.x-pan.width*.18:miss?((u*.9-.45)*this.width)/PHYSICS_UNIT:pan.x+(u-.5)*pan.width*.85;
  const y=(this.height*.5+length*.6)/PHYSICS_UNIT+(featured?0:v*.9);
  const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,featured?0:(random(index+97)-.5)*.24).setLinearDamping(.06).setAngularDamping(.18).setCcdEnabled(true));
  body.setLinvel({x:featured?.22:(u-.5)*.7,y:featured?-.8:-.6-v*1.4,z:featured?0:(random(index+63)-.5)*.12},true);
  body.setAngvel({x:featured?.15:(random(index+11)-.5)*3.2,y:featured?1.1:(random(index+21)-.5)*5,z:featured?-.75:(u-.5)*6},true);
  const angle=featured?.36:(u-.5)*Math.PI*2;
  body.setRotation({x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)},true);
  const nail:FallingNail={body,featured,length,previousVY:0,bounces:0,firstHit:0,nudged:false,previousPosition:{...body.translation()},previousRotation:{...body.rotation()}};
  const half=length/PHYSICS_UNIT/2;
  const shapes=[RAPIER.ColliderDesc.capsule(half*.88,.021),RAPIER.ColliderDesc.cylinder(.022,.075).setTranslation(0,half*.94,0)];
  for(const shape of shapes){const collider=this.world.createCollider(shape.setDensity(7.8).setFriction(featured?.2:.42).setRestitution(featured?.30:.19).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);this.nailColliders.set(collider.handle,nail);}
  this.nails.push(nail);if(featured)this.guide=nail;
 }
 releaseGuide(){
  if(this.rimJoint)this.world.removeImpulseJoint(this.rimJoint,true);this.rimJoint=undefined;
  if(!this.guide)return;
  const velocity={...this.guide.body.linvel()},angularVelocity={...this.guide.body.angvel()};
  this.guide.body.setEnabled(false);return{velocity,angularVelocity};
 }
 private catchRim(nail:FallingNail,pan:PanPose){
  const pos=nail.body.translation(),q=nail.body.rotation();nail.body.resetForces(true);
  // Keep a dynamic pivot at the point of rim contact, preserving angular momentum.
  const anchor={x:pan.width*.46,y:.025,z:pos.z};
  const worldOffset=rotate(anchor,{x:0,y:0,z:Math.sin(pan.a/2),w:Math.cos(pan.a/2)});
  const delta={x:pan.x+worldOffset.x-pos.x,y:pan.y+worldOffset.y-pos.y,z:worldOffset.z-pos.z};
  const local=rotate(delta,{x:-q.x,y:-q.y,z:-q.z,w:q.w});
  this.rimJoint=this.world.createImpulseJoint(RAPIER.JointData.spherical(anchor,local),this.pans[1],nail.body,true);
  this.rimJoint.setContactsEnabled(false);this.edgeReady=true;this.edgeAt=this.time;
 }
 advance(target:number,layout:PanPose[]){
  let impacts=0;
  const steps=Math.min(24,Math.max(0,Math.floor((target-this.time+1e-8)/STEP))),start=this.layout.map(p=>({...p}));
  for(let step=0;step<steps;step++){
   const t=(step+1)/steps;
   const poses=layout.map((p,i)=>({x:start[i].x+(p.x-start[i].x)*t,y:start[i].y+(p.y-start[i].y)*t,width:p.width,a:start[i].a+(p.a-start[i].a)*t}));
   const due=Math.min(this.count,Math.floor(this.time/RAIN_INTERVAL)+1);
   while(this.nails.filter(n=>!n.featured).length<due)this.spawn(this.nails.length,false,poses[1]);
   if(this.time>=GUIDE_SPAWN_AT&&!this.guide)this.spawn(this.count,true,poses[1]);
   this.pans.forEach((body,i)=>{const p=poses[i];body.setNextKinematicTranslation({x:p.x,y:p.y,z:0});body.setNextKinematicRotation({x:0,y:0,z:Math.sin(p.a/2),w:Math.cos(p.a/2)});});
   for(const n of this.nails){n.previousPosition={...n.body.translation()};n.previousRotation={...n.body.rotation()};n.previousVY=n.body.linvel().y;}
   this.world.step(this.events);this.time+=STEP;
   const contacts=new Set<FallingNail>();
   this.events.drainCollisionEvents((a,b,started)=>{if(!started)return;const nail=this.panColliders.has(a)?this.nailColliders.get(b):this.panColliders.has(b)?this.nailColliders.get(a):undefined;if(nail&&nail.previousVY<-.4)contacts.add(nail);});
   for(const nail of contacts){nail.bounces++;if(!nail.firstHit)nail.firstHit=this.time;impacts+=Math.min(.6,Math.abs(nail.previousVY)*.025);}
   const nail=this.guide,pan=poses[1];
   if(nail&&!this.edgeReady&&nail.firstHit){
    const pos=nail.body.translation(),v=nail.body.linvel();
    if(!nail.nudged&&this.time>nail.firstHit+.13){const vx=Math.sqrt(2*.2*GRAVITY*Math.max(.06,pan.x+pan.width*.46-pos.x));nail.body.applyImpulse({x:nail.body.mass()*(vx-v.x),y:nail.body.mass()*.12,z:-nail.body.mass()*v.z},true);nail.body.applyTorqueImpulse({x:0,y:0,z:-nail.body.mass()*.015},true);nail.nudged=true;}
    if(nail.nudged){nail.body.resetForces(true);nail.body.addForce({x:nail.body.mass()*Math.max(-5,Math.min(5,(1.3-v.x)*6)),y:0,z:-nail.body.mass()*v.z*3},true);}
    const shaft=rotate({x:0,y:nail.length/PHYSICS_UNIT/2,z:0},nail.body.rotation());
    const reachesRim=pos.x+Math.abs(shaft.x)+.075>pan.x+pan.width*.42;
    if(nail.nudged&&reachesRim&&pos.x>pan.x+pan.width*.12&&pos.x<pan.x+pan.width*.82&&pos.y>pan.y-.55&&pos.y<pan.y+.65)this.catchRim(nail,pan);
   }
   this.layout=poses;
  }
  this.alpha=Math.max(0,Math.min(1,(target-this.time)/STEP));return impacts;
 }
 dispose(){this.events.free();this.world.free();}
}
