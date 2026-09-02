'use strict';
(function(global){
const u32=(v,o)=>v.getUint32(o,true), f32=(v,o)=>v.getFloat32(o,true), u16=(v,o)=>v.getUint16(o,true);
const pakCache=new WeakMap();
async function pakIndex(file){
  if(pakCache.has(file)) return pakCache.get(file);
  let cap=Math.min(file.size,1024*1024), buf=await file.slice(0,cap).arrayBuffer(), v=new DataView(buf), p=0;
  const id=u32(v,p); p+=4; const num=u32(v,p); p+=4;
  if(num<1||num>100000) throw new Error('Неожиданный формат data_0.pak');
  const entries=[];
  for(let i=0;i<num;i++){
    if(p+4>v.byteLength) throw new Error('Заголовок PAK обрезан');
    const n=u32(v,p); p+=4;
    if(n>4096) throw new Error('Повреждённое имя ресурса в PAK');
    if(p+n+8>v.byteLength){
      cap=Math.min(file.size,Math.max(cap*2,p+n+8+512*1024)); buf=await file.slice(0,cap).arrayBuffer(); v=new DataView(buf);
    }
    const bytes=new Uint8Array(buf,p,n); p+=n; let name=''; for(const b of bytes) name+=String.fromCharCode(b);
    const off=u32(v,p),size=u32(v,p+4);p+=8;entries.push({name,upper:name.toUpperCase(),off,size});
  }
  const out={id,num,headSize:p,entries}; pakCache.set(file,out); return out;
}
async function resourceFromPak(file,match){
  const idx=await pakIndex(file), needle=String(match).replace(/\//g,'\\').toUpperCase();
  const e=idx.entries.find(x=>x.upper.endsWith(needle)); if(!e) throw new Error(match+' не найден в PAK');
  const start=idx.headSize+e.off;
  if(e.size<12) throw new Error('Ресурс '+e.name+' повреждён');
  return new Uint8Array(await file.slice(start+4,start+e.size-8).arrayBuffer());
}
async function resourceByBasenameFromPak(file,name){
  const idx=await pakIndex(file),raw=String(name||'').replace(/\\/g,'/').split('/').pop().toUpperCase();
  const candidates=[raw,raw.endsWith('.DFF')?raw:raw+'.DFF'];
  const e=idx.entries.find(x=>candidates.some(n=>x.upper.replace(/\\/g,'/').split('/').pop()===n));
  if(!e)throw new Error((name||'DFF')+' не найден в PAK');
  const start=idx.headSize+e.off;if(e.size<12)throw new Error('Ресурс '+e.name+' повреждён');
  return {bytes:new Uint8Array(await file.slice(start+4,start+e.size-8).arrayBuffer()),entry:e};
}
async function textureByBasenameFromPak(file,name){
  const idx=await pakIndex(file),raw=String(name||'').replace(/\\/g,'/').split('/').pop(),base=raw.replace(/\.(?:bmp|tga|png|jpg|jpeg)$/i,'').toUpperCase();
  const exts=['.BMP','.TGA','.PNG','.JPG','.JPEG'];
  const entries=idx.entries.filter(x=>{const b=x.upper.replace(/\\/g,'/').split('/').pop();return exts.some(ext=>b===base+ext)});
  if(!entries.length)throw new Error((name||'texture')+' не найдена в PAK');
  entries.sort((a,b)=>{const score=e=>/\\TEXTURES\\(?:ACTORS|CHARACTERS|NPC|MODELS)\\/i.test(e.name)?0:/\\TEXTURES\\/i.test(e.name)?1:2;return score(a)-score(b)});
  const e=entries[0],start=idx.headSize+e.off;if(e.size<12)throw new Error('Ресурс '+e.name+' повреждён');
  const ext=e.upper.replace(/^.*(\.[A-Z0-9]+)$/,'$1').toLowerCase();
  return {bytes:new Uint8Array(await file.slice(start+4,start+e.size-8).arrayBuffer()),entry:e,ext};
}
function asciiStrings(bytes,min=3){const out=[];let s='';for(const b of bytes){if(b>=32&&b<127)s+=String.fromCharCode(b);else{if(s.length>=min)out.push(s);s=''}}if(s.length>=min)out.push(s);return out}
async function dffFromAppearanceCode(file,code){
  code=String(code||'').trim();if(!code)throw new Error('В профиле нет команды C.<model>');
  try{const r=await resourceByBasenameFromPak(file,code+'.DFF');return {...r,source:'direct '+code+'.DFF'}}catch(_){}
  let aed=null;try{aed=await resourceByBasenameFromPak(file,code+'.AED')}catch(_){}
  if(aed){const strings=asciiStrings(aed.bytes,3),cand=[];for(const x of strings){for(const m of x.matchAll(/([A-Za-z0-9_\-]+)\.DFF/gi))cand.push(m[1]+'.DFF');if(/^[A-Za-z][A-Za-z0-9_\-]{3,20}$/.test(x))cand.push(x+'.DFF')}for(const c of [...new Set(cand)]){try{const r=await resourceByBasenameFromPak(file,c);return {...r,source:`${code}.AED → ${c}`}}catch(_){}}}
  throw new Error(`не найден DFF для C.${code}${aed?' (AED найден, но DFF-ссылка не распознана)':''}`);
}
function parseDFF(bytes){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),geos=[];
  function tryGeo(o){
    if(o+24>v.byteLength||u32(v,o)!==0x0f)return null;const end=o+12+u32(v,o+4);if(end>v.byteLength)return null;const st=header(v,o+12);if(!st||st.type!==1||st.end>end||st.size<28)return null;let p=st.start;
    const flags=u32(v,p),triCount=u32(v,p+4),vertCount=u32(v,p+8),morphCount=u32(v,p+12);p+=16;
    if(!vertCount||vertCount>200000||triCount>400000||!morphCount)return null;
    if(p+12>st.end)return null;p+=12; // RW 3.11 surface properties
    if(flags&0x08)p+=vertCount*4; // prelight
    let uv=null;
    if(flags&0x04){if(p+vertCount*8>st.end)return null;uv=new Array(vertCount);for(let i=0;i<vertCount;i++,p+=8)uv[i]=[f32(v,p),f32(v,p+4)];}
    else if(flags&0x80){if(p+vertCount*16>st.end)return null;uv=new Array(vertCount);for(let i=0;i<vertCount;i++,p+=8)uv[i]=[f32(v,p),f32(v,p+4)];p+=vertCount*8;}
    if(p+triCount*8>st.end)return null;const tris=[];for(let i=0;i<triCount;i++,p+=8)tris.push([u16(v,p+2),u16(v,p),u16(v,p+6),u16(v,p+4)]);
    if(p+24>st.end)return null;p+=16;const hasVerts=u32(v,p),hasNormals=u32(v,p+4);p+=8;if(!hasVerts||p+vertCount*12>st.end)return null;
    const verts=new Array(vertCount);for(let i=0;i<vertCount;i++,p+=12)verts[i]=[f32(v,p),f32(v,p+4),f32(v,p+8)];
    const local=bytes.subarray(o,end),materials=parseMaterials(local);
    return {verts,tris,flags,uv,materials};
  }
  for(let o=0;o+24<=v.byteLength;o+=4){const g=tryGeo(o);if(g){geos.push(g);o+=8;}}
  if(!geos.length)throw new Error('Geometry chunk в DFF не найден');
  const pos=[],cols=[],uvs=[],groups=[],materials=[],bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};let start=0,materialBase=0;
  for(const g of geos){
    const byMat=new Map();const bucket=id=>{if(!byMat.has(id))byMat.set(id,{positions:[],colors:[],uvs:[]});return byMat.get(id)};
    for(const t of g.tris){const matId=t[3]||0,b=bucket(matId);for(const ix of t.slice(0,3)){if(ix>=g.verts.length)continue;const q=g.verts[ix];b.positions.push(...q);const tx=g.uv&&g.uv[ix]?g.uv[ix]:[0,0];b.uvs.push(...tx);const sh=.72+Math.max(-.12,Math.min(.12,q[1]*.01));b.colors.push(sh,sh,sh);for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],q[k]);bounds.max[k]=Math.max(bounds.max[k],q[k])}}}
    for(const [matId,b] of [...byMat.entries()].sort((a,b)=>a[0]-b[0])){const count=b.positions.length/3;if(!count)continue;pos.push(...b.positions);cols.push(...b.colors);uvs.push(...b.uvs);const m=g.materials[matId]||{colorFile:'',maskFile:''};groups.push({materialId:materialBase+matId,start,count,texture:m.colorFile||''});start+=count;}
    for(const m of g.materials)materials.push({...m,id:materialBase+m.id});materialBase+=Math.max(1,g.materials.length);
  }
  if(!pos.length)throw new Error('В DFF нет треугольников');
  return{positions:new Float32Array(pos),colors:new Float32Array(cols),uvs:new Float32Array(uvs),groups,materials,bounds,sectors:geos.length,tris:pos.length/9};
}
async function bspFromPak(file,sceneName){
  const raw=String(sceneName||'').replace(/\\/g,'/').split('/').pop(),base=raw.replace(/\.(?:scn|bsp)$/i,'');
  return resourceFromPak(file,'\\WORLDS\\'+base+'.BSP');
}
function header(v,o){if(o+12>v.byteLength)return null;return{type:u32(v,o),size:u32(v,o+4),version:u32(v,o+8),start:o+12,end:o+12+u32(v,o+4)}}
function readCString(bytes){let s='';for(const b of bytes){if(!b)break;s+=String.fromCharCode(b)}return s}
function parseMaterials(bytes){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),root=header(v,0); if(!root)return[];
  let o=root.start,mat=null;
  while(o+12<=root.end&&o+12<=v.byteLength){const h=header(v,o);if(!h||h.end>v.byteLength)break;if(h.type===8){mat=h;break}o=h.end}
  if(!mat)return[];
  let p=mat.start,st=header(v,p);if(!st||st.type!==1)return[];const count=u32(v,st.start);p=st.end;const out=[];
  for(let i=0;i<count&&p+12<=mat.end;i++){
    const mh=header(v,p);if(!mh||mh.type!==7||mh.end>v.byteLength)break;let q=mh.start,colorFile='',maskFile='';
    while(q+12<=mh.end){const ch=header(v,q);if(!ch||ch.end>mh.end)break;if(ch.type===6){let t=ch.start;const ts=header(v,t);if(ts)t=ts.end;const s1=header(v,t);if(s1&&s1.type===2){colorFile=readCString(bytes.subarray(s1.start,s1.end));t=s1.end;const s2=header(v,t);if(s2&&s2.type===2)maskFile=readCString(bytes.subarray(s2.start,s2.end));}break}q=ch.end}
    out.push({id:i,colorFile,maskFile});p=mh.end;
  }
  return out;
}
function parseBSP(bytes){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength); if(v.byteLength<80||u32(v,0)!==0x0b) throw new Error('Это не RenderWare BSP'); const rwVersion=u32(v,8);
  const worldStruct=12;if(u32(v,worldStruct)!==1)throw new Error('Не найден WORLD STRUCT');const d=worldStruct+12;
  const triTotal=u32(v,d+28),vertTotal=u32(v,d+32),worldSectors=u32(v,d+40),flags=u32(v,d+48);
  const hasNormals=!!(flags&0x10),hasPrelit=!!(flags&0x08),hasTex=!!(flags&0x04),hasTex2=!!(flags&0x80),materials=parseMaterials(bytes);
  const byMat=new Map();let sectors=0,tris=0;const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  function bucket(id){if(!byMat.has(id))byMat.set(id,{positions:[],colors:[],uvs:[]});return byMat.get(id)}
  for(let o=0;o+24<v.byteLength;o+=4){
    if(u32(v,o)!==9||u32(v,o+8)!==rwVersion)continue;if(u32(v,o+12)!==1||u32(v,o+20)!==rwVersion)continue;
    let p=o+24;const materialBase=u32(v,p),tc=u32(v,p+4),vc=u32(v,p+8);p+=44;if(vc>100000||tc>100000||p+vc*12>v.byteLength)continue;
    const verts=new Array(vc);for(let i=0;i<vc;i++){const a=[f32(v,p),f32(v,p+4),f32(v,p+8)];p+=12;verts[i]=a;for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],a[k]);bounds.max[k]=Math.max(bounds.max[k],a[k]);}}
    if(hasNormals)p+=vc*4;
    let colors=null;if(hasPrelit){colors=new Array(vc);for(let i=0;i<vc;i++){colors[i]=[v.getUint8(p)/255,v.getUint8(p+1)/255,v.getUint8(p+2)/255];p+=4;}}
    let uv=null;if(hasTex){uv=new Array(vc);for(let i=0;i<vc;i++){uv[i]=[f32(v,p),f32(v,p+4)];p+=8}}else if(hasTex2){uv=new Array(vc);for(let i=0;i<vc;i++){uv[i]=[f32(v,p),f32(v,p+4)];p+=8}p+=vc*8}
    if(p+tc*8>v.byteLength)continue;
    for(let i=0;i<tc;i++){
      const m=u16(v,p),a=u16(v,p+2),b=u16(v,p+4),c=u16(v,p+6);p+=8;const matId=materialBase+m,g=bucket(matId);
      for(const ix of[a,b,c]){if(ix>=vc)continue;g.positions.push(...verts[ix]);if(colors)g.colors.push(...colors[ix]);else{const y=verts[ix][1];g.colors.push(.62+.08*Math.sin(y),.66+.06*Math.sin(y),.68+.05*Math.sin(y));}if(uv&&uv[ix])g.uvs.push(...uv[ix]);else g.uvs.push(0,0)}tris++;
    }sectors++;
  }
  const pos=[],cols=[],uvs=[],groups=[];let first=0;
  for(const [materialId,g] of [...byMat.entries()].sort((a,b)=>a[0]-b[0])){const count=g.positions.length/3;pos.push(...g.positions);cols.push(...g.colors);uvs.push(...g.uvs);groups.push({materialId,start:first,count,texture:materials[materialId]?.colorFile||''});first+=count}
  if(!pos.length)throw new Error('Геометрия BSP не найдена');
  return{positions:new Float32Array(pos),colors:new Float32Array(cols),uvs:new Float32Array(uvs),groups,materials,bounds,sectors,tris,triTotal,vertTotal,worldSectors,flags};
}
function matPerspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
function norm(a){const l=Math.hypot(...a)||1;return a.map(x=>x/l)}function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function matLook(eye,center,up){const z=norm(eye.map((x,i)=>x-center[i])),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function transform(m,p){const x=p[0],y=p[1],z=p[2],w=m[3]*x+m[7]*y+m[11]*z+m[15];return[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w,w]}
function inv4(a){const o=new Float32Array(16),b00=a[0]*a[5]-a[1]*a[4],b01=a[0]*a[6]-a[2]*a[4],b02=a[0]*a[7]-a[3]*a[4],b03=a[1]*a[6]-a[2]*a[5],b04=a[1]*a[7]-a[3]*a[5],b05=a[2]*a[7]-a[3]*a[6],b06=a[8]*a[13]-a[9]*a[12],b07=a[8]*a[14]-a[10]*a[12],b08=a[8]*a[15]-a[11]*a[12],b09=a[9]*a[14]-a[10]*a[13],b10=a[9]*a[15]-a[11]*a[13],b11=a[10]*a[15]-a[11]*a[14];let d=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!d)return null;d=1/d;o[0]=(a[5]*b11-a[6]*b10+a[7]*b09)*d;o[1]=(-a[1]*b11+a[2]*b10-a[3]*b09)*d;o[2]=(a[13]*b05-a[14]*b04+a[15]*b03)*d;o[3]=(-a[9]*b05+a[10]*b04-a[11]*b03)*d;o[4]=(-a[4]*b11+a[6]*b08-a[7]*b07)*d;o[5]=(a[0]*b11-a[2]*b08+a[3]*b07)*d;o[6]=(-a[12]*b05+a[14]*b02-a[15]*b01)*d;o[7]=(a[8]*b05-a[10]*b02+a[11]*b01)*d;o[8]=(a[4]*b10-a[5]*b08+a[7]*b06)*d;o[9]=(-a[0]*b10+a[1]*b08-a[3]*b06)*d;o[10]=(a[12]*b04-a[13]*b02+a[15]*b00)*d;o[11]=(-a[8]*b04+a[9]*b02-a[11]*b00)*d;o[12]=(-a[4]*b09+a[5]*b07-a[6]*b06)*d;o[13]=(a[0]*b09-a[1]*b07+a[2]*b06)*d;o[14]=(-a[12]*b03+a[13]*b01-a[14]*b00)*d;o[15]=(a[8]*b03-a[9]*b01+a[10]*b00)*d;return o}
function unproject(inv,x,y,z){const w=inv[3]*x+inv[7]*y+inv[11]*z+inv[15];return[(inv[0]*x+inv[4]*y+inv[8]*z+inv[12])/w,(inv[1]*x+inv[5]*y+inv[9]*z+inv[13])/w,(inv[2]*x+inv[6]*y+inv[10]*z+inv[14])/w]}
function rayTri(ro,rd,a,b,c){const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],h=cross(rd,e2),det=dot(e1,h);if(Math.abs(det)<1e-7)return null;const f=1/det,s=[ro[0]-a[0],ro[1]-a[1],ro[2]-a[2]],u=f*dot(s,h);if(u<0||u>1)return null;const q=cross(s,e1),vv=f*dot(rd,q);if(vv<0||u+vv>1)return null;const t=f*dot(e2,q);return t>1e-5?t:null}
async function decodeImage(bytes,ext='.bmp'){
  const mime=ext==='.png'?'image/png':ext==='.jpg'||ext==='.jpeg'?'image/jpeg':ext==='.tga'?'image/x-tga':'image/bmp',blob=new Blob([bytes],{type:mime});
  if(global.createImageBitmap){try{return await createImageBitmap(blob)}catch(_){}}
  return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),im=new Image();im.onload=()=>{URL.revokeObjectURL(url);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Браузер не смог декодировать '+ext.toUpperCase()))};im.src=url});
}
class Viewer{
  constructor(world,overlay){this.c=world;this.o=overlay;this.gl=world.getContext('webgl',{antialias:true});this.geo=null;this.yaw=.7;this.pitch=.55;this.dist=140;this.center=[0,0,0];this.points=[];this.selected=null;this.drag=false;this.pointDrag=null;this.onPointDrag=null;this.textures=new Map();this.textureStats={loaded:0,total:0};this.init()}
  init(){const gl=this.gl;if(!gl)return;const vs=`attribute vec3 p;attribute vec3 c;attribute vec2 uv;uniform mat4 m;varying vec3 vc;varying vec2 vuv;void main(){vc=c;vuv=uv;gl_Position=m*vec4(p,1.0);}`;const fs=`precision mediump float;varying vec3 vc;varying vec2 vuv;uniform sampler2D tex;uniform float useTex;void main(){vec3 base=vc;if(useTex>0.5){vec3 t=texture2D(tex,vuv).rgb;base=t*(0.55+0.65*vc);}gl_FragColor=vec4(base,1.0);}`;const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x};this.prog=gl.createProgram();gl.attachShader(this.prog,sh(gl.VERTEX_SHADER,vs));gl.attachShader(this.prog,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(this.prog);this.bp=gl.createBuffer();this.bc=gl.createBuffer();this.bt=gl.createBuffer();this.o.tabIndex=0;this.o.setAttribute('aria-label','3D-карта. Стрелки перемещают камеру; Num 7/9 вращают; Num 8/2 поднимают и опускают');
    this.o.addEventListener('pointerdown',e=>{this.o.focus({preventScroll:true});const r=this.o.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,p=this.onPointDrag?this.pick(x,y):null;if(p){this.pointDrag={p,pointerId:e.pointerId,moved:false};this.drag=false;this.dragMoved=false;this.o.setPointerCapture(e.pointerId);if(this.onPointDrag)this.onPointDrag('start',p,null);e.preventDefault();return}this.drag=true;this.dragMoved=false;this.px=e.clientX;this.py=e.clientY;this.o.setPointerCapture(e.pointerId)});
    this.o.addEventListener('pointermove',e=>{if(this.pointDrag){const r=this.o.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,hit=this.pickWorld(x,y);if(hit&&this.onPointDrag){this.dragMoved=true;this.pointDrag.moved=true;this.onPointDrag('move',this.pointDrag.p,hit);this.draw()}e.preventDefault();return}if(!this.drag)return;const mx=e.clientX-this.px,my=e.clientY-this.py;if(Math.abs(mx)+Math.abs(my)>2)this.dragMoved=true;this.yaw-=mx*.008;this.pitch=Math.max(-1.35,Math.min(1.35,this.pitch+my*.008));this.px=e.clientX;this.py=e.clientY;this.draw()});
    this.o.addEventListener('pointerup',e=>{if(this.pointDrag){const pd=this.pointDrag;this.pointDrag=null;this.suppressClickUntil=performance.now()+180;if(this.onPointDrag)this.onPointDrag(pd.moved?'end':'cancel',pd.p,null);e.preventDefault();return}if(this.dragMoved)this.suppressClickUntil=performance.now()+120;this.drag=false});
    this.o.addEventListener('wheel',e=>{e.preventDefault();this.dist=Math.max(5,this.dist*Math.exp(e.deltaY*.001));this.draw()},{passive:false});
    this.o.addEventListener('keydown',e=>{if(!this.geo)return;const nav=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'],num=['Numpad7','Numpad9','Numpad8','Numpad2'];if(!nav.includes(e.key)&&!num.includes(e.code))return;e.preventDefault();const b=this.geo.bounds,span=Math.max(...b.max.map((x,i)=>x-b.min[i])),step=Math.max(.35,Math.min(8,span*.025))*(e.shiftKey?3:1);if(e.code==='Numpad7'){this.yaw-=.12*(e.shiftKey?2:1);this.draw();return}if(e.code==='Numpad9'){this.yaw+=.12*(e.shiftKey?2:1);this.draw();return}if(e.code==='Numpad8'){this.center[1]+=step;this.draw();return}if(e.code==='Numpad2'){this.center[1]-=step;this.draw();return}const forward=[-Math.sin(this.yaw),0,-Math.cos(this.yaw)],right=[Math.cos(this.yaw),0,-Math.sin(this.yaw)];let d=[0,0,0];if(e.key==='ArrowUp')d=forward;if(e.key==='ArrowDown')d=forward.map(x=>-x);if(e.key==='ArrowRight')d=right;if(e.key==='ArrowLeft')d=right.map(x=>-x);this.center[0]+=d[0]*step;this.center[2]+=d[2]*step;this.draw()});
  }
  setGeometry(g){this.geo=g;this.textures.clear();this.textureStats={loaded:0,total:new Set(g.groups.map(x=>x.texture).filter(Boolean)).size};const b=g.bounds;this.center=b.min.map((x,i)=>(x+b.max[i])/2);const span=Math.max(...b.max.map((x,i)=>x-b.min[i]));this.dist=Math.max(20,span*1.25);const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.bp);gl.bufferData(gl.ARRAY_BUFFER,g.positions,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,this.bc);gl.bufferData(gl.ARRAY_BUFFER,g.colors,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,this.bt);gl.bufferData(gl.ARRAY_BUFFER,g.uvs,gl.STATIC_DRAW);this.draw()}
  async loadTexturesFromPak(file){if(!this.geo||!file)return{loaded:0,total:0};const names=[...new Set(this.geo.groups.map(x=>x.texture).filter(Boolean))];let loaded=0;for(const name of names){try{let r;try{r=await textureByBasenameFromPak(file,name)}catch(_){const bytes=await resourceFromPak(file,'\\TEXTURES\\WORLDS\\'+String(name).replace(/\.(?:bmp|tga|png|jpg|jpeg)$/i,'')+'.BMP');r={bytes,ext:'.bmp'}}const img=await decodeImage(r.bytes,r.ext),gl=this.gl,tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);this.textures.set(name.toLowerCase(),tex);loaded++;if(img.close)img.close()}catch(e){console.warn('Texture',name,e)}}this.textureStats={loaded,total:names.length};this.draw();return this.textureStats}
  setPoints(points,selected){this.points=points||[];this.selected=selected;this.draw()}
  reset(){if(!this.geo)return;const b=this.geo.bounds;this.center=b.min.map((x,i)=>(x+b.max[i])/2);const span=Math.max(...b.max.map((x,i)=>x-b.min[i]));this.dist=Math.max(20,span*1.25);this.yaw=.7;this.pitch=.55;this.draw()}
  resize(){const r=this.c.getBoundingClientRect(),d=devicePixelRatio||1;for(const c of[this.c,this.o]){c.width=Math.max(2,Math.round(r.width*d));c.height=Math.max(2,Math.round(r.height*d))}this.draw()}
  draw(){const gl=this.gl;if(!gl)return;const r=this.c.getBoundingClientRect(),d=devicePixelRatio||1;if(this.c.width!==Math.round(r.width*d))this.resize();gl.viewport(0,0,this.c.width,this.c.height);gl.clearColor(.055,.075,.095,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);if(!this.geo)return;const cp=Math.cos(this.pitch),eye=[this.center[0]+this.dist*cp*Math.sin(this.yaw),this.center[1]+this.dist*Math.sin(this.pitch),this.center[2]+this.dist*cp*Math.cos(this.yaw)],m=mul(matPerspective(Math.PI/3,r.width/r.height,.1,5000),matLook(eye,this.center,[0,1,0]));this.mvp=m;gl.useProgram(this.prog);const ap=gl.getAttribLocation(this.prog,'p'),ac=gl.getAttribLocation(this.prog,'c'),au=gl.getAttribLocation(this.prog,'uv');gl.bindBuffer(gl.ARRAY_BUFFER,this.bp);gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,this.bc);gl.enableVertexAttribArray(ac);gl.vertexAttribPointer(ac,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,this.bt);gl.enableVertexAttribArray(au);gl.vertexAttribPointer(au,2,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(gl.getUniformLocation(this.prog,'m'),false,m);gl.activeTexture(gl.TEXTURE0);gl.uniform1i(gl.getUniformLocation(this.prog,'tex'),0);const use=gl.getUniformLocation(this.prog,'useTex');for(const g of this.geo.groups){const tex=g.texture&&this.textures.get(g.texture.toLowerCase());if(tex){gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(use,1)}else gl.uniform1f(use,0);gl.drawArrays(gl.TRIANGLES,g.start,g.count)}this.drawOverlay()}
  projectWorld(p){const q=transform(this.mvp,p);if(!Number.isFinite(q[0])||q[3]<=0)return null;const r=this.o.getBoundingClientRect();return{x:(q[0]*.5+.5)*r.width,y:(-q[1]*.5+.5)*r.height,z:q[2]}}
  drawWildZones(ctx){const wilds=this.points.filter(p=>p.kind==='wild'&&Number(p.radius)>0);for(const p of wilds){const selected=this.selected&&p.trigger&&this.selected?.trigger?.idx===p.trigger.idx,radius=Math.max(0,Number(p.radius)||0),samples=64,pts=[];for(let i=0;i<=samples;i++){const a=i/samples*Math.PI*2,q=this.projectWorld([p.position.x+Math.cos(a)*radius,p.position.y+.15,p.position.z+Math.sin(a)*radius]);if(q&&q.z>-1.2&&q.z<1.2)pts.push(q)}if(pts.length<3)continue;ctx.save();ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fillStyle=selected?'rgba(255,209,102,.16)':'rgba(255,107,181,.10)';ctx.fill();ctx.setLineDash(selected?[]:[6,4]);ctx.strokeStyle=selected?'#ffd166':'#ff6bb5';ctx.lineWidth=selected?3:2;ctx.stroke();ctx.restore()}}

