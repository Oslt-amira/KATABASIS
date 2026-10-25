'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { NAIL_MODEL_URL } from './model-config';
import { initializePhysics } from './physics';
import { editorialNailAnchor } from './editorial';
import { NailDynamics, PHYSICS_UNIT as U, type FallingNail } from './nail-dynamics';
import { createNailRenderer } from './webgl';
export type MotionState={progress:number;velocity:number;pointerX:number;pointerY:number;impact:number;reduced:boolean;scaleAngle:number;nailReady:boolean};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(v:number)=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10);};
const mix=THREE.MathUtils.lerp;
function makePlaceholder(){
 // A temporary detailed preview. The GLB loader replaces this entire group when the supplied model is available.
 const group=new THREE.Group();const rings=40,sides=12,vertices:number[]=[],indices:number[]=[],uvs:number[]=[];
 for(let j=0;j<=rings;j++){const t=j/rings;const radius=(1-t)*4.4+.10;for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2+t*4.1;const irregular=1+.10*Math.sin(j*3.2+i*7.7);vertices.push(Math.cos(a)*radius*irregular+Math.sin(t*4)*.7,45-t*96,Math.sin(a)*radius*irregular);uvs.push(i/sides,t);if(j<rings&&i<sides){const n=j*(sides+1)+i;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1);}}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const texture=new THREE.TextureLoader().load('/assets/nail-removebg-preview.png');texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshStandardMaterial({map:texture,color:0xcbd3cf,metalness:.76,roughness:.62,envMapIntensity:.65});
 const projectUV=(g:THREE.BufferGeometry,offset=0)=>{const pos=g.getAttribute('position'),coords=[];for(let i=0;i<pos.count;i++){coords.push((137+(pos.getX(i)/26+.5)*142)/408,1-(44+(50-pos.getY(i)-offset)/101*539)/612);}g.setAttribute('uv',new THREE.Float32BufferAttribute(coords,2));};projectUV(geometry);group.add(new THREE.Mesh(geometry,material));
 const head=new THREE.CylinderGeometry(10.3,9,5.5,14,3);const position=head.getAttribute('position');for(let i=0;i<position.count;i++){position.setY(i,position.getY(i)+Math.sin(position.getX(i)*2.4+position.getZ(i)*1.6)*.5);}head.computeVertexNormals();projectUV(head,47);const cap=new THREE.Mesh(head,material);cap.position.y=47;group.add(cap);return group;
}
export default function NailScene({motion}:{motion:React.RefObject<MotionState>}){
 const caveHost=useRef<HTMLDivElement>(null),nailHost=useRef<HTMLDivElement>(null),fallbackRain=useRef<HTMLDivElement>(null),fallbackLead=useRef<HTMLImageElement>(null);
 useEffect(()=>{
  let disposed=false,raf=0;
  // One context for the nails; rock, shadow and dust remain visible without WebGL.
  const basic=new URLSearchParams(location.search).get('graphics')==='basic';
  const graphics=basic?null:createNailRenderer();const renderer=graphics?.renderer;
  let fallbackActive=!graphics;
  const setRenderMode=(fallback:boolean)=>{fallbackActive=fallback;nailHost.current?.setAttribute('data-render-mode',fallback?'image':'webgl');};
  setRenderMode(fallbackActive);
  if(graphics){nailHost.current?.appendChild(graphics.canvas);renderer!.setClearColor(0,0);renderer!.setPixelRatio(Math.min(devicePixelRatio,innerWidth<600?1.25:1.5));renderer!.toneMapping=THREE.ACESFilmicToneMapping;renderer!.toneMappingExposure=1.3;}
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,3000);camera.position.z=1000;
  let environment:THREE.WebGLRenderTarget|undefined;
  if(renderer){const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();}
  scene.add(new THREE.AmbientLight(0xffffff,.9));const key=new THREE.DirectionalLight(0xffffff,3.4);key.position.set(-280,350,500);scene.add(key);const rim=new THREE.DirectionalLight(0xd1d1d1,2.5);rim.position.set(300,-100,-100);scene.add(rim);
  const lost=(event:Event)=>{event.preventDefault();if(!disposed)setRenderMode(true);};
  const restored=()=>{if(!disposed&&graphics&&!graphics.context.isContextLost()){setRenderMode(false);renderer!.setSize(innerWidth,innerHeight);}};
  graphics?.canvas.addEventListener('webglcontextlost',lost);graphics?.canvas.addEventListener('webglcontextrestored',restored);
  let template=makePlaceholder();const lead=new THREE.Group();lead.add(template.clone(true));scene.add(lead);lead.visible=false;
  let dynamics:NailDynamics|null=null,guideReleased=false,last=0,w=0,h=0,previousProgress=0,release:THREE.Vector3|null=null,releaseQ=new THREE.Quaternion();
  const visuals=new Map<FallingNail,THREE.Group>(),fallbackImages=new Map<FallingNail,HTMLImageElement>();
  const axis=new THREE.Vector3(),previousQ=new THREE.Quaternion(),releaseVelocity=new THREE.Vector3(),releaseSpin=new THREE.Vector3(),spinQ=new THREE.Quaternion(),poseQ=new THREE.Quaternion();
  const drawImageNail=(mesh:THREE.Group,img:HTMLImageElement)=>{img.hidden=!mesh.visible;if(!mesh.visible)return;axis.set(0,1,0).applyQuaternion(mesh.quaternion);const projected=Math.max(.18,Math.hypot(axis.x,axis.y));const height=100*mesh.scale.y*projected*612/539;img.style.height=`${height}px`;img.style.width=`${height*408/612}px`;img.style.transform=`translate3d(${mesh.position.x}px,${-mesh.position.y}px,0) translate(-50%,-50%) rotate(${Math.atan2(axis.x,axis.y)}rad)`;};
  const clearVisuals=()=>{visuals.forEach(mesh=>scene.remove(mesh));visuals.clear();fallbackImages.forEach(img=>img.remove());fallbackImages.clear();};
  const leadPosition=new THREE.Vector3(),leadVelocity=new THREE.Vector3(),target=new THREE.Vector3(),targetQ=new THREE.Quaternion(),rotationEuler=new THREE.Euler();
  let assembly:HTMLElement|null=null,pendingResize=false,releaseAge=0,flight=0,rainTime=0;
  const resize=()=>{w=innerWidth;h=innerHeight;renderer?.setSize(w,h);camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();assembly=document.querySelector('.scale-assembly');if(dynamics)pendingResize=true;};resize();window.addEventListener('resize',resize);
  const modelLoaded=(model:THREE.Group)=>{const bounds=new THREE.Box3().setFromObject(model);const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());model.position.sub(center);const normalized=new THREE.Group();normalized.add(model);normalized.scale.setScalar(100/size.y);template=normalized;lead.clear();lead.add(template.clone(true));visuals.forEach(mesh=>{mesh.clear();mesh.add(template.clone(true));});nailHost.current?.setAttribute('data-model','meshy');};
  if(NAIL_MODEL_URL)new GLTFLoader().load(NAIL_MODEL_URL,gltf=>{if(!disposed)modelLoaded(gltf.scene);},undefined,error=>console.error('The supplied nail model could not load',error));
  const panPositions=()=>{const sw=assembly?.offsetWidth||Math.min(w*.96,520),a=motion.current.scaleAngle;const top=assembly?.offsetTop||h*.30;return [-1,1].map(side=>{const x=side*sw*.21,y=sw*.72;return {x:(x*Math.cos(a)-y*Math.sin(a))/U,y:(h/2-top-sw*.09-x*Math.sin(a)-y*Math.cos(a))/U,width:sw*.265/U,a:-a};});};
  const resetRain=()=>{clearVisuals();dynamics?.reset();release=null;guideReleased=false;releaseAge=0;flight=0;rainTime=0;assembly?.style.setProperty('--scale-exit','0');motion.current.nailReady=false;leadVelocity.set(0,0,0);};
  initializePhysics().then(()=>{if(!disposed)dynamics=new NailDynamics(w,h,panPositions());}).catch(error=>console.error('Physics initialization failed',error));
  const frame=(now:number)=>{if(disposed)return;raf=requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04)||.016;last=now;if(document.hidden)return;const m=motion.current,p=m.progress;
   // Descend through actual irregular rock, with cold side light and a distant red reflection.
   caveHost.current?.style.setProperty('--drift-y',`${-p*2.5-m.pointerY*.4}vh`);caveHost.current?.style.setProperty('--drift-x',`${m.pointerX*-12}px`);caveHost.current?.style.setProperty('--opening-zoom',String(1.08+ease(p/.18)*.12));
   if(pendingResize&&dynamics){clearVisuals();dynamics.dispose();dynamics=new NailDynamics(w,h,panPositions());release=null;guideReleased=false;releaseAge=0;flight=0;rainTime=0;assembly?.style.setProperty('--scale-exit','0');m.nailReady=false;leadVelocity.set(0,0,0);pendingResize=false;}
   if(dynamics){
    if((p<.285&&previousProgress>=.285)||(p<.445&&previousProgress>=.445))resetRain();
    if(p>=.29){rainTime=Math.min(8,rainTime+dt);const targetTime=rainTime;m.impact=Math.min(3,m.impact+dynamics.advance(targetTime,panPositions()));}
    for(const nail of dynamics.nails){
     let mesh=visuals.get(nail);if(!mesh){mesh=new THREE.Group();mesh.add(template.clone(true));mesh.scale.setScalar(nail.length/100);visuals.set(nail,mesh);scene.add(mesh);const img=document.createElement('img');img.src='/assets/nail-removebg-preview.png';img.alt='';img.className='fallback-nail';img.hidden=true;fallbackImages.set(nail,img);fallbackRain.current?.appendChild(img);}
     const pos=nail.body.translation(),q=nail.body.rotation();const a=dynamics.alpha,prev=nail.previousPosition,pq=nail.previousRotation;
     mesh.position.set(mix(prev.x,pos.x,a)*U,mix(prev.y,pos.y,a)*U,mix(prev.z,pos.z,a)*U);previousQ.set(pq.x,pq.y,pq.z,pq.w);mesh.quaternion.set(q.x,q.y,q.z,q.w).slerp(previousQ,1-a);mesh.visible=p>=.29&&p<.665&&flight<.85&&!(nail.featured&&guideReleased);
    }
    if(!guideReleased&&p>=.46&&dynamics.edgeReady&&dynamics.guide){
     const source=dynamics.guide.body,pos=source.translation(),q=source.rotation();release=new THREE.Vector3(pos.x*U,pos.y*U,pos.z*U);releaseQ.set(q.x,q.y,q.z,q.w);leadPosition.copy(release);lead.quaternion.copy(releaseQ);const momentum=dynamics.releaseGuide();releaseVelocity.set(momentum?.velocity.x||0,momentum?.velocity.y||0,momentum?.velocity.z||0).multiplyScalar(U*.65).clampLength(0,300);releaseVelocity.addScaledVector(target.copy(release).negate().normalize(),150);releaseSpin.set(momentum?.angularVelocity.x||0,momentum?.angularVelocity.y||0,momentum?.angularVelocity.z||0).clampLength(.5,5);guideReleased=true;releaseAge=0;flight=0;visuals.get(dynamics.guide)!.visible=false;
    }
    nailHost.current?.setAttribute('data-guide-state',guideReleased?'following':dynamics.edgeReady?'edge':dynamics.guide?.bounces?'bounced':dynamics.guide?'falling':'waiting');
    nailHost.current?.setAttribute('data-guide-bounces',String(dynamics.guide?.bounces||0));
   }
   lead.visible=guideReleased;
   if(guideReleased&&release){
    releaseAge+=dt;
    // Finish the handoff in elapsed time, even while scrolling is paused.
    flight=clamp(releaseAge/.85);
    const lift=ease(flight),story=clamp((p-.64)/.36),final=ease((p-.93)/.06);
    assembly?.style.setProperty('--scale-exit',String(ease((flight-.15)/.85)));
    nailHost.current?.setAttribute('data-flight',flight.toFixed(3));
    const anchor=editorialNailAnchor(p,w<600);const centerX=anchor.x*w;const centerY=anchor.y*h+final*h*.015;
    target.set(centerX,centerY,80);
    if(flight<1){
     // A Hermite trajectory carries the captured release velocity; no second easing spring.
     const t=flight,t2=t*t,t3=t2*t;
     leadPosition.copy(release).multiplyScalar(2*t3-3*t2+1).addScaledVector(releaseVelocity,.85*(t3-2*t2+t)).addScaledVector(target,-2*t3+3*t2);
     leadPosition.y+=16*t2*(1-t)*(1-t)*h*.055;
     leadVelocity.copy(releaseVelocity).multiplyScalar(3*t2-4*t+1).addScaledVector(target.clone().sub(release),(6*t-6*t2)/.85);leadVelocity.y+=32*t*(1-t)*(1-2*t)*h*.055/.85;
    }else{
     const omega=14,decay=Math.exp(-omega*dt);
     for(const axis of ['x','y','z'] as const){const offset=leadPosition[axis]-target[axis],step=(leadVelocity[axis]+omega*offset)*dt;leadPosition[axis]=target[axis]+(offset+step)*decay;leadVelocity[axis]=(leadVelocity[axis]-omega*step)*decay;}
    }
    lead.position.copy(leadPosition);
    const bank=Math.max(-.22,Math.min(.22,-leadVelocity.x/w*.22));
    rotationEuler.set(.16+Math.sin(story*5)*.18+m.pointerY*.1,story*Math.PI*2+m.pointerX*.22,Math.sin(story*5)*.16+bank);poseQ.setFromEuler(rotationEuler);
    if(flight<1&&!m.reduced){const speed=releaseSpin.length();spinQ.setFromAxisAngle(axis.copy(releaseSpin).normalize(),speed*(1-Math.exp(-releaseAge*2))/2);targetQ.copy(releaseQ).multiply(spinQ).slerp(poseQ,lift);lead.quaternion.copy(targetQ);}else lead.quaternion.slerp(poseQ,1-Math.exp(-9*dt));
    const size=mix((dynamics?.guide?.length||57)/100,w<600?2.55:4.2,lift)*(1-final*.12);lead.scale.setScalar(size);
    m.nailReady=m.nailReady||(lift>.99&&leadPosition.distanceTo(target)<26);
   }else if(p<.45){release=null;m.nailReady=false;}
   if(fallbackActive){for(const [nail,mesh] of visuals){const img=fallbackImages.get(nail);if(img)drawImageNail(mesh,img);}if(fallbackLead.current)drawImageNail(lead,fallbackLead.current);}
   else if(renderer)renderer.render(scene,camera);
   previousProgress=p;
  };raf=requestAnimationFrame(frame);
  return()=>{disposed=true;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);graphics?.canvas.removeEventListener('webglcontextlost',lost);graphics?.canvas.removeEventListener('webglcontextrestored',restored);dynamics?.dispose();environment?.dispose();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();const collect=(object:THREE.Object3D)=>object.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(x=>materials.add(x));}});collect(scene);collect(template);geometries.forEach(x=>x.dispose());materials.forEach(x=>{Object.values(x).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});x.dispose();});clearVisuals();graphics?.release();};
 },[motion]);
 return <><div ref={caveHost} className="cave-canvas" aria-hidden="true"><div className="cave-dust"/></div><div ref={nailHost} className="nail-canvas" aria-hidden="true" data-render-mode="pending" data-model={NAIL_MODEL_URL?'loading':'pending-glb'}><div className="fallback-nails"><div ref={fallbackRain}/><img ref={fallbackLead} className="fallback-nail" src="/assets/nail-removebg-preview.png" alt="" hidden/></div></div></>;
}
