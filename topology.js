"use strict";
// Architecture sourced from RobotProj design. Edges are illustrative, not live telemetry.
// 'prototype' means independently bench-tested, NOT physically integrated over CAN.
const ARCH_NS="http://www.w3.org/2000/svg";
const archNodes=[
["pi",460,35,"RASPBERRY PI 5","Debian 13 · 16GB · host","running"],
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
const svg=(tag,attrs={})=>{const e=document.createElementNS(ARCH_NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
function drawTopology(){
 const root=document.getElementById("topology-svg");if(!root)return;
 const lookup=new Map(archNodes.map(n=>[n[0],n]));
 const headings=[["HOST / SOFTWARE",60,28],["DISTRIBUTED CONTROL",60,409],["HARDWARE",60,570]];
 for(const [name,x,y] of headings){const t=svg("text",{x,y,class:"arch-heading"});t.textContent=name;root.append(t);}
 for(const [a,b,status] of archEdges){
 const A=lookup.get(a),B=lookup.get(b),ax=A[1]+112,ay=A[2]+42,bx=B[1]+112,by=B[2]+42;
 let path;
 if(Math.abs(ax-bx)<15)path=`M ${ax} ${ay+37} C ${ax} ${ay+65}, ${bx} ${by-65}, ${bx} ${by-37}`;
 else if(Math.abs(ay-by)<100)path=`M ${ax+112} ${ay} C ${ax+180} ${ay}, ${bx-180} ${by}, ${bx-112} ${by}`;
 else path=`M ${ax} ${ay+37} C ${ax} ${(ay+by)/2}, ${bx} ${(ay+by)/2}, ${bx} ${by-37}`;
 root.append(svg("path",{d:path,class:"arch-link "+(status==="planned"?"planned":"")}));
 for(let i=0;i<2;i++){const dot=svg("circle",{r:"3",class:"arch-particle "+(status==="planned"?"planned":"")});dot.append(svg("animateMotion",{path,dur:(4.5+i)+"s",begin:(i*2.3)+"s",repeatCount:"indefinite"}));root.append(dot);}
 }
 for(const [id,x,y,title,detail,status] of archNodes){
 const g=svg("g",{class:"arch-node "+status});g.append(svg("rect",{x,y,width:"224",height:"84",rx:"12",class:"arch-box"}));g.append(svg("circle",{cx:x+18,cy:y+18,r:"4",class:"arch-indicator"}));
 for(const [content,dy,cls] of [[status==="running"?"RUNNING":status==="prototype"?"PROTOTYPE":"PLANNED",22,"arch-state"],[title,48,"arch-title"],[detail,68,"arch-detail"]]){const t=svg("text",{x:x+(dy===22?30:16),y:y+dy,class:cls});t.textContent=content;g.append(t);}root.append(g);
 }
}
document.addEventListener("DOMContentLoaded",drawTopology);
