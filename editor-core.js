(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZEE = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FAIRIES = [
    [0,'Sillia'],[1,'Viteria'],[2,'Boneria'],[3,'Grem'],[4,'Gremor'],[5,'Gremrock'],[6,'Tadana'],[7,'Aquana'],[8,'Oceana'],[9,'Worgot'],[10,'Corgot'],[11,'Symgot'],[12,'Airia'],[13,'Luria'],[14,'Laticia'],[15,'Rasrow'],[16,'Maulrow'],[17,'Psyrow'],[18,'Abery'],[19,'Abnobery'],[20,'Vesbat'],[21,'Stobat'],[22,'Garbat'],[23,'Cera'],[24,'Amnis'],[25,'Ceramnis'],[26,'Blumella'],[27,'Mencre'],[28,'Mensek'],[29,'Violectra'],[30,'Biolectra'],[31,'Pix'],[32,'Ferix'],[33,'Daemonex'],[34,'Feez'],[35,'Greez'],[36,'Greezloc'],[37,'Skelbo'],[38,'Skeljaw'],[39,'Skelrath'],[40,'Sirael'],[41,'Gorael'],[42,'Fathrael'],[43,'Darbue'],[44,'Bue'],[45,'Lighbue'],[46,'Beltaur'],[47,'Mentaur'],[48,'Clum'],[49,'Clumour'],[50,'Pfoe'],[51,'Taze'],[52,'Glacess'],[53,'Akritar'],[54,'Sirella'],[55,'Dracwin'],[56,'Flagwin'],[57,'Tinefol'],[58,'Tinerog'],[59,'Tinezard'],[60,'Tineves'],[61,'Fygaery'],[62,'JumJum'],[63,'JumRock'],[64,'Goop'],[65,'Minari'],[66,'Megari'],[67,'Gigarex'],[68,'Segbuzz'],[69,'Manox'],[70,'Turnox'],[71,'Dredanox'],[72,'Lighane'],[73,'Driane'],[74,'Suane'],[75,'Lana'],[76,'Liana'],[140,'Guard/assistant (?)'],[141,'Guard/assistant (?)']
  ].map(([id,name]) => ({id,name}));
  const FAIRY_BY_ID = new Map(FAIRIES.map(x => [x.id,x]));

  class Reader {
    constructor(bytes, offset=0) { this.b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); this.o = offset; this.dv = new DataView(this.b.buffer, this.b.byteOffset, this.b.byteLength); }
    u8(){ const v=this.dv.getUint8(this.o); this.o+=1; return v; }
    u32(){ const v=this.dv.getUint32(this.o,true); this.o+=4; return v; }
    i32(){ const v=this.dv.getInt32(this.o,true); this.o+=4; return v; }
    f32(){ const v=this.dv.getFloat32(this.o,true); this.o+=4; return v; }
    bytes(n){ const v=this.b.slice(this.o,this.o+n); this.o+=n; return v; }
    zstrRaw(){ const n=this.u32(); return this.bytes(n); }
    zstr(){ const raw=this.zstrRaw(); return new TextDecoder('windows-1251').decode(raw).replace(/\0+$/,''); }
    vec(){ return {x:this.f32(),y:this.f32(),z:this.f32()}; }
  }

  class Writer {
    constructor(){ this.a=[]; }
    u8(v){ this.a.push(v & 255); return this; }
    u32(v){ v=Number(v)>>>0; this.a.push(v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255); return this; }
    i32(v){ return this.u32(v>>>0); }
    f32(v){ const a=new Uint8Array(4); new DataView(a.buffer).setFloat32(0,Number(v),true); return this.raw(a); }
    raw(bytes){ for(const x of bytes) this.a.push(x); return this; }
    ascii(s){ for(let i=0;i<s.length;i++) this.a.push(s.charCodeAt(i)&255); return this; }
    zstr(s){ const a=[]; for(let i=0;i<s.length;i++){ const c=s.charCodeAt(i); if(c>127) throw new Error('Новая строка должна быть ASCII: '+s); a.push(c); } this.u32(a.length); this.raw(a); return this; }
    zstrRaw(raw){ this.u32(raw.length); this.raw(raw); return this; }
    vec(v){ return this.f32(v.x).f32(v.y).f32(v.z); }
    finish(){ return Uint8Array.from(this.a); }
  }

  function concat(...arrays){ let n=arrays.reduce((s,a)=>s+a.length,0), out=new Uint8Array(n), o=0; for(const a of arrays){out.set(a,o);o+=a.length;} return out; }
  function replaceRange(bytes,start,end,repl){ return concat(bytes.slice(0,start),repl,bytes.slice(end)); }
  function asciiBytes(s){ return Uint8Array.from([...s].map(c=>c.charCodeAt(0))); }
  function findSection(bytes, name){
    const s='['+name+']', p=asciiBytes(s), len=s.length;
    for(let i=4;i<=bytes.length-p.length;i++){
      if(bytes[i-4]!== (len&255) || bytes[i-3]!==((len>>>8)&255) || bytes[i-2]!==0 || bytes[i-1]!==0) continue;
      let ok=true; for(let j=0;j<p.length;j++) if(bytes[i+j]!==p[j]){ok=false;break;}
      if(ok) return {markerStart:i-4, dataStart:i+p.length, name:s};
    }
    return null;
  }

  function parseTriggers(bytes){
    const sec=findSection(bytes,'Triggers'); if(!sec) return null;
    const r=new Reader(bytes,sec.dataStart), payloadStart=r.o, count=r.u32(), items=[];
    for(let k=0;k<count;k++){
      const start=r.o, t={};
      t.idx=r.u32(); t.type=r.u32(); t.someFlag=r.u32(); t.v=r.vec(); t.ii=r.u32(); t.ii1=r.u32(); t.ii2=r.u32(); t.ii3=r.u32(); t.ii4=r.u32(); t._sRaw=r.zstrRaw(); t.s=new TextDecoder('windows-1252').decode(t._sRaw).replace(/\0+$/,''); t._sOriginal=t.s;
      if(t.type===0){t.vv=r.vec();t.vv2=r.vec();}
      else if(t.type===1){t.vv=r.vec();t.int=r.f32();}
      else if(t.type===2){t.vv=r.vec();}
      else throw new Error(`Неизвестный тип Trigger ${t.type} в ${k}`);
      t._start=start; t._end=r.o; items.push(t);
    }
    return {sec,payloadStart,payloadEnd:r.o,count,items};
  }
  function serializeTriggers(parsed){
    const w=new Writer().u32(parsed.items.length);
    for(const t of parsed.items){
      w.u32(t.idx).u32(t.type).u32(t.someFlag).vec(t.v).u32(t.ii).u32(t.ii1).u32(t.ii2).u32(t.ii3).u32(t.ii4); if(t._sRaw && t.s===t._sOriginal) w.zstrRaw(t._sRaw); else w.zstr(t.s||'');
      if(t.type===0) w.vec(t.vv).vec(t.vv2); else if(t.type===1) w.vec(t.vv).f32(t.int); else if(t.type===2) w.vec(t.vv);
    }
    return w.finish();
  }
  function parseSceneItems(bytes){
    const sec=findSection(bytes,'Scene'); if(!sec) return null;
    const r=new Reader(bytes,sec.dataStart), payloadStart=r.o, count=r.u32(), items=[];
    for(let k=0;k<count;k++){ const raw=r.zstrRaw(); const str=new TextDecoder('windows-1252').decode(raw).replace(/\0+$/,''); items.push({s:str,_sRaw:raw,_sOriginal:str,i1:r.u32(),i2:r.u32()}); }
    return {sec,payloadStart,payloadEnd:r.o,count,items};
  }
  function serializeSceneItems(parsed){ const w=new Writer().u32(parsed.items.length); for(const i of parsed.items){ if(i._sRaw && i.s===i._sOriginal) w.zstrRaw(i._sRaw); else w.zstr(i.s||''); w.u32(i.i1).u32(i.i2); } return w.finish(); }


  function parseModelsV3(bytes){
    const sec=findSection(bytes,'Models_v3'); if(!sec) return null;
    const r=new Reader(bytes,sec.dataStart), payloadStart=r.o, count=r.u32(), items=[];
    for(let k=0;k<count;k++){
      const m={}; m.idx=r.u32(); m._fileRaw=r.zstrRaw(); m.fileName=new TextDecoder('windows-1252').decode(m._fileRaw).replace(/\0+$/,''); m._fileOriginal=m.fileName;
      m.position=r.vec(); m.rotation=r.vec(); m.scaleX=r.f32(); m.scaleY=r.f32(); m.scaleZ=r.f32(); m.color=r.bytes(4); m.i1=r.u8(); m.i15=r.i32(); m.i2=r.u8(); items.push(m);
    }
    return {sec,payloadStart,payloadEnd:r.o,count,items};
  }
  function serializeModelsV3(parsed){
    const w=new Writer().u32(parsed.items.length);
    for(const m of parsed.items){
      w.u32(m.idx); if(m._fileRaw && m.fileName===m._fileOriginal) w.zstrRaw(m._fileRaw); else w.zstr(m.fileName||'');
      w.vec(m.position).vec(m.rotation).f32(m.scaleX).f32(m.scaleY).f32(m.scaleZ).raw(m.color||Uint8Array.from([255,255,255,255])).u8(m.i1||0).i32(m.i15||0).u8(m.i2||0);
    } return w.finish();
  }
  function parseBehaviours(bytes){
    const sec=findSection(bytes,'Behaviours'); if(!sec) return null; const r=new Reader(bytes,sec.dataStart), payloadStart=r.o, count=r.u32(), items=[];
    for(let k=0;k<count;k++) items.push({type:r.u32(),modelId:r.u32()});
    return {sec,payloadStart,payloadEnd:r.o,count,items};
  }
  function serializeBehaviours(parsed){ const w=new Writer().u32(parsed.items.length); for(const b of parsed.items) w.u32(b.type).u32(b.modelId); return w.finish(); }
  function patchMany(bytes,reps){ reps=reps.filter(Boolean).sort((a,b)=>b.s-a.s); let out=bytes; for(const x of reps) out=replaceRange(out,x.s,x.e,x.b); return out; }
  function patchItemSections(bytes,models,behaviours,scene){
    return patchMany(bytes,[
      models&&{s:models.payloadStart,e:models.payloadEnd,b:serializeModelsV3(models)},
      behaviours&&{s:behaviours.payloadStart,e:behaviours.payloadEnd,b:serializeBehaviours(behaviours)},
      scene&&{s:scene.payloadStart,e:scene.payloadEnd,b:serializeSceneItems(scene)}
    ]);
  }

  const ITEMS = [
    [0,'Малый бальзам'],[1,'Средний бальзам'],[2,'Большой бальзам'],[3,'Лекарственные травы'],[4,'Деньги эльфов'],[5,'Тестовый амулет'],[6,'Кристалл'],[7,'Лекарство'],[10,'Клевер'],[13,'Золотая морковь'],[17,'Серебряный шар'],[18,'Золотой шар'],[19,'Хрустальный шар'],[21,'Ключ от подземелья'],[28,'Руна возврата'],[29,'Руна Сада фей'],[30,'Руна Тиралина'],[31,'Руна Данмора'],[32,'Руна Башни гномов'],[33,'Руна пещер'],[34,'Руна Ледяного мира'],[35,'Руна Царства облаков'],[36,'Руна Царства тьмы'],[37,'Руна дома'],[38,'Руна леса II'],[39,'Руна болота II'],[40,'Горная руна II'],[41,'Руна пещеры II'],[42,'Руна неба II'],[43,'Тёмная руна II'],[44,'Карта Воздуха'],[45,'Карта Земли'],[46,'Карта Огня'],[47,'Карта Природы'],[48,'Карта Пси-магии'],[51,'Эволюционный камень Воздуха'],[52,'Эволюционный камень Огня'],[53,'Эволюционный камень Природы'],[60,'Мана'],[70,'Инструменты гномов']
  ].map(([id,name])=>({id,name,model:'itm'+String(id).padStart(3,'0')}));
  const ITEM_BY_MODEL=new Map(ITEMS.map(x=>[x.model.toLowerCase(),x]));
  function itemsFromScene(bytes){
    const models=parseModelsV3(bytes), behaviours=parseBehaviours(bytes), scene=parseSceneItems(bytes); if(!models||!behaviours||!scene) return {models,behaviours,scene,items:[]};
    const byId=new Map(models.items.map(m=>[m.idx,m])), out=[];
    for(const b of behaviours.items){
      if(b.type!==1000&&b.type!==1001&&b.type!==1002) continue; const m=byId.get(b.modelId); if(!m||!/^itm/i.test(m.fileName)) continue;
      const item=ITEM_BY_MODEL.get(m.fileName.toLowerCase())||null; const si=scene.items.find(x=>x.i2===3&&x.i1===m.idx)||null;
      out.push({kind:'item',key:'item:'+m.idx,model:m,behaviour:b,sceneItem:si,item,itemId:item?.id??null,name:item?.name||m.fileName,position:m.position});
    }
    return {models,behaviours,scene,items:out};
  }
  function nextModelIdx(models){ const used=new Set(models.items.map(x=>x.idx)); let i=0; while(used.has(i)) i++; return i; }
  function cloneModelPrototype(proto){
    if(proto) return {rotation:{...proto.rotation},scaleX:proto.scaleX,scaleY:proto.scaleY,scaleZ:proto.scaleZ,color:Uint8Array.from(proto.color||[255,255,255,255]),i1:proto.i1||0,i15:proto.i15||0,i2:proto.i2||0};
    return {rotation:{x:0,y:0,z:1},scaleX:1,scaleY:1,scaleZ:1,color:Uint8Array.from([255,255,255,255]),i1:0,i15:0,i2:0};
  }
  function addItem(bytes,item,position,prototype){
    const models=parseModelsV3(bytes), behaviours=parseBehaviours(bytes), scene=parseSceneItems(bytes); if(!models||!behaviours||!scene) throw new Error('В сцене нет Models_v3/Behaviours/Scene');
    const idx=nextModelIdx(models), p=cloneModelPrototype(prototype), fileName=item.model||('itm'+String(item.id).padStart(3,'0'));
    models.items.push({idx,fileName,position:{x:+position.x,y:+position.y,z:+position.z},rotation:p.rotation,scaleX:p.scaleX,scaleY:p.scaleY,scaleZ:p.scaleZ,color:p.color,i1:p.i1,i15:p.i15,i2:p.i2});
    behaviours.items.push({type:1000,modelId:idx}); scene.items.push({s:'',i1:idx,i2:3});
    return patchItemSections(bytes,models,behaviours,scene);
  }
  function updateItem(bytes,placed,item,position){
    const models=parseModelsV3(bytes), behaviours=parseBehaviours(bytes), scene=parseSceneItems(bytes); const idx=placed.model.idx, m=models.items.find(x=>x.idx===idx); if(!m) throw new Error('Предмет не найден после повторного чтения');
    m.position={x:+position.x,y:+position.y,z:+position.z}; if(item) m.fileName=item.model||('itm'+String(item.id).padStart(3,'0'));
    return patchItemSections(bytes,models,behaviours,scene);
  }
  function deleteItem(bytes,placed){
    const models=parseModelsV3(bytes), behaviours=parseBehaviours(bytes), scene=parseSceneItems(bytes), idx=placed.model.idx;
    models.items=models.items.filter(x=>x.idx!==idx); behaviours.items=behaviours.items.filter(x=>!(x.modelId===idx&&(x.type===1000||x.type===1001||x.type===1002))); scene.items=scene.items.filter(x=>!(x.i1===idx&&x.i2===3));
    return patchItemSections(bytes,models,behaviours,scene);
  }

  function patchScene(bytes, triggerParsed, sceneParsed){
    const reps=[
      {s:triggerParsed.payloadStart,e:triggerParsed.payloadEnd,b:serializeTriggers(triggerParsed)},
      {s:sceneParsed.payloadStart,e:sceneParsed.payloadEnd,b:serializeSceneItems(sceneParsed)}
    ].sort((a,b)=>b.s-a.s);
    let out=bytes; for(const x of reps) out=replaceRange(out,x.s,x.e,x.b); return out;
  }

  function parseIndex(bytes){
    const r=new Reader(bytes), count=r.u32(), cols=[];
    for(let i=0;i<count;i++) cols.push({ii:r.u32(),name:r.zstr()});
    return cols;
  }

  function parseDatabase(bytes){
    const r=new Reader(bytes), count=r.u32(), entries=[];
    for(let ei=0;ei<count;ei++){
      const e={uid:r.u32(),fields:[]}, n=r.u32();
      for(let fi=0;fi<n;fi++){
        const f={type:r.u32(),column:r.u32()};
        if(f.type===0){ f.raw=r.zstrRaw(); f.string=new TextDecoder('windows-1251').decode(f.raw).replace(/\0+$/,''); }
        else if(f.type===1){f.size=r.u32();f.int=r.u32();}
        else if(f.type===4){f.size=r.u32();f.byte=r.u8();}
        else if(f.type===3){f.size=r.u32();f.uid=r.u32();f.refType=r.u32();}
        else {f.size=r.u32();f.data=r.bytes(f.size);}
        e.fields.push(f);
      }
      entries.push(e);
    }
    if(r.o!==bytes.length) throw new Error(`FBS разобран не полностью: ${r.o}/${bytes.length}`);
    return {entries};
  }
  function serializeDatabase(db){
    const w=new Writer().u32(db.entries.length);
    for(const e of db.entries){
      w.u32(e.uid).u32(e.fields.length);
      for(const f of e.fields){
        w.u32(f.type).u32(f.column);
        if(f.type===0){
          if(f._modifiedString!==undefined){ const s=f._modifiedString; const a=asciiBytes(s+'\0'); w.zstrRaw(a); }
          else w.zstrRaw(f.raw);
        } else if(f.type===1) w.u32(f.size).u32(f.int);
        else if(f.type===4) w.u32(f.size).u8(f.byte);
        else if(f.type===3) w.u32(f.size).u32(f.uid).u32(f.refType);
        else w.u32(f.size).raw(f.data);
      }
    }
    return w.finish();
  }

  function fieldByColumn(entry,col){ return entry.fields.find(f=>f.column===col); }
  function internalName(entry){ const f=fieldByColumn(entry,19); return f && f.type===0 ? (f._modifiedString!==undefined?f._modifiedString:f.string) : ''; }
  function scripts(entry){ return [24,25,26,27,28].map(c=>fieldByColumn(entry,c)).filter(Boolean); }
  function teamFromEntry(entry){
    const team=[];
    for(const f of scripts(entry)){
      const s=f._modifiedString!==undefined?f._modifiedString:f.string;
      for(const line of s.split(/\r?\n/)){
        const m=line.match(/^W\.(\d+)\.(\d+)\.(\d+)\s*$/); if(m) team.push({fairyId:+m[1],slot:+m[2],level:+m[3]});
      }
    }
    return team.sort((a,b)=>a.slot-b.slot);
  }
  function setTeam(entry,team){
    const target=fieldByColumn(entry,25) || scripts(entry)[0]; if(!target) throw new Error('У NPC нет Script-поля');
    for(const f of scripts(entry)){
      const s=f._modifiedString!==undefined?f._modifiedString:f.string;
      f._modifiedString=s.split(/\r?\n/).filter(x=>!/^W\.\d+\.\d+\.\d+\s*$/.test(x)).join('\n');
      if(s.endsWith('\n') && !f._modifiedString.endsWith('\n')) f._modifiedString+='\n';
    }
    let s=target._modifiedString!==undefined?target._modifiedString:target.string;
    if(s.length && !s.endsWith('\n')) s+='\n';
    const lines=team.filter(x=>x && x.fairyId!==null && x.fairyId!==undefined).sort((a,b)=>a.slot-b.slot).map(x=>`W.${x.fairyId}.${x.slot}.${x.level}`);
    target._modifiedString=s+lines.join('\n')+(lines.length?'\n':'');
  }

  function buildNpcCatalog(db){ return db.entries.map((entry,index)=>({index,uid:entry.uid>>>0,name:internalName(entry),team:teamFromEntry(entry),entry})).filter(x=>x.name); }
  function placementsFromScene(bytes,catalog){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); if(!tr||!sc) return {triggers:tr,scene:sc,placements:[]};
    const byUid=new Map(catalog.map(n=>[n.uid>>>0,n])); const trByIdx=new Map(tr.items.map(t=>[t.idx,t])); const out=[];
    for(const si of sc.items){
      if(si.i2!==4) continue; const t=trByIdx.get(si.i1); if(!t||t.type!==2) continue; const npc=byUid.get(t.ii1>>>0);
      if(npc) out.push({sceneItem:si,trigger:t,npc,name:si.s,position:t.vv});
    }
    return {triggers:tr,scene:sc,placements:out};
  }

  function addPlacement(bytes,npc,position,prototype){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); if(!tr||!sc) throw new Error('В сцене нет Triggers/Scene');
    const used=new Set(tr.items.map(x=>x.idx)); let idx=0; while(used.has(idx)) idx++;
    const p=prototype ? JSON.parse(JSON.stringify(prototype)) : {type:2,someFlag:0,v:{x:0,y:0,z:1},ii:3,ii2:0,ii3:0,ii4:0,s:''};
    const t={idx,type:2,someFlag:p.someFlag||0,v:p.v||{x:0,y:0,z:1},ii:p.ii||3,ii1:npc.uid>>>0,ii2:p.ii2||0,ii3:p.ii3||0,ii4:p.ii4||0,s:p.s||'',vv:{x:+position.x,y:+position.y,z:+position.z}};
    tr.items.push(t); sc.items.push({s:npc.name,i1:idx,i2:4});
    return patchScene(bytes,tr,sc);
  }
  function updatePlacement(bytes, placement, npc, position, direction){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); const t=tr.items.find(x=>x.idx===placement.trigger.idx); const si=sc.items.find(x=>x.i2===4&&x.i1===placement.trigger.idx&&x.s===placement.sceneItem.s);
    if(!t||!si) throw new Error('Размещение не найдено после повторного чтения');
    t.ii1=npc.uid>>>0; t.vv={x:+position.x,y:+position.y,z:+position.z}; if(direction) t.v={x:+direction.x,y:+direction.y,z:+direction.z}; si.s=npc.name;
    return patchScene(bytes,tr,sc);
  }
  function deletePlacement(bytes,placement){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes), idx=placement.trigger.idx;
    tr.items=tr.items.filter(x=>x.idx!==idx); sc.items=sc.items.filter(x=>!(x.i2===4&&x.i1===idx&&x.s===placement.sceneItem.s)); return patchScene(bytes,tr,sc);
  }


  const WILD_UID = 0x902391A4;
  function wildFromScene(bytes){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes);
    if(!tr||!sc) return {triggers:tr,scene:sc,wilds:[]};
    const trByIdx=new Map(tr.items.map(t=>[t.idx,t]));
    const out=[];
    for(const si of sc.items){
      if(si.i2!==4) continue;
      const t=trByIdx.get(si.i1);
      if(!t||t.type!==1||t.ii!==8||(t.ii1>>>0)!==WILD_UID) continue;
      const fairy=FAIRY_BY_ID.get(t.ii4);
      out.push({kind:'wild',sceneItem:si,trigger:t,fairyId:t.ii4,fairy,name:fairy?fairy.name:`Fairy ${t.ii4}`,position:t.vv,chance:t.ii3,radius:t.int,rawMode:t.ii2});
    }
    return {triggers:tr,scene:sc,wilds:out};
  }
  function addWild(bytes,params,prototype){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); if(!tr||!sc) throw new Error('В сцене нет Triggers/Scene');
    const used=new Set(tr.items.map(x=>x.idx)); let idx=0; while(used.has(idx)) idx++;
    const p=prototype ? JSON.parse(JSON.stringify(prototype)) : {type:1,someFlag:0,v:{x:0,y:-0.2,z:1},ii:8,ii1:WILD_UID,ii2:0,ii3:50,ii4:0,s:'',int:5};
    const t={idx,type:1,someFlag:p.someFlag||0,v:p.v||{x:0,y:-0.2,z:1},ii:8,ii1:WILD_UID,ii2:params.rawMode!==undefined?+params.rawMode:(p.ii2||0),ii3:+params.chance,ii4:+params.fairyId,s:p.s||'',vv:{x:+params.position.x,y:+params.position.y,z:+params.position.z},int:+params.radius};
    tr.items.push(t); sc.items.push({s:'',i1:idx,i2:4});
    return patchScene(bytes,tr,sc);
  }
  function updateWild(bytes,wild,params){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); const t=tr.items.find(x=>x.idx===wild.trigger.idx);
    if(!t) throw new Error('Точка дикой феи не найдена после повторного чтения');
    t.vv={x:+params.position.x,y:+params.position.y,z:+params.position.z}; t.ii4=+params.fairyId; t.ii3=+params.chance; t.int=+params.radius;
    if(params.rawMode!==undefined) t.ii2=+params.rawMode;
    return patchScene(bytes,tr,sc);
  }
  function deleteWild(bytes,wild){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes), idx=wild.trigger.idx;
    tr.items=tr.items.filter(x=>x.idx!==idx); sc.items=sc.items.filter(x=>!(x.i2===4&&x.i1===idx));
    return patchScene(bytes,tr,sc);
  }

  function hex32(v){ return (v>>>0).toString(16).toUpperCase().padStart(8,'0'); }

  return {FAIRIES,FAIRY_BY_ID,ITEMS,ITEM_BY_MODEL,WILD_UID,Reader,Writer,parseIndex,parseDatabase,serializeDatabase,buildNpcCatalog,teamFromEntry,setTeam,parseTriggers,parseSceneItems,parseModelsV3,parseBehaviours,patchScene,placementsFromScene,addPlacement,updatePlacement,deletePlacement,itemsFromScene,addItem,updateItem,deleteItem,wildFromScene,addWild,updateWild,deleteWild,hex32};
});