  drawNpcAggroZones(ctx){const npcs=this.points.filter(p=>p.kind==='npc'&&Number(p.attackRadius)>0);for(const p of npcs){const selected=this.selected&&p.trigger&&this.selected?.trigger?.idx===p.trigger.idx,radius=Math.max(0,Number(p.attackRadius)||0),samples=64,pts=[];for(let i=0;i<=samples;i++){const a=i/samples*Math.PI*2,q=this.projectWorld([p.position.x+Math.cos(a)*radius,p.position.y+.12,p.position.z+Math.sin(a)*radius]);if(q&&q.z>-1.2&&q.z<1.2)pts.push(q)}if(pts.length<3)continue;ctx.save();ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fillStyle=selected?'rgba(255,209,102,.12)':'rgba(77,182,255,.08)';ctx.fill();ctx.setLineDash(selected?[]:[5,5]);ctx.strokeStyle=selected?'#ffd166':'#4db6ff';ctx.lineWidth=selected?3:2;ctx.stroke();ctx.restore()}}
  drawNpcFigure(ctx,p,sel){const base=[p.position.x,p.position.y,p.position.z],dir=p.trigger?.v||{x:0,y:0,z:1};const len=Math.hypot(dir.x||0,dir.z||0)||1,fx=(dir.x||0)/len,fz=(dir.z||1)/len,rx=-fz,rz=fx;const P=(x,y,z)=>this.projectWorld([base[0]+x,base[1]+y,base[2]+z]),feet=P(0,.05,0),hips=P(0,.85,0),chest=P(0,1.45,0),head=P(0,1.92,0),ls=P(rx*.38,1.42,rz*.38),rs=P(-rx*.38,1.42,-rz*.38),lf=P(rx*.18,.05,rz*.18),rf=P(-rx*.18,.05,-rz*.18),front=P(fx*.65,.08,fz*.65);if(!feet||!head)return null;ctx.save();ctx.strokeStyle=sel?'#ffd166':'#4db6ff';ctx.fillStyle=sel?'rgba(255,209,102,.18)':'rgba(77,182,255,.14)';ctx.lineWidth=sel?3:2;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(head.x,head.y);ctx.lineTo(chest.x,chest.y);ctx.lineTo(hips.x,hips.y);ctx.lineTo(lf.x,lf.y);ctx.moveTo(hips.x,hips.y);ctx.lineTo(rf.x,rf.y);ctx.moveTo(ls.x,ls.y);ctx.lineTo(chest.x,chest.y);ctx.lineTo(rs.x,rs.y);ctx.stroke();const rr=Math.max(4,Math.min(9,Math.hypot(head.x-chest.x,head.y-chest.y)*.32));ctx.beginPath();ctx.arc(head.x,head.y,rr,0,Math.PI*2);ctx.fill();ctx.stroke();if(front){ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(feet.x,feet.y);ctx.lineTo(front.x,front.y);ctx.stroke();ctx.setLineDash([])}ctx.restore();return {x:head.x,y:head.y};}
  drawOverlay(){const ctx=this.o.getContext('2d'),r=this.o.getBoundingClientRect(),d=devicePixelRatio||1;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);this.screenPoints=[];this.drawWildZones(ctx);this.drawNpcAggroZones(ctx);for(const p of this.points){const sel=this.selected&&((p.key&&this.selected.key===p.key)||(p.trigger&&this.selected.trigger&&this.selected.trigger.idx===p.trigger.idx));if(p.kind==='npc'){const a=this.drawNpcFigure(ctx,p,sel);if(!a)continue;ctx.font='12px Segoe UI';ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.strokeText(p.name,a.x+10,a.y+4);ctx.fillText(p.name,a.x+10,a.y+4);this.screenPoints.push({p,x:a.x,y:a.y});continue}const lift=p.kind==='item'?.45:1.5,q=this.projectWorld([p.position.x,p.position.y+lift,p.position.z]);if(!q||q.z<-1||q.z>1)continue;const x=q.x,y=q.y;ctx.beginPath();if(p.kind==='item'){const sz=sel?9:7;ctx.rect(x-sz/2,y-sz/2,sz,sz)}else ctx.arc(x,y,sel?10:8,0,Math.PI*2);if(p.kind==='wild'){ctx.strokeStyle=sel?'#ffd166':'#ff6bb5';ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fillStyle=sel?'#ffd166':'#ff6bb5';ctx.fill()}else{ctx.fillStyle=sel?'#ffd166':'#7fe0a3';ctx.fill();ctx.strokeStyle='#071019';ctx.lineWidth=2;ctx.stroke()}ctx.font='12px Segoe UI';ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.strokeText(p.name,x+10,y+4);ctx.fillText(p.name,x+10,y+4);this.screenPoints.push({p,x,y})}}
  pick(x,y){let best=null,bd=18;for(const q of this.screenPoints||[]){const d=Math.hypot(q.x-x,q.y-y);if(d<bd){bd=d;best=q.p}}return best}
  terrainHeightAt(x,z,referenceY=null){if(!this.geo)return null;const p=this.geo.positions,cands=[];for(let i=0;i<p.length;i+=9){const ax=p[i],ay=p[i+1],az=p[i+2],bx=p[i+3],by=p[i+4],bz=p[i+5],cx=p[i+6],cy=p[i+7],cz=p[i+8],den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(den)<1e-8)continue;const l1=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/den,l2=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/den,l3=1-l1-l2;if(l1>=-1e-5&&l2>=-1e-5&&l3>=-1e-5)cands.push(l1*ay+l2*by+l3*cy)}if(!cands.length)return null;if(Number.isFinite(referenceY)){let best=cands[0],bd=Math.abs(best-referenceY);for(const y of cands){const d=Math.abs(y-referenceY);if(d<bd){bd=d;best=y}}return best}return Math.max(...cands)}
  pickWorld(x,y){if(!this.geo||!this.mvp)return null;const r=this.o.getBoundingClientRect(),nx=x/r.width*2-1,ny=1-y/r.height*2,iv=inv4(this.mvp);if(!iv)return null;const ro=unproject(iv,nx,ny,-1),far=unproject(iv,nx,ny,1),rd=norm([far[0]-ro[0],far[1]-ro[1],far[2]-ro[2]]),p=this.geo.positions;let best=Infinity,hit=null;for(let i=0;i<p.length;i+=9){const a=[p[i],p[i+1],p[i+2]],b=[p[i+3],p[i+4],p[i+5]],c=[p[i+6],p[i+7],p[i+8]],t=rayTri(ro,rd,a,b,c);if(t!==null&&t<best){best=t;hit={x:ro[0]+rd[0]*t,y:ro[1]+rd[1]*t,z:ro[2]+rd[2]*t}}}return hit}
}
global.ZBSP={pakIndex,resourceFromPak,resourceByBasenameFromPak,textureByBasenameFromPak,dffFromAppearanceCode,bspFromPak,parseBSP,parseDFF,Viewer};
})(window);
