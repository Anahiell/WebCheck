"use strict";
// Architecture sourced from RobotProj design. Edges are illustrative, not live telemetry.
// 'prototype' means independently bench-tested, NOT physically integrated over CAN.
const ARCH_NS="http://www.w3.org/2000/svg";
const archNodes=[
["pi",460,35,"RASPBERRY PI 5","Read-only host metrics","prototype"],
["core",460,165,"RobotCore / C++20","Protocol · Encoder · Decoder","prototype"],
["ros",780,165,"ROS 2","Nodes · topics · services","planned"],
["can",460,300,"SocketCAN / CAN bus","vcan0 · physical bus pending","prototype"],
["head",65,435,"ESP32 · HEAD","Yaw / pitch controller","prototype"],
["cool",355,435,"ESP32 · COOLING","PWM fans · RPM","prototype"],
["eyes",645,435,"ESP32 · EYES","Eye servos / eyelids","planned"],
["arms",935,435,"ESP32 · ARMS","Future arm joints","planned"],
["servo",65,590,"NECK SERVOS","2-axis neck mechanism","prototype"],
["fans",355,590,"COOLING FANS","12V fans · PWM / tach","prototype"],
["vision",645,590,"STEREO CAMERAS","Vision input to Pi","planned"],
["ultra",935,590,"HC-SR04 SENSORS","Ultrasonic · bench parts","planned"]
];
const archEdges=[
["pi","core","prototype"],["core","ros","planned"],["core","can","prototype"],
["can","head","planned"],["can","cool","planned"],["can","eyes","planned"],["can","arms","planned"],
["head","servo","prototype"],["cool","fans","prototype"],["pi","vision","planned"],["eyes","ultra","planned"]
];
const STORAGE_KEY="robot-observatory-layout-v1";
const svg=(tag,attrs={})=>{const e=document.createElementNS(ARCH_NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function drawTopology(){
 const root=document.getElementById("topology-svg");if(!root)return;
 const defaults=new Map(archNodes.map(n=>[n[0],{x:n[1],y:n[2]}]));
 let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")||{};}catch{}
 const positions=new Map([...defaults].map(([id,p])=>[id,{x:clamp(Number(saved[id]?.x) || p.x,0,1036),y:clamp(Number(saved[id]?.y) || p.y,0,626)}]));
 let zoom=1, selected=null, dragging=null;
 const edgeLayer=svg("g"),particleLayer=svg("g"),nodeLayer=svg("g");root.append(edgeLayer,nodeLayer,particleLayer);
 const edges=archEdges.map(([a,b,state],index)=>{
  const path=svg("path",{class:"arch-link "+(state==="planned"?"planned":"")});edgeLayer.append(path);
  const particles=[];
  for(let i=0;i<2;i++){const dot=svg("circle",{r:4.5,class:"arch-particle "+(state==="planned"?"planned":""),"pointer-events":"none"});particleLayer.append(dot);particles.push(dot);}
  return {a,b,path,particles};
 });
 const groups=new Map();
 for(const [id,x,y,title,detail,state] of archNodes){
  const g=svg("g",{class:"arch-node "+state,tabindex:"0",role:"button","aria-label":title+", "+state,"data-id":id});
  g.append(svg("rect",{width:224,height:84,rx:12,class:"arch-box"}));
  g.append(svg("circle",{cx:18,cy:18,r:4,class:"arch-indicator"}));
  for(const [content,dy,cls] of [[state==="running"?"RUNNING":state==="prototype"?"PROTOTYPE":"PLANNED",22,"arch-state"],[title,48,"arch-title"],[detail,68,"arch-detail"]]){const t=svg("text",{x:dy===22?30:16,y:dy,class:cls});t.textContent=content;g.append(t);}
  g.addEventListener("click",()=>select(id));
  g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(id);}if(e.key.startsWith("Arrow")){e.preventDefault();const p=positions.get(id);p.x=clamp(p.x+(e.key==="ArrowRight"?10:e.key==="ArrowLeft"?-10:0),0,1036);p.y=clamp(p.y+(e.key==="ArrowDown"?10:e.key==="ArrowUp"?-10:0),0,626);refresh();persist();}});
  g.addEventListener("pointerdown",e=>{if(e.button!==0)return;select(id);const p=positions.get(id);dragging={id,pointer:e.pointerId,x:e.clientX,y:e.clientY,startX:p.x,startY:p.y};g.setPointerCapture(e.pointerId);});
  g.addEventListener("pointermove",e=>{if(!dragging||dragging.pointer!==e.pointerId||dragging.id!==id)return;const rect=root.getBoundingClientRect();const p=positions.get(id);p.x=clamp(dragging.startX+(e.clientX-dragging.x)*1260/rect.width,0,1036);p.y=clamp(dragging.startY+(e.clientY-dragging.y)*710/rect.height,0,626);refresh();});
  const finish=e=>{if(dragging?.pointer===e.pointerId){dragging=null;persist();}};
  g.addEventListener("pointerup",finish);g.addEventListener("pointercancel",finish);
  nodeLayer.append(g);groups.set(id,g);
 }
 function select(id){selected=id;for(const [key,g] of groups)g.classList.toggle("selected",key===id);const n=archNodes.find(n=>n[0]===id);document.getElementById("topology-detail").textContent=n?`${n[3]} — ${n[4]} · ${n[5].toUpperCase()}`:"Select a node for details.";}
 function refresh(){
  for(const [id,g] of groups){const p=positions.get(id);g.setAttribute("transform",`translate(${p.x} ${p.y})`);}
  for(const e of edges){const a=positions.get(e.a),b=positions.get(e.b);const ac={x:a.x+112,y:a.y+42},bc={x:b.x+112,y:b.y+42};const dx=bc.x-ac.x,dy=bc.y-ac.y;let d;
   if(Math.abs(dx)>Math.abs(dy)){const sx=ac.x+(dx>0?112:-112),ex=bc.x+(dx>0?-112:112);d=`M ${sx} ${ac.y} C ${(sx+ex)/2} ${ac.y}, ${(sx+ex)/2} ${bc.y}, ${ex} ${bc.y}`;}
   else{const sy=ac.y+(dy>0?42:-42),ey=bc.y+(dy>0?-42:42);d=`M ${ac.x} ${sy} C ${ac.x} ${(sy+ey)/2}, ${bc.x} ${(sy+ey)/2}, ${bc.x} ${ey}`;}
   e.path.setAttribute("d",d);e.length=e.path.getTotalLength();
  }
 }
 function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(Object.fromEntries(positions)));}catch{}}
 document.getElementById("topology-reset").addEventListener("click",()=>{for(const [id,p] of defaults)positions.set(id,{...p});refresh();persist();});
 document.getElementById("topology-zoom-in").addEventListener("click",()=>setZoom(zoom+.15));
 document.getElementById("topology-zoom-out").addEventListener("click",()=>setZoom(zoom-.15));
 function setZoom(value){zoom=clamp(value,.7,1.7);root.style.width=(zoom*100)+"%";root.style.minWidth=(zoom*900)+"px";document.getElementById("topology-zoom-label").textContent=Math.round(zoom*100)+"%";}
 const reduced=matchMedia("(prefers-reduced-motion: reduce)");
 let moving=!reduced.matches;
 const motion=document.getElementById("topology-motion");
 function motionLabel(){motion.textContent=moving?"Pause motion":"Resume motion";motion.setAttribute("aria-pressed",String(moving));particleLayer.style.display=moving?"":"none";}
 motion.addEventListener("click",()=>{moving=!moving;motionLabel();});
 reduced.addEventListener("change",()=>{moving=!reduced.matches;motionLabel();});
 function animate(now){
  if(moving&&!document.hidden)for(const edge of edges)edge.particles.forEach((dot,i)=>{
   const point=edge.path.getPointAtLength(((now/5500+i/2)%1)*edge.length);
   dot.setAttribute("transform",`translate(${point.x} ${point.y})`);
  });
  requestAnimationFrame(animate);
 }
 refresh();select("pi");motionLabel();requestAnimationFrame(animate);
}
document.addEventListener("DOMContentLoaded",drawTopology);
