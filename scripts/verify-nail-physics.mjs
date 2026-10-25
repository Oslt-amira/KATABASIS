import RAPIER from '@dimforge/rapier3d-compat';
import {NailDynamics,GUIDE_SPAWN_AT} from '../components/nail-dynamics.ts';
await RAPIER.init();
for(const [width,height] of [[390,844],[1440,900]])for(const angle of [0,-.18,-.12,.05,.12]){
 const sw=Math.min(width*.96,520),py=(height/2-height*(width<600?.29:.32)-sw*.81)/90;
 const layout=[-1,1].map(side=>({x:side*sw*.21/90,y:py,width:sw*.265/90,a:angle}));
 const dynamics=new NailDynamics(width,height,layout);
 for(let frame=0;frame<600;frame++)dynamics.advance(Math.min(9,(frame+1)/60),layout);
 const result={width,angle,count:dynamics.nails.length,lastIsGuide:dynamics.nails.at(-1)?.featured,bounces:dynamics.guide?.bounces,edgeReady:dynamics.edgeReady,edgeAt:dynamics.edgeAt};console.log(JSON.stringify(result));
 if(result.count!==(width<600?23:29)||!result.lastIsGuide||!result.bounces||!result.edgeReady||result.edgeAt>4.2)process.exitCode=1;
 const guide=dynamics.guide;if(!guide||guide.firstHit<GUIDE_SPAWN_AT||!Number.isFinite(guide.body.translation().y))process.exitCode=1;
 if(!dynamics.guide?.body.isDynamic())throw new Error('Guide must remain dynamic at the rim');
 const momentum=dynamics.releaseGuide();if(!momentum||!Number.isFinite(momentum.velocity.x)||!Number.isFinite(momentum.angularVelocity.z)||dynamics.guide.body.isEnabled())throw new Error('Release must preserve finite momentum and detach the guide');
 dynamics.reset();if(dynamics.nails.length||dynamics.guide||dynamics.edgeReady||dynamics.time)process.exitCode=1;
 dynamics.dispose();
}

// Moving pans must produce the same last-drop result at different display frame rates.
for(const [width,height] of [[390,844],[1440,900]]){
 const sw=Math.min(width*.96,520),top=height*(width<600?.29:.32),arrivals=[];
 const layoutAt=time=>[-1,1].map(side=>{const a=.08*Math.sin(time*2)+.07,x=side*sw*.21,y=sw*.72;return{x:(x*Math.cos(a)-y*Math.sin(a))/90,y:(height/2-top-sw*.09-x*Math.sin(a)-y*Math.cos(a))/90,width:sw*.265/90,a:-a};});
 for(const fps of [30,60,120]){
  const dynamics=new NailDynamics(width,height,layoutAt(0));let rotationAtRim=null,rocked=false;
  for(let frame=0;frame<fps*6;frame++){
   const time=(frame+1)/fps;dynamics.advance(time,layoutAt(time));
   if(dynamics.edgeReady){const q=dynamics.guide.body.rotation();if(!rotationAtRim)rotationAtRim={...q};else if(Math.abs(q.x-rotationAtRim.x)+Math.abs(q.y-rotationAtRim.y)+Math.abs(q.z-rotationAtRim.z)>.01)rocked=true;}
  }
  if(!dynamics.edgeReady||!rocked)throw new Error(`The dynamic rim must remain responsive: ${width}px / ${fps}fps`);
  arrivals.push(dynamics.edgeAt);dynamics.dispose();
 }
 if(Math.max(...arrivals)-Math.min(...arrivals)>1/60)throw new Error('Physics timing changed with display frame rate');
 console.log(JSON.stringify({width,movingPanFrameRates:[30,60,120],edgeArrival:arrivals,rocked:true}));
}
