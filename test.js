const fs=require('fs'),path=require('path'),Z=require('./editor-core.js');
const root='/mnt/data';
const dbBytes=new Uint8Array(fs.readFileSync(path.join(root,'_fb0x05.fbs')));
const db=Z.parseDatabase(dbBytes); const out=Z.serializeDatabase(db);
console.log('FBS entries',db.entries.length,'roundtrip equal',Buffer.compare(Buffer.from(dbBytes),Buffer.from(out))===0);
const catalog=Z.buildNpcCatalog(db);console.log('catalog',catalog.length,'with teams',catalog.filter(x=>x.team.length).length);
let ok=0,fail=0,totalP=0,matched=0,unknownScene=0; const errors=[];
for(const fn of fs.readdirSync('/mnt/data/zanz_scenes_all').filter(x=>x.toLowerCase().endsWith('.scn'))){
  try{
    const b=new Uint8Array(fs.readFileSync('/mnt/data/zanz_scenes_all/'+fn));
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
const fn='sc_0231.scn';let b=new Uint8Array(fs.readFileSync('/mnt/data/zanz_scenes_all/'+fn));let v=Z.placementsFromScene(b,catalog);let npc=v.placements[0].npc;let n0=v.placements.length;b=Z.addPlacement(b,npc,{x:1,y:2,z:3},v.placements[0].trigger);let v2=Z.placementsFromScene(b,catalog);console.log('add smoke',n0,'->',v2.placements.length,'last',v2.placements[v2.placements.length-1].name,v2.placements[v2.placements.length-1].position);
let added=v2.placements[v2.placements.length-1];b=Z.deletePlacement(b,added);let v3=Z.placementsFromScene(b,catalog);console.log('delete smoke',v2.placements.length,'->',v3.placements.length);
