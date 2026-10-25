import * as THREE from 'three';

export type RendererHandle = {renderer:THREE.WebGLRenderer;canvas:HTMLCanvasElement;context:WebGL2RenderingContext;release:()=>void};
type RendererFactory = (parameters:THREE.WebGLRendererParameters)=>THREE.WebGLRenderer;

// Probe before constructing Three: an unavailable/blocked context should select
// the image renderer, rather than produce a Three console error and a blank scene.
export function createNailRenderer(
 createCanvas:()=>HTMLCanvasElement=()=>document.createElement('canvas'),
 construct:RendererFactory=parameters=>new THREE.WebGLRenderer(parameters),
):RendererHandle|null{
 const canvas=createCanvas();let context:WebGL2RenderingContext|null=null;
 const loseContext=()=>{try{context?.getExtension('WEBGL_lose_context')?.loseContext();}catch{/* Already lost or released. */}};
 try{
  context=canvas.getContext('webgl2',{alpha:true,antialias:false,depth:true,stencil:false,powerPreference:'default',preserveDrawingBuffer:false});
  if(!context||context.isContextLost()){canvas.remove();return null;}
  const renderer=construct({canvas,context,alpha:true,antialias:false,powerPreference:'default'});
  let released=false;
  return {renderer,canvas,context,release:()=>{if(released)return;released=true;try{renderer.dispose();}finally{loseContext();canvas.remove();}}};
 }catch{loseContext();canvas.remove();return null;}
}
