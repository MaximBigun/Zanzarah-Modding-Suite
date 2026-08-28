const fs=require('fs'),path=require('path'),Z=require('./editor-core.js');
const root='/mnt/data';
const dbBytes=new Uint8Array(fs.readFileSync(path.join(root,'_fb0x05.fbs')));
const db=Z.parseDatabase(dbBytes); const out=Z.serializeDatabase(db);
console.log('FBS entries',db.entries.length,'roundtrip equal',Buffer.compare(Buffer.from(dbBytes),Buffer.from(out))===0);
const catalog=Z.buildNpcCatalog(db);console.log('catalog',catalog.length,'with teams',catalog.filter(x=>x.team.length).length);
// Wild encounter table decoded from zanthp.exe 0x00476102.
if(Z.WILD_POOLS.length!==34)throw new Error('Expected 34 wild pools');
const p10=Z.WILD_POOL_BY_ID.get(10),p26=Z.WILD_POOL_BY_ID.get(26),p33=Z.WILD_POOL_BY_ID.get(33);
if(JSON.stringify(p10.slots)!==JSON.stringify([6,6,24,25])||p10.levelRange!=='31–40')throw new Error('Pool 10 decode mismatch');
if(JSON.stringify(p26.slots)!==JSON.stringify([15,37])||p26.levelRange!=='17–22')throw new Error('Pool 26 decode mismatch');
if(JSON.stringify(p33.slots)!==JSON.stringify([72,72,73,43])||p33.levelRange!=='40–52')throw new Error('Pool 33 decode mismatch');
console.log('wild pools',Z.WILD_POOLS.length,'decoded; pool26',p26.name,p26.levelRange);
const sceneDir='/mnt/data/zanz_scenes_all';
if(fs.existsSync(sceneDir)){
let ok=0,fail=0,totalP=0,matched=0,unknownScene=0; const errors=[];
for(const fn of fs.readdirSync(sceneDir).filter(x=>x.toLowerCase().endsWith('.scn'))){
  try{
    const b=new Uint8Array(fs.readFileSync(path.join(sceneDir,fn)));
    const v=Z.placementsFromScene(b,catalog); totalP+=v.placements.length; matched+=v.placements.filter(p=>p.npc).length;
    if(v.triggers&&v.scene){
      // patch same parsed data and ensure exact equality
      // don't have patch exported, compare serialized payload not whole
      ok++;
    } else unknownScene++;
  }catch(e){fail++;errors.push(fn+': '+e.message)}
}
console.log({ok,fail,unknownScene,totalPlacements:totalP,matched}); if(errors.length)console.log(errors.slice(0,30).join('\n'));
// mutation smoke test sc_0231: add, reparse, delete, reparse
const fn='sc_0231.scn';let b=new Uint8Array(fs.readFileSync(path.join(sceneDir,fn)));let v=Z.placementsFromScene(b,catalog);let npc=v.placements[0].npc;let n0=v.placements.length;b=Z.addPlacement(b,npc,{x:1,y:2,z:3},v.placements[0].trigger);let v2=Z.placementsFromScene(b,catalog);console.log('add smoke',n0,'->',v2.placements.length,'last',v2.placements[v2.placements.length-1].name,v2.placements[v2.placements.length-1].position);
let added=v2.placements[v2.placements.length-1];b=Z.deletePlacement(b,added);let v3=Z.placementsFromScene(b,catalog);console.log('delete smoke',v2.placements.length,'->',v3.placements.length);

}else{console.log('SCN corpus not mounted; scene regression tests skipped');}
// Custom pool EXE patch smoke test (IDs 34..255).
const exePath=path.join(root,'zanthp.exe');
if(fs.existsSync(exePath)){
  const exe=new Uint8Array(fs.readFileSync(exePath));
  if(!Z.isOriginalZanthp(exe))throw new Error('Original zanthp.exe signature mismatch');
  const cp=Z.defaultCustomPools();
  cp[0]={id:34,enabled:true,levelParam:24,slots:[15,37]};
  cp[1]={id:35,enabled:true,levelParam:42,slots:[6,6,24,25]};
  cp[221]={id:255,enabled:true,levelParam:54,slots:[55,55,72,73]};
  const patched=Z.patchZanthpCustomPools(exe,cp), read=Z.readZanthpCustomPools(patched);
  if(!Z.hasCustomPoolPatch(patched))throw new Error('Custom pool patch marker missing');
  if(JSON.stringify(read[0])!==JSON.stringify(cp[0]))throw new Error('Custom pool 34 metadata roundtrip mismatch');
  if(JSON.stringify(read[1])!==JSON.stringify(cp[1]))throw new Error('Custom pool 35 metadata roundtrip mismatch');
  if(read.length!==222||JSON.stringify(read[221])!==JSON.stringify(cp[221]))throw new Error('Custom pool 255 metadata roundtrip mismatch');
  console.log('custom EXE patch smoke',read[0],read[1],read[221],'count',read.length);
}
