'use strict';
(function(global){
const u32=(v,o)=>v.getUint32(o,true), f32=(v,o)=>v.getFloat32(o,true), u16=(v,o)=>v.getUint16(o,true);
async function bspFromPak(file, sceneName){
  const headBuf=await file.slice(0,1024*1024).arrayBuffer(), v=new DataView(headBuf); let p=0;
  const id=u32(v,p); p+=4; const num=u32(v,p); p+=4; const entries=[];
  if(num<1||num>100000) throw new Error('Неожиданный формат data_0.pak');
  for(let i=0;i<num;i++){ const n=u32(v,p); p+=4; if(n>2048||p+n+8>v.byteLength) throw new Error('Заголовок PAK больше 1 МБ или повреждён');
    const bytes=new Uint8Array(headBuf,p,n); p+=n; let name=''; for(const b of bytes) name+=String.fromCharCode(b);
    const off=u32(v,p), size=u32(v,p+4); p+=8; entries.push({name,off,size}); }
  const headSize=p, target=('\\WORLDS\\'+sceneName.replace(/\.scn$/i,'.BSP')).toUpperCase();
  const e=entries.find(x=>x.name.toUpperCase().endsWith(target)); if(!e) throw new Error('BSP для '+sceneName+' не найден в PAK');
  const start=headSize+e.off; return new Uint8Array(await file.slice(start+4,start+e.size-8).arrayBuffer());
}
function parseBSP(bytes){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength); if(v.byteLength<80||u32(v,0)!==0x0b) throw new Error('Это не RenderWare BSP');
  const worldStruct=12; if(u32(v,worldStruct)!==1) throw new Error('Не найден WORLD STRUCT');
  const d=worldStruct+12; const triTotal=u32(v,d+28), vertTotal=u32(v,d+32), worldSectors=u32(v,d+44), flags=u32(v,d+52);
  const hasNormals=!!(flags&0x10), hasPrelit=!!(flags&0x08), hasTex=!!(flags&0x04), hasTex2=!!(flags&0x80);
  const out=[], cols=[]; let sectors=0, tris=0; const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for(let o=0;o+24<v.byteLength;o+=4){ if(u32(v,o)!==9||u32(v,o+8)!==772) continue; if(u32(v,o+12)!==1||u32(v,o+20)!==772) continue;
    let p=o+24; const materialBase=u32(v,p), tc=u32(v,p+4), vc=u32(v,p+8); p+=44; if(vc>100000||tc>100000||p+vc*12>v.byteLength) continue;
    const verts=new Array(vc); for(let i=0;i<vc;i++){const a=[f32(v,p),f32(v,p+4),f32(v,p+8)];p+=12;verts[i]=a;for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],a[k]);bounds.max[k]=Math.max(bounds.max[k],a[k]);}}
    if(hasNormals)p+=vc*4; let colors=null; if(hasPrelit){colors=new Array(vc);for(let i=0;i<vc;i++){colors[i]=[v.getUint8(p)/255,v.getUint8(p+1)/255,v.getUint8(p+2)/255];p+=4;}}
    if(hasTex)p+=vc*8; else if(hasTex2)p+=vc*16; if(p+tc*8>v.byteLength) continue;
    for(let i=0;i<tc;i++){const m=u16(v,p),a=u16(v,p+2),b=u16(v,p+4),c=u16(v,p+6);p+=8; for(const ix of [a,b,c]){if(ix>=vc)continue;out.push(...verts[ix]); if(colors) cols.push(...colors[ix]); else {const y=verts[ix][1];cols.push(.42+.12*Math.sin(y),.48+.10*Math.sin(y),.52+.08*Math.sin(y));}} tris++;} sectors++;
  }
  if(!out.length) throw new Error('Геометрия BSP не найдена'); return {positions:new Float32Array(out),colors:new Float32Array(cols),bounds,sectors,tris,triTotal,vertTotal,worldSectors,flags};
}
function matPerspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function norm(a){const l=Math.hypot(...a)||1;return a.map(x=>x/l)} function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]} function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function matLook(eye,center,up){const z=norm(eye.map((x,i)=>x-center[i])),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];return o}
function transform(m,p){const x=p[0],y=p[1],z=p[2],w=m[3]*x+m[7]*y+m[11]*z+m[15];return[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w,w]}
class Viewer{
 constructor(world,overlay){this.c=world;this.o=overlay;this.gl=world.getContext('webgl',{antialias:true});this.geo=null;this.yaw=.7;this.pitch=.55;this.dist=140;this.center=[0,0,0];this.points=[];this.selected=null;this.drag=false;this.init();}
 init(){const gl=this.gl;if(!gl)return;const vs=`attribute vec3 p;attribute vec3 c;uniform mat4 m;varying vec3 vc;void main(){vc=c;gl_Position=m*vec4(p,1.0);}`;const fs=`precision mediump float;varying vec3 vc;void main(){gl_FragColor=vec4(vc,1.0);}`;const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x};this.prog=gl.createProgram();gl.attachShader(this.prog,sh(gl.VERTEX_SHADER,vs));gl.attachShader(this.prog,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(this.prog);this.bp=gl.createBuffer();this.bc=gl.createBuffer();
  overlay.addEventListener('pointerdown',e=>{this.drag=true;this.px=e.clientX;this.py=e.clientY;overlay.setPointerCapture(e.pointerId)});overlay.addEventListener('pointermove',e=>{if(!this.drag)return;this.yaw-=(e.clientX-this.px)*.008;this.pitch=Math.max(-1.35,Math.min(1.35,this.pitch+(e.clientY-this.py)*.008));this.px=e.clientX;this.py=e.clientY;this.draw()});overlay.addEventListener('pointerup',()=>this.drag=false);overlay.addEventListener('wheel',e=>{e.preventDefault();this.dist=Math.max(5,this.dist*Math.exp(e.deltaY*.001));this.draw()},{passive:false}); }
 setGeometry(g){this.geo=g;const b=g.bounds;this.center=b.min.map((x,i)=>(x+b.max[i])/2);const span=Math.max(...b.max.map((x,i)=>x-b.min[i]));this.dist=Math.max(20,span*1.25);const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.bp);gl.bufferData(gl.ARRAY_BUFFER,g.positions,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,this.bc);gl.bufferData(gl.ARRAY_BUFFER,g.colors,gl.STATIC_DRAW);this.draw()}
 setPoints(points,selected){this.points=points||[];this.selected=selected;this.draw()}
 reset(){if(this.geo)this.setGeometry(this.geo)}
 resize(){const r=this.c.getBoundingClientRect(),d=devicePixelRatio||1;for(const c of [this.c,this.o]){c.width=Math.max(2,Math.round(r.width*d));c.height=Math.max(2,Math.round(r.height*d));}this.draw()}
 draw(){const gl=this.gl;if(!gl)return;const r=this.c.getBoundingClientRect(),d=devicePixelRatio||1;if(this.c.width!==Math.round(r.width*d))this.resize();gl.viewport(0,0,this.c.width,this.c.height);gl.clearColor(.055,.075,.095,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);if(!this.geo)return;
  const cp=Math.cos(this.pitch),eye=[this.center[0]+this.dist*cp*Math.sin(this.yaw),this.center[1]+this.dist*Math.sin(this.pitch),this.center[2]+this.dist*cp*Math.cos(this.yaw)];const m=mul(matPerspective(Math.PI/3,r.width/r.height,.1,5000),matLook(eye,this.center,[0,1,0]));this.mvp=m;gl.useProgram(this.prog);const ap=gl.getAttribLocation(this.prog,'p'),ac=gl.getAttribLocation(this.prog,'c');gl.bindBuffer(gl.ARRAY_BUFFER,this.bp);gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,this.bc);gl.enableVertexAttribArray(ac);gl.vertexAttribPointer(ac,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(gl.getUniformLocation(this.prog,'m'),false,m);gl.drawArrays(gl.TRIANGLES,0,this.geo.positions.length/3);this.drawOverlay(); }
 drawOverlay(){const ctx=this.o.getContext('2d'),r=this.o.getBoundingClientRect(),d=devicePixelRatio||1;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);this.screenPoints=[];for(const p of this.points){const q=transform(this.mvp,[p.position.x,p.position.y+1.5,p.position.z]);if(q[3]<=0||q[2]<-1||q[2]>1)continue;const x=(q[0]*.5+.5)*r.width,y=(-q[1]*.5+.5)*r.height,sel=this.selected&&this.selected.trigger.idx===p.trigger.idx;ctx.beginPath();ctx.arc(x,y,sel?8:6,0,Math.PI*2);ctx.fillStyle=sel?'#ffd166':'#4db6ff';ctx.fill();ctx.strokeStyle='#071019';ctx.lineWidth=2;ctx.stroke();ctx.font='12px Segoe UI';ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.strokeText(p.name,x+10,y+4);ctx.fillText(p.name,x+10,y+4);this.screenPoints.push({p,x,y});}}
 pick(x,y){let best=null,bd=18;for(const q of this.screenPoints||[]){const d=Math.hypot(q.x-x,q.y-y);if(d<bd){bd=d;best=q.p}}return best}
}
global.ZBSP={bspFromPak,parseBSP,Viewer};
})(window);
