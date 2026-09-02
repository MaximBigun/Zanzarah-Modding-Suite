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
  function parseMisc(bytes){
    const sec=findSection(bytes,'Misc'); if(!sec) return null;
    const r=new Reader(bytes,sec.dataStart);
    const sceneFile=r.zstr(), scenePath=r.zstr(), texturePath=r.zstr();
    return {sceneFile,scenePath,texturePath};
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
    [0,'Малый бальзам'],[1,'Средний бальзам'],[2,'Большой бальзам'],[3,'Лекарственные травы'],[4,'1 монета фей'],[5,'Тестовый амулет'],[6,'Кристалл'],[7,'Лекарство'],[8,'Рог фей'],[9,'Амулет опыта'],[10,'Клевер'],[11,'Тестовый амулет (Tinezard)'],[12,'Зарезервированная магическая карта'],[13,'Золотая морковь'],[14,'Зарезервированная магическая карта'],[15,'Морская раковина'],[16,'Мешок пикси'],[17,'Серебряный шар'],[18,'Золотой шар'],[19,'Хрустальный шар'],[20,'Чесночный распылитель'],[21,'Ключ от катакомб'],[22,'Тяжёлый железный ключ'],[23,'Ключ хранителя пикси'],[24,'Ключ от дома Руфуса'],[25,'Ключ от фабрики гномов'],[26,'Посох власти Квинлина'],[27,'Ключ от ратуши'],[28,'Руна возврата'],[29,'Руна Сада фей'],[30,'Руна Тиралина'],[31,'Руна Данмора'],[32,'Руна Башни гномов'],[33,'Руна мира пещер'],[34,'Руна Ледяного мира'],[35,'Руна Царства облаков'],[36,'Руна Царства теней'],[37,'Руна коттеджа'],[38,'Руна леса II'],[39,'Руна болота II'],[40,'Руна гор II'],[41,'Руна пещеры II'],[42,'Руна неба II'],[43,'Тёмная руна II'],[44,'Карта фей Воздуха'],[45,'Карта фей Земли'],[46,'Карта фей Огня'],[47,'Карта фей Природы'],[48,'Карта фей Пси-магии'],[49,'Зарезервированная магическая карта'],[50,'Зарезервированная магическая карта'],[51,'Эволюционная магия Воздуха'],[52,'Эволюционная магия Огня'],[53,'Эволюционная магия Природы'],[54,'Элементальный ключ Огня'],[55,'Элементальный ключ Воздуха'],[56,'Элементальный ключ Природы'],[57,'Элементальный ключ Земли'],[58,'Книга фей'],[59,'Сумка фей'],[60,'Зелье маны'],[61,'Формирующая магия'],[62,'Карта Сада фей'],[63,'Карта Зачарованного леса'],[64,'Карта Горного мира'],[65,'Карта Тёмного болота'],[66,'Карта Царства теней'],[67,'Карта Царства облаков'],[68,'Зарезервированная карта'],[69,'Зарезервированная карта'],[70,'Инструменты гномов'],[71,'Красный костяной ключ'],[72,'Зелёный костяной ключ'],[73,'Синий костяной ключ']
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
    models.items.push({idx,fileName,position:{x:+position.x,y:+position.y+1,z:+position.z},rotation:p.rotation,scaleX:p.scaleX,scaleY:p.scaleY,scaleZ:p.scaleZ,color:p.color,i1:p.i1,i15:p.i15,i2:p.i2});
    behaviours.items.push({type:1000,modelId:idx}); scene.items.push({s:'',i1:idx,i2:3});
    return patchItemSections(bytes,models,behaviours,scene);
  }
  function addItems(bytes,item,position,prototype,count=1){
    const models=parseModelsV3(bytes), behaviours=parseBehaviours(bytes), scene=parseSceneItems(bytes); if(!models||!behaviours||!scene) throw new Error('В сцене нет Models_v3/Behaviours/Scene');
    count=Math.max(1,Math.min(99,Math.floor(+count||1)));
    const p=cloneModelPrototype(prototype), fileName=item.model||('itm'+String(item.id).padStart(3,'0'));
    const used=new Set(models.items.map(x=>x.idx));
    let cursor=0;
    for(let n=0;n<count;n++){
      while(used.has(cursor))cursor++; const idx=cursor++; used.add(idx);
      models.items.push({idx,fileName,position:{x:+position.x,y:+position.y+1,z:+position.z},rotation:{...p.rotation},scaleX:p.scaleX,scaleY:p.scaleY,scaleZ:p.scaleZ,color:Uint8Array.from(p.color),i1:p.i1,i15:p.i15,i2:p.i2});
      behaviours.items.push({type:1000,modelId:idx}); scene.items.push({s:'',i1:idx,i2:3});
    }
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
    const trailing=r.o<bytes.length?bytes.slice(r.o):new Uint8Array(0);
    return {entries,_trailing:trailing,_parsedEnd:r.o,_totalLength:bytes.length};
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
    const main=w.finish();
    return db._trailing&&db._trailing.length?concat(main,db._trailing):main;
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
    if(deckVariantsFromEntry(entry).length>1){ setDeckVariants(entry,[team||[]]); return; }
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

  function deckVariantsFromEntry(entry){
    const target=fieldByColumn(entry,25)||scripts(entry)[0];
    if(!target)return [];
    const text=target._modifiedString!==undefined?target._modifiedString:target.string;
    const lines=text.split(/\r?\n/), lm=lines.map(x=>x.trim()).find(x=>/^L\.(\d+)\.0$/i.test(x));
    if(!lm)return [teamFromEntry(entry).filter(x=>x.slot>=0&&x.slot<=4)];
    const n=Math.max(1,Math.min(20,+lm.match(/^L\.(\d+)\.0$/i)[1]||1)), out=[];
    for(let i=0;i<n;i++){
      const start=lines.findIndex(x=>x.trim()===`$.${i}`); if(start<0)continue;
      let end=lines.length;for(let j=start+1;j<lines.length;j++){if(/^\$\.\d+$/i.test(lines[j].trim())){end=j;break}}
      const team=[];for(let j=start+1;j<end;j++){const m=lines[j].trim().match(/^W\.(\d+)\.(\d+)\.(\d+)$/i);if(m)team.push({fairyId:+m[1],slot:+m[2],level:+m[3]})}
      if(team.length)out.push(team.sort((a,b)=>a.slot-b.slot));
    }
    return out.length?out:[teamFromEntry(entry).filter(x=>x.slot>=0&&x.slot<=4)];
  }
  function setDeckVariants(entry,variants){
    variants=(variants||[]).map(v=>(v||[]).filter(x=>x&&x.fairyId!=null).sort((a,b)=>a.slot-b.slot));
    if(!variants.length)throw new Error('Нужен хотя бы один вариант колоды');
    if(variants.some(v=>v.some(x=>x.slot<0||x.slot>4)))throw new Error('Подтверждены только слоты фей 0–4');
    const target=fieldByColumn(entry,25)||scripts(entry)[0];if(!target)throw new Error('У NPC нет Script2');
    const cur=target._modifiedString!==undefined?target._modifiedString:target.string;
    const cLine=cur.split(/\r?\n/).find(x=>/^C\./i.test(x.trim()))||'';
    if(variants.length===1){target._modifiedString=(cLine?cLine+'\n':'')+variants[0].map(x=>`W.${x.fairyId}.${x.slot}.${x.level}`).join('\n')+'\n';return;}
    const n=variants.length, lines=[];if(cLine)lines.push(cLine);lines.push(`L.${n}.0`);
    for(let i=0;i<n;i++){lines.push(`$.${i}`);for(const x of variants[i])lines.push(`W.${x.fairyId}.${x.slot}.${x.level}`);lines.push(`K.${n}`)}
    lines.push(`$.${n}`);target._modifiedString=lines.join('\n')+'\n';
  }

  function groupAttackFromEntry(entry){
    for(const f of scripts(entry)){
      const s=f._modifiedString!==undefined?f._modifiedString:f.string;
      for(const line of s.split(/\r?\n/)){
        const m=line.match(/^n\.(\d+)\.(\d+)\.(\d+)\s*$/i);
        if(m)return {opponents:Math.max(1,+m[1]+1),arg0:+m[1],levelParam:+m[2],flag:+m[3]};
      }
    }
    return null;
  }
  function setGroupAttack(entry,opponents,levelParam){
    opponents=Math.max(1,Math.min(3,Math.floor(+opponents||1)));
    levelParam=Math.max(1,Math.min(99,Math.floor(+levelParam||40)));
    for(const f of scripts(entry)){
      const cur=f._modifiedString!==undefined?f._modifiedString:f.string;
      f._modifiedString=cur.split(/\r?\n/).filter(x=>!/^n\.\d+\.\d+\.\d+\s*$/i.test(x)).join('\n');
      if(cur.endsWith('\n')&&!f._modifiedString.endsWith('\n'))f._modifiedString+='\n';
    }
    if(opponents<=1)return null;
    const target=fieldByColumn(entry,25)||scripts(entry)[0];if(!target)throw new Error('У NPC нет Script-поля');
    let cur=target._modifiedString!==undefined?target._modifiedString:target.string;
    const cmd=`n.${opponents-1}.${levelParam}.1`;
    const lines=cur.split(/\r?\n/),ci=lines.findIndex(x=>/^C\./.test(x.trim()));
    if(ci>=0)lines.splice(ci+1,0,cmd);else lines.unshift(cmd);
    target._modifiedString=lines.join('\n');
    if(cur.endsWith('\n')&&!target._modifiedString.endsWith('\n'))target._modifiedString+='\n';
    return {opponents,arg0:opponents-1,levelParam,flag:1};
  }

  const WILD_ACTOR_UID = 0x79110B91;
  function isWildEnemyProfileEntry(entry){
    const actor=fieldByColumn(entry,3);
    return !!(actor && actor.type===3 && (actor.uid>>>0)===WILD_ACTOR_UID);
  }
  function randomProfileFromEntry(entry){
    const lines=[];
    for(const f of scripts(entry)){
      const s=f._modifiedString!==undefined?f._modifiedString:f.string;
      for(const line of s.split(/\r?\n/)){
        const m=line.match(/^W\.(\d+)\.(\d+)\.(\d+)\s*$/);
        if(m)lines.push({fairyId:+m[1],slot:+m[2],level:+m[3]});
      }
    }
    if(!lines.length)return null;
    const ids=[...new Set(lines.map(x=>x.fairyId))],levels=lines.map(x=>x.level);
    return {variants:lines,fairyIds:ids,minLevel:Math.min(...levels),maxLevel:Math.max(...levels),singleFairy:ids.length===1&&lines.every(x=>x.slot===0)};
  }
  function buildRandomRangeScript(fairyId,minLevel,maxLevel){
    fairyId=Math.max(0,Math.floor(+fairyId||0));minLevel=Math.max(1,Math.min(99,Math.floor(+minLevel||1)));maxLevel=Math.max(1,Math.min(99,Math.floor(+maxLevel||minLevel)));
    if(maxLevel<minLevel)[minLevel,maxLevel]=[maxLevel,minLevel];
    if(minLevel===maxLevel)return `W.${fairyId}.0.${minLevel}\n`;
    const levels=[];for(let l=minLevel;l<=maxLevel;l++)levels.push(l);
    const exit=levels.length;
    let out=`L.${levels.length}.0\n`;
    levels.forEach((level,i)=>{out+=`$.${i}\nW.${fairyId}.0.${level}\nK.${exit}\n`;});
    out+=`$.${exit}\n`;
    return out;
  }

  function buildRandomPoolRangeScript(slots,minLevel,maxLevel){
    slots=(slots||[]).map(x=>Math.max(0,Math.floor(+x||0))).slice(0,8);
    if(!slots.length)throw new Error('В пуле должна быть хотя бы одна фея.');
    minLevel=Math.max(1,Math.min(99,Math.floor(+minLevel||1)));maxLevel=Math.max(1,Math.min(99,Math.floor(+maxLevel||minLevel)));
    if(maxLevel<minLevel)[minLevel,maxLevel]=[maxLevel,minLevel];
    const variants=[];for(const fairyId of slots)for(let level=minLevel;level<=maxLevel;level++)variants.push({fairyId,level});
    if(variants.length===1)return `W.${variants[0].fairyId}.0.${variants[0].level}\n`;
    const exit=variants.length;let out=`L.${variants.length}.0\n`;
    variants.forEach((v,i)=>{out+=`$.${i}\nW.${v.fairyId}.0.${v.level}\nK.${exit}\n`;});out+=`$.${exit}\n`;return out;
  }
  function setRandomPoolRange(entry,slots,minLevel,maxLevel){
    if(!isWildEnemyProfileEntry(entry))throw new Error('Эта запись не использует _WildWizform actor.');
    const target=fieldByColumn(entry,25)||scripts(entry)[0];if(!target)throw new Error('В записи нет Script-поля.');
    target._modifiedString=buildRandomPoolRangeScript(slots,minLevel,maxLevel);return randomProfileFromEntry(entry);
  }
  function setRandomFairyRange(entry,fairyId,minLevel,maxLevel){
    if(!isWildEnemyProfileEntry(entry))throw new Error('Эта запись не использует _WildWizform actor и не является модовым генератором дикой феи.');
    const target=fieldByColumn(entry,25)||scripts(entry)[0];if(!target)throw new Error('В записи нет Script-поля.');
    target._modifiedString=buildRandomRangeScript(fairyId,minLevel,maxLevel);
    return randomProfileFromEntry(entry);
  }
  function nextCustomWildName(db){const used=new Set(db.entries.map(internalName));for(let i=1;i<1000;i++){const n=`_CustomWild_${String(i).padStart(2,'0')}`;if(!used.has(n))return n;}throw new Error('Не удалось подобрать имя CustomWild');}
  function nextCustomWildUid(db){const used=new Set(db.entries.map(e=>e.uid>>>0));for(let i=0;i<0x10000;i++){const uid=(0xE60000A4+(i<<8))>>>0;if(!used.has(uid))return uid;}throw new Error('Не удалось подобрать UID CustomWild');}
  function createCustomWildEnemy(db,fairyId,minLevel,maxLevel){
    const base=db.entries.find(e=>(e.uid>>>0)===WILD_UID)||db.entries.find(e=>internalName(e)==='_WildWizform');
    if(!base)throw new Error('В _fb0x05.fbs не найден оригинальный _WildWizform (UID 0x902391A4).');
    const entry=cloneDbEntry(base),name=nextCustomWildName(db),uid=nextCustomWildUid(db);
    entry.uid=uid;const nf=fieldByColumn(entry,19);if(!nf)throw new Error('У _WildWizform нет internal-name поля');nf._modifiedString=name;
    setRandomFairyRange(entry,fairyId,minLevel,maxLevel);db.entries.push(entry);
    return {index:db.entries.length-1,uid,name,team:teamFromEntry(entry),entry,isWildEnemyProfile:true,isCustomWildEnemy:true,randomProfile:randomProfileFromEntry(entry)};
  }
  function createCustomWildPoolEnemy(db,slots,minLevel,maxLevel){
    const base=db.entries.find(e=>(e.uid>>>0)===WILD_UID)||db.entries.find(e=>internalName(e)==='_WildWizform');
    if(!base)throw new Error('В _fb0x05.fbs не найден оригинальный _WildWizform (UID 0x902391A4).');
    const entry=cloneDbEntry(base),name=nextCustomWildName(db),uid=nextCustomWildUid(db);
    entry.uid=uid;const nf=fieldByColumn(entry,19);if(!nf)throw new Error('У _WildWizform нет internal-name поля');nf._modifiedString=name;
    setRandomPoolRange(entry,slots,minLevel,maxLevel);db.entries.push(entry);
    return {index:db.entries.length-1,uid,name,team:teamFromEntry(entry),entry,isWildEnemyProfile:true,isCustomWildEnemy:true,randomProfile:randomProfileFromEntry(entry)};
  }

  function cloneDbField(f){
    const c={...f};
    if(f.raw)c.raw=f.raw.slice();
    if(f.data)c.data=f.data.slice();
    return c;
  }
  function cloneDbEntry(entry){ return {uid:entry.uid>>>0,fields:entry.fields.map(cloneDbField)}; }
  function nextCustomShadowName(db){
    const used=new Set(db.entries.map(internalName));
    for(let i=1;i<1000;i++){ const name=`_CustomShadowElf_${String(i).padStart(2,'0')}`; if(!used.has(name))return name; }
    throw new Error('Не удалось подобрать имя для Custom Shadow Elf');
  }
  function nextCustomShadowUid(db){
    const used=new Set(db.entries.map(e=>e.uid>>>0));
    for(let uid=0xE5000014;uid<=0xE500FFF4;uid+=0x10)if(!used.has(uid>>>0))return uid>>>0;
    throw new Error('Закончился диапазон UID для Custom Shadow Elf');
  }
  function nextVisibleEnemyName(db){
    const used=new Set(db.entries.map(internalName));
    for(let i=1;i<1000;i++){ const name=`_CustomEnemy_${String(i).padStart(2,'0')}`; if(!used.has(name))return name; }
    throw new Error('Не удалось подобрать имя для нового врага');
  }
  function nextVisibleEnemyUid(db){
    const used=new Set(db.entries.map(e=>e.uid>>>0));
    for(let uid=0xE7000014;uid<=0xE700FFF4;uid+=0x10)if(!used.has(uid>>>0))return uid>>>0;
    throw new Error('Закончился диапазон UID для новых врагов');
  }
  function cloneNpcProfile(db,sourceEntry,team,namePrefix='_CustomEnemy_'){
    if(!sourceEntry)throw new Error('Не выбран шаблон врага');
    const entry=cloneDbEntry(sourceEntry), uid=nextVisibleEnemyUid(db);
    const used=new Set(db.entries.map(internalName)); let name='';
    for(let i=1;i<1000;i++){const n=`${namePrefix}${String(i).padStart(2,'0')}`;if(!used.has(n)){name=n;break}}
    if(!name)throw new Error('Не удалось подобрать имя нового врага');
    entry.uid=uid; const nf=fieldByColumn(entry,19); if(!nf)throw new Error('У шаблона нет internal-name поля'); nf._modifiedString=name;
    setTeam(entry,team||teamFromEntry(sourceEntry)); db.entries.push(entry);
    return {index:db.entries.length-1,uid,name,team:teamFromEntry(entry),entry,isCustomVisibleEnemy:true,template:internalName(sourceEntry)};
  }
  function createVisibleElfEnemy(db,team){
    const entry=db.entries.find(e=>internalName(e)==='nq4001' && isBattleReadyEnemyEntry(e)) || db.entries.find(isBattleReadyEnemyEntry);
    if(!entry)throw new Error('В _fb0x05.fbs не найден рабочий боевой шаблон врага');
    return cloneNpcProfile(db,entry,team||[], '_CustomElf_');
  }
  function createCustomShadowElf(db,team){ return createVisibleElfEnemy(db,team); }

  function fieldString(entry,col){const f=fieldByColumn(entry,col);return f&&f.type===0?(f._modifiedString!==undefined?f._modifiedString:f.string||''):'';}
  function attackDialogUidFromEntry(entry){
    const s=fieldString(entry,24);const m=s.match(/!\.([0-9A-Fa-f]{1,8})\.(\d+)/);return m?(parseInt(m[1],16)>>>0):null;
  }
  function setAttackDialogUid(entry,uid){
    const f=fieldByColumn(entry,24);if(!f||f.type!==0)throw new Error('У шаблона нет Script1 с репликой нападения.');
    const s=f._modifiedString!==undefined?f._modifiedString:f.string||'';
    if(!/!\.[0-9A-Fa-f]{1,8}\.\d+/.test(s))throw new Error('В Script1 не найдена команда диалога !.UID.N');
    f._modifiedString=s.replace(/!\.[0-9A-Fa-f]{1,8}\.(\d+)/,`!.${hex32(uid)}.$1`);return uid>>>0;
  }
  function nextDialogUid(db){const used=new Set(db.entries.map(e=>e.uid>>>0));for(let uid=0xE8000015;uid<=0xE800FFF5;uid+=0x10)if(!used.has(uid>>>0))return uid>>>0;throw new Error('Закончился диапазон UID для пользовательских диалогов');}
  function cloneDialogueForNpc(db,sourceUid,text,npcUid){
    if(!db)throw new Error('_fb0x06.fbs не загружен. Для собственного текста нужен этот файл.');
    const base=db.entries.find(e=>(e.uid>>>0)===(sourceUid>>>0))||db.entries.find(e=>fieldString(e,0).trim());
    if(!base)throw new Error('В _fb0x06.fbs не найден шаблон диалога.');
    const e=cloneDbEntry(base),uid=nextDialogUid(db);e.uid=uid;
    const tf=fieldByColumn(e,0);if(!tf||tf.type!==0)throw new Error('У записи диалога нет текстового column 0.');tf._modifiedString=String(text||'').trim();
    const nf=fieldByColumn(e,29);if(nf){if(nf.type===3)nf.uid=npcUid>>>0;else if(nf.type===1)nf.int=npcUid>>>0;}
    db.entries.push(e);return {uid,entry:e,text:tf._modifiedString};
  }
  function dialogTextByUid(db,uid){const e=db&&db.entries.find(x=>(x.uid>>>0)===(uid>>>0));return e?fieldString(e,0):'';}

  function actorUidFromEntry(entry){const f=fieldByColumn(entry,3);return f&&f.type===3?(f.uid>>>0):null;}
  function setActorUidFromEntry(entry,sourceEntry){
    const src=fieldByColumn(sourceEntry,3),dst=fieldByColumn(entry,3);
    if(!src||src.type!==3)throw new Error('У группового шаблона отсутствует Name/actor reference в column 3.');
    if(!dst||dst.type!==3)throw new Error('У создаваемого NPC отсутствует Name/actor reference в column 3.');
    dst.uid=src.uid>>>0; return dst.uid;
  }
  function appearanceCodeFromEntry(entry){for(const f of scripts(entry)){const s=f._modifiedString!==undefined?f._modifiedString:f.string||'';const m=s.match(/(?:^|\n)C\.([^\s\r\n]+)/);if(m)return m[1].trim()}return '';}
  function setAppearanceCode(entry,code){code=String(code||'').trim();if(!code)throw new Error('Не выбрана внешность C.<model>.');for(const f of scripts(entry)){const v=f._modifiedString!==undefined?f._modifiedString:f.string||'';if(/(?:^|\n)C\.[^\s\r\n]+/.test(v)){f._modifiedString=v.replace(/(^|\n)C\.[^\s\r\n]+/,`$1C.${code}`);return code}}throw new Error('В боевом шаблоне не найдена команда C.<model>.');}
  function isBattleReadyEnemyEntry(entry){
    if(!entry||isWildEnemyProfileEntry(entry))return false;
    const s24=fieldByColumn(entry,24),s26=fieldByColumn(entry,26),s27=fieldByColumn(entry,27);
    const a=s24?(s24._modifiedString!==undefined?s24._modifiedString:s24.string||''):'';
    const b=s26?(s26._modifiedString!==undefined?s26._modifiedString:s26.string||''):'';
    const c=s27?(s27._modifiedString!==undefined?s27._modifiedString:s27.string||''):'';
    return !!(a.trim() && b.trim() && c.trim() && /[!&*]/.test(a) && /[YEX+]/.test(b));
  }
  function buildNpcCatalog(db){ return db.entries.map((entry,index)=>{const name=internalName(entry),wildProfile=isWildEnemyProfileEntry(entry)&&(entry.uid>>>0)!==WILD_UID,customVisible=/^_Custom(?:ShadowElf|Elf|Enemy)_\d+$/i.test(name)||/^_CustomGroup\d+_(?:Leader|Support\d+)$/i.test(name);return {index,uid:entry.uid>>>0,name,team:teamFromEntry(entry),entry,actorUid:actorUidFromEntry(entry),isBattleReadyEnemy:isBattleReadyEnemyEntry(entry),isCustomShadowElf:customVisible,isCustomVisibleEnemy:customVisible,isExistingRecordExperiment:false,isWildEnemyProfile:wildProfile,isCustomWildEnemy:/^_CustomWild_\d+$/i.test(name),randomProfile:wildProfile?randomProfileFromEntry(entry):null}}).filter(x=>x.name); }

  function setLinkedGroupScript(entry, links){
    const f=fieldByColumn(entry,24); if(!f||f.type!==0) throw new Error('У лидера нет Script1.');
    let s=f._modifiedString!==undefined?f._modifiedString:f.string||'';
    s=s.replace(/\n?&\.3000\n(?:P\.\d+\.[0-9A-Fa-f]+\n(?:\[\.0\.\d+\n)?Q\.10\n(?:e\.5\n)?)+(?:&\.3001\nQ\.10\n(?:e\.5\n)?&\.3002\nQ\.10\n(?:e\.5\n)?&\.3003\nQ\.10\n(?:e\.5\n)?)?/g,'\n');
    const valid=(links||[]).filter(x=>x&&Number.isFinite(+x.markerIdx)&&x.uid!=null);
    if(!valid.length){f._modifiedString=s;return entry;}
    let block='&.3000\n';
    for(const x of valid){const idx=Math.max(0,Math.floor(+x.markerIdx));block+=`P.${idx}.${(x.uid>>>0).toString(16)}\nQ.10\n`;}
    const pos=s.indexOf('&.1006');
    if(pos>=0)s=s.slice(0,pos)+block+s.slice(pos);else{s+=(s.endsWith('\n')?'':'\n')+block;}
    s=s.replace(/\*\.-1\.0/g,'*.-1.1');
    f._modifiedString=s; return entry;
  }

  function setLinkedGroupCleanup(entry, supportTriggerIdxs){
    const f=fieldByColumn(entry,27); if(!f||f.type!==0) throw new Error('У лидера нет Script4 для post-battle cleanup.');
    let s=f._modifiedString!==undefined?f._modifiedString:f.string||'';
    s=s.replace(/(?:^|\n)a\.\d+(?=\n|$)/g,'');
    const ids=(supportTriggerIdxs||[]).filter(Number.isFinite).map(x=>Math.max(0,Math.floor(x)));
    if(!ids.length){f._modifiedString=s;return entry;}
    const rows=ids.map(x=>`a.${x}`).join('\n')+'\n';
    f._modifiedString=rows+s.replace(/^\n+/,''); return entry;
  }

  function nextTriggerIdx(tr){const used=new Set(tr.items.map(x=>x.idx));let i=0;while(used.has(i))i++;return i;}
  function addLinkedGroupSupport(bytes,npc,physicalPos,markerPos,direction=null){
    const tr=parseTriggers(bytes),sc=parseSceneItems(bytes);if(!tr||!sc)throw new Error('В сцене нет Triggers/Scene');
    const dir=direction||{x:0,y:-0.2,z:1};
    const npcIdx=nextTriggerIdx(tr);
    tr.items.push({idx:npcIdx,type:2,someFlag:0,v:{x:+dir.x,y:+dir.y,z:+dir.z},ii:3,ii1:npc.uid>>>0,ii2:3,ii3:0,ii4:0,s:'',vv:{x:+physicalPos.x,y:+physicalPos.y,z:+physicalPos.z}});
    for(const i2 of [2,3,4])sc.items.push({s:'',i1:npcIdx,i2});
    const markerIdx=nextTriggerIdx(tr);
    tr.items.push({idx:markerIdx,type:2,someFlag:0,v:{x:+dir.x,y:+dir.y,z:+dir.z},ii:5,ii1:0,ii2:0,ii3:0,ii4:0,s:'',vv:{x:+markerPos.x,y:+markerPos.y,z:+markerPos.z}});
    for(const i2 of [2,3,4])sc.items.push({s:'',i1:markerIdx,i2});
    return {bytes:patchScene(bytes,tr,sc),npcIdx,markerIdx};
  }

  function setOrAddAppearanceCode(entry,code){
    code=String(code||'').trim(); if(!code) throw new Error('Не выбрана внешность C.<model>.');
    for(const f of scripts(entry)){
      const v=f._modifiedString!==undefined?f._modifiedString:f.string||'';
      if(/(?:^|\n)C\.[^\s\r\n]+/.test(v)){f._modifiedString=v.replace(/(^|\n)C\.[^\s\r\n]+/,`$1C.${code}`);return code;}
    }
    const target=fieldByColumn(entry,25)||scripts(entry)[0]; if(!target) throw new Error('У профиля нет Script2.');
    let v=target._modifiedString!==undefined?target._modifiedString:target.string||'';
    target._modifiedString=`C.${code}\n`+v; return code;
  }
  function setSc0203LeaderRole(entry){
    const s1=fieldByColumn(entry,24),s2=fieldByColumn(entry,25); if(!s1||!s2)throw new Error('У лидера отсутствует Script1/Script2.');
    let a=s1._modifiedString!==undefined?s1._modifiedString:s1.string||'';
    a=a.replace(/\*\.-1\.0/g,'*.-1.1'); s1._modifiedString=a;
    let b=s2._modifiedString!==undefined?s2._modifiedString:s2.string||'';
    if(!/(?:^|\n)O\.3(?:\n|$)/.test(b)){
      const m=b.match(/^C\.[^\r\n]+\r?\n/); b=m?m[0]+'O.3\n'+b.slice(m[0].length):'O.3\n'+b;
    }
    s2._modifiedString=b; return entry;
  }
  function setSc0203SupportRole(entry){
    const s1=fieldByColumn(entry,24),s2=fieldByColumn(entry,25),s3=fieldByColumn(entry,26);
    if(s1&&s1.type===0)s1._modifiedString='';
    if(!s2||s2.type!==0)throw new Error('У support-профиля отсутствует Script2.');
    let b=s2._modifiedString!==undefined?s2._modifiedString:s2.string||'';
    const cm=(b.match(/(?:^|\n)(C\.[^\r\n]+)/)||[])[1]||'';
    const ws=b.split(/\r?\n/).filter(x=>/^W\.\d+\.\d+\.\d+\s*$/.test(x.trim())).map(x=>x.trim());
    s2._modifiedString=(cm?cm+'\n':'')+'O.3\n].0\n'+ws.join('\n')+(ws.length?'\n':'');
    if(!s3||s3.type!==0)throw new Error('У support-профиля отсутствует Script3.');
    s3._modifiedString='+.0.2\n';
    const s4=fieldByColumn(entry,27),s5=fieldByColumn(entry,28); if(s4&&s4.type===0)s4._modifiedString=''; if(s5&&s5.type===0)s5._modifiedString='';
    return entry;
  }
  function addSc0203Support(bytes,npc,position,direction=null){
    const tr=parseTriggers(bytes),sc=parseSceneItems(bytes);if(!tr||!sc)throw new Error('В сцене нет Triggers/Scene');
    const dir=direction||{x:0,y:-0.2,z:1};
    const used=new Set(tr.items.map(x=>x.idx)); for(const x of sc.items)used.add(x.i1); let idx=0; while(used.has(idx))idx++;
    tr.items.push({idx,type:2,someFlag:0,v:{x:+dir.x,y:+dir.y,z:+dir.z},ii:3,ii1:npc.uid>>>0,ii2:0,ii3:0,ii4:0,s:'',vv:{x:+position.x,y:+position.y,z:+position.z}});
    for(const i2 of [2,4])sc.items.push({s:'',i1:idx,i2});
    return {bytes:patchScene(bytes,tr,sc),npcIdx:idx};
  }
  function addSc0203Leader(bytes,npc,position,direction=null){
    const tr=parseTriggers(bytes),sc=parseSceneItems(bytes);if(!tr||!sc)throw new Error('В сцене нет Triggers/Scene');
    const dir=direction||{x:0,y:-0.2,z:1};
    const used=new Set(tr.items.map(x=>x.idx)); for(const x of sc.items)used.add(x.i1); let idx=0; while(used.has(idx))idx++;
    tr.items.push({idx,type:2,someFlag:0,v:{x:+dir.x,y:+dir.y,z:+dir.z},ii:3,ii1:npc.uid>>>0,ii2:0,ii3:0,ii4:0,s:'',vv:{x:+position.x,y:+position.y,z:+position.z}});
    for(const i2 of [2,4])sc.items.push({s:'',i1:idx,i2});
    return {bytes:patchScene(bytes,tr,sc),npcIdx:idx};
  }

  function placementsFromScene(bytes,catalog){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); if(!tr||!sc) return {triggers:tr,scene:sc,placements:[]};
    const byUid=new Map(catalog.map(n=>[n.uid>>>0,n])); const trByIdx=new Map(tr.items.map(t=>[t.idx,t])); const out=[];
    for(const si of sc.items){
      if(si.i2!==4) continue; const t=trByIdx.get(si.i1); if(!t||(t.type!==2&&t.type!==1)) continue; const npc=byUid.get(t.ii1>>>0);
      if(npc && (t.ii1>>>0)!==WILD_UID && !npc.isWildEnemyProfile) out.push({kind:'npc',sceneItem:si,trigger:t,npc,name:si.s||npc.name,position:t.vv,attackRadius:t.type===1?Math.max(0,+t.int||0):0,hostileTrigger:t.type===1});
    }
    return {triggers:tr,scene:sc,placements:out};
  }

  function addPlacement(bytes,npc,position,prototype,attackRadius=0,encounterOpts=null){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); if(!tr||!sc) throw new Error('В сцене нет Triggers/Scene');
    const used=new Set(tr.items.map(x=>x.idx)); let idx=0; while(used.has(idx)) idx++;
    const p=prototype ? JSON.parse(JSON.stringify(prototype)) : {type:2,someFlag:0,v:{x:0,y:0,z:1},ii:3,ii2:0,ii3:0,ii4:0,s:''};
    const radius=Math.max(0,+attackRadius||0), isWildProfile=!!npc.isWildEnemyProfile, type=isWildProfile?1:(radius>0?1:2);
    const isCustom=!!npc.isCustomShadowElf;
    const eo=encounterOpts||{};
    const t={idx,type,someFlag:(isCustom||isWildProfile)?0:(p.someFlag||0),v:isCustom?{x:0,y:0,z:1}:(p.v||{x:0,y:-0.2,z:1}),ii:isWildProfile?8:3,ii1:npc.uid>>>0,ii2:isWildProfile?Math.max(0,Math.floor(+eo.rawMode||0)):(isCustom?0:(p.ii2||0)),ii3:isWildProfile?Math.max(0,Math.min(100,Math.floor(+eo.chance||100))):(isCustom?0:(p.ii3||0)),ii4:isWildProfile?Math.max(0,Math.floor(+eo.group||0)):(isCustom?0:(p.ii4||0)),s:(isCustom||isWildProfile)?'':(p.s||''),vv:{x:+position.x,y:+position.y,z:+position.z}};
    if(type===1)t.int=isWildProfile?(radius>0?radius:5):radius;
    tr.items.push(t); sc.items.push({s:(isCustom||isWildProfile)?'':npc.name,i1:idx,i2:4});
    return patchScene(bytes,tr,sc);
  }
  function updatePlacement(bytes, placement, npc, position, direction, attackRadius, encounterOpts=null){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); const t=tr.items.find(x=>x.idx===placement.trigger.idx); const si=sc.items.find(x=>x.i2===4&&x.i1===placement.trigger.idx);
    if(!t||!si) throw new Error('Размещение не найдено после повторного чтения');
    const isCustom=!!npc.isCustomShadowElf,isWildProfile=!!npc.isWildEnemyProfile;
    t.ii1=npc.uid>>>0; t.vv={x:+position.x,y:+position.y,z:+position.z};
    if(isWildProfile){
      const eo=encounterOpts||{};t.type=1;t.someFlag=0;t.ii=8;t.ii2=Math.max(0,Math.floor(+(eo.rawMode??t.ii2)||0));t.ii3=Math.max(0,Math.min(100,Math.floor(+(eo.chance??t.ii3)||100)));t.ii4=Math.max(0,Math.floor(+(eo.group??t.ii4)||0));t.s='';si.s='';if(direction)t.v={x:+direction.x,y:+direction.y,z:+direction.z};t.int=Math.max(0.05,+attackRadius||+t.int||5);
    }else if(isCustom){
      t.someFlag=0; t.v=direction?{x:+direction.x,y:+direction.y,z:+direction.z}:{x:0,y:0,z:1};
      t.ii=3; t.ii2=0; t.ii3=0; t.ii4=0; t.s=''; si.s='';
    }else{
      if(direction)t.v={x:+direction.x,y:+direction.y,z:+direction.z}; si.s=npc.name;
    }
    if(attackRadius!==undefined&&!isWildProfile){const radius=Math.max(0,+attackRadius||0); if(radius>0){t.type=1;t.int=radius;}else{t.type=2;delete t.int;}}
    return patchScene(bytes,tr,sc);
  }
  function deletePlacement(bytes,placement){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes), idx=placement.trigger.idx;
    tr.items=tr.items.filter(x=>x.idx!==idx); sc.items=sc.items.filter(x=>!(x.i2===4&&x.i1===idx&&x.s===placement.sceneItem.s)); return patchScene(bytes,tr,sc);
  }

  function deleteNpcProfile(db,npcOrUid){
    const uid=(typeof npcOrUid==='number'?npcOrUid:npcOrUid?.uid)>>>0;
    const before=db.entries.length;
    db.entries=db.entries.filter(e=>(e.uid>>>0)!==uid);
    if(db.entries.length===before)throw new Error('Профиль NPC не найден в _fb0x05.');
    return true;
  }
  function deletePlacementsByUids(bytes,uids){
    const wanted=new Set([...uids].map(x=>x>>>0)),tr=parseTriggers(bytes),sc=parseSceneItems(bytes);
    if(!tr||!sc)return bytes;
    const doomed=new Set(tr.items.filter(t=>wanted.has(t.ii1>>>0)).map(t=>t.idx));
    if(!doomed.size)return bytes;
    tr.items=tr.items.filter(t=>!doomed.has(t.idx));
    sc.items=sc.items.filter(si=>!(si.i2===4&&doomed.has(si.i1)));
    return patchScene(bytes,tr,sc);
  }

  const WILD_UID = 0x902391A4;
  const WILD_POOL_RAW = [
    {id:0,slots:[9,26],levelParam:5},{id:1,slots:[10,75],levelParam:13},{id:2,slots:[57,1,0],levelParam:36},{id:3,slots:[50,57],levelParam:42},{id:4,slots:[18,10],levelParam:13},{id:5,slots:[9,19],levelParam:24},{id:6,slots:[18,0],levelParam:42},{id:7,slots:[23],levelParam:13},{id:8,slots:[64,23],levelParam:24},{id:9,slots:[64,6],levelParam:36},{id:10,slots:[6,6,24,25],levelParam:42},{id:11,slots:[20,20],levelParam:5},{id:12,slots:[62,20],levelParam:13},{id:13,slots:[4,21],levelParam:24},{id:14,slots:[3,62],levelParam:42},{id:15,slots:[27,28],levelParam:13},{id:16,slots:[27,47],levelParam:24},{id:17,slots:[27,47],levelParam:36},{id:18,slots:[46,46,27],levelParam:42},{id:19,slots:[12,13],levelParam:36},{id:20,slots:[41,40],levelParam:36},{id:21,slots:[54,40],levelParam:42},{id:22,slots:[55,55],levelParam:42},{id:23,slots:[31,32,31],levelParam:54},{id:24,slots:[34,35],levelParam:36},{id:25,slots:[36,52],levelParam:42},{id:26,slots:[15,37],levelParam:24},{id:27,slots:[15,37],levelParam:36},{id:28,slots:[15,53,69],levelParam:42},{id:29,slots:[69,70,29],levelParam:54},{id:30,slots:[65],levelParam:36},{id:31,slots:[65],levelParam:42},{id:32,slots:[65,66,29],levelParam:54},{id:33,slots:[72,72,73,43],levelParam:54}
  ];
  function wildLevelRange(levelParam){const q=Math.floor(levelParam/4),min=levelParam-q-1,max=levelParam-2;return min===max?String(min):`${min}–${max}`;}
  function makeWildPool(raw){const counts=new Map();for(const id of raw.slots)counts.set(id,(counts.get(id)||0)+1);const weights=[...counts.entries()].map(([id,count])=>({id,count,probability:count/raw.slots.length,name:FAIRY_BY_ID.get(id)?.name||`Fairy ${id}`}));const species=weights.map(x=>x.name).join(' / ');return{id:raw.id,name:`Пул ${raw.id}: ${species}`,slots:[...raw.slots],fairies:weights.map(x=>x.id),weights,confirmed:true,levelParam:raw.levelParam,levelRange:wildLevelRange(raw.levelParam),source:'zanthp.exe 0x00476102'};}
  const WILD_POOLS=WILD_POOL_RAW.map(makeWildPool);
  const WILD_POOL_BY_ID = new Map(WILD_POOLS.map(x=>[x.id,x]));
  function wildFromScene(bytes,catalog){
    const tr=parseTriggers(bytes),sc=parseSceneItems(bytes);if(!tr||!sc)return{triggers:tr,scene:sc,wilds:[]};
    const trByIdx=new Map(tr.items.map(t=>[t.idx,t])),byUid=new Map((catalog||[]).map(n=>[n.uid>>>0,n])),out=[];
    for(const si of sc.items){if(si.i2!==4)continue;const t=trByIdx.get(si.i1);if(!t||t.type!==1||t.ii!==8)continue;if((t.ii1>>>0)===WILD_UID){const pool=WILD_POOL_BY_ID.get(t.ii4)||{id:t.ii4,name:`Пул ${t.ii4}`,fairies:[],confirmed:false};out.push({kind:'wild',sceneItem:si,trigger:t,poolId:t.ii4,pool,name:pool.name,position:t.vv,chance:t.ii3,radius:t.int,rawMode:t.ii2});continue;}const npc=byUid.get(t.ii1>>>0);if(!npc||!npc.isWildEnemyProfile)continue;const rp=npc.randomProfile||randomProfileFromEntry(npc.entry),ids=rp?.fairyIds||[],names=ids.map(id=>FAIRY_BY_ID.get(id)?.name||('Fairy '+id)),name=`Custom: ${names.join(' / ')||npc.name} [ур. ${rp?rp.minLevel+'–'+rp.maxLevel:'?'}]`;out.push({kind:'wild',sceneItem:si,trigger:t,poolId:null,pool:{id:null,name,customFbs:true,profile:npc,levelRange:rp?`${rp.minLevel}–${rp.maxLevel}`:'?'},name,position:t.vv,chance:t.ii3,radius:t.int,rawMode:t.ii2,customProfile:npc});}
    return{triggers:tr,scene:sc,wilds:out};
  }
  function addWild(bytes,params,prototype){const tr=parseTriggers(bytes),sc=parseSceneItems(bytes);if(!tr||!sc)throw new Error('В сцене нет Triggers/Scene');const used=new Set(tr.items.map(x=>x.idx));let idx=0;while(used.has(idx))idx++;const p=prototype?JSON.parse(JSON.stringify(prototype)):{type:1,someFlag:0,v:{x:0,y:-0.2,z:1},ii:8,ii1:WILD_UID,ii2:0,ii3:50,ii4:0,s:'',int:5};const t={idx,type:1,someFlag:p.someFlag||0,v:p.v||{x:0,y:-0.2,z:1},ii:8,ii1:WILD_UID,ii2:params.rawMode!==undefined?+params.rawMode:(p.ii2||0),ii3:+params.chance,ii4:+(params.poolId!==undefined?params.poolId:params.fairyId),s:p.s||'',vv:{x:+params.position.x,y:+params.position.y,z:+params.position.z},int:+params.radius};tr.items.push(t);sc.items.push({s:'',i1:idx,i2:4});return patchScene(bytes,tr,sc);}
  function updateWild(bytes,wild,params){const tr=parseTriggers(bytes),sc=parseSceneItems(bytes);const t=tr.items.find(x=>x.idx===wild.trigger.idx);if(!t)throw new Error('Точка дикой феи не найдена после повторного чтения');t.type=1;t.ii=8;t.ii1=WILD_UID;t.vv={x:+params.position.x,y:+params.position.y,z:+params.position.z};t.ii4=+(params.poolId!==undefined?params.poolId:params.fairyId);t.ii3=+params.chance;t.int=+params.radius;if(params.rawMode!==undefined)t.ii2=+params.rawMode;return patchScene(bytes,tr,sc);}
  function deleteWild(bytes,wild){const tr=parseTriggers(bytes),sc=parseSceneItems(bytes),idx=wild.trigger.idx;tr.items=tr.items.filter(x=>x.idx!==idx);sc.items=sc.items.filter(x=>!(x.i2===4&&x.i1===idx));return patchScene(bytes,tr,sc);}

  const CUSTOM_POOL_MIN=34,CUSTOM_POOL_MAX=255;
  const CUSTOM_POOL_IDS=Array.from({length:CUSTOM_POOL_MAX-CUSTOM_POOL_MIN+1},(_,i)=>CUSTOM_POOL_MIN+i);
  const ZANTHP_EXPECTED_SIZE=2170880;
  const ZANTHP_BASE=0x400000,ZANTHP_POOL_FN=0x476102,ZANTHP_ORIG_TABLE_JMP=0x476118,ZANTHP_POOL_EXIT=0x4767A6;
  const ZANTHP_CAVE=0x5A5100,ZANTHP_META=0x5A5200,ZANTHP_META_RECORDS=ZANTHP_META+16;
  const ZANTHP_HELP_MAKE=0x499D1E,ZANTHP_HELP_ADD=0x46E038;
  const ZANTHP_META_MAGIC_V1='ZEECPV1\0',ZANTHP_META_MAGIC='ZEECPV2\0';
  const ZANTHP_V1_META=0x5A5D00,ZANTHP_V1_COUNT=12;
  const CUSTOM_RECORD_SIZE=12;
  function rel32(srcNext,dst){ return (dst-srcNext)>>>0; }
  function putU32(a,o,v){a[o]=v&255;a[o+1]=(v>>>8)&255;a[o+2]=(v>>>16)&255;a[o+3]=(v>>>24)&255;}
  function getU32(a,o){return (a[o]|(a[o+1]<<8)|(a[o+2]<<16)|(a[o+3]<<24))>>>0;}
  function vaOff(va){return va-ZANTHP_BASE;}
  function defaultCustomPools(){return CUSTOM_POOL_IDS.map(id=>({id,enabled:false,levelParam:5,slots:[0]}));}
  function normalizeCustomPool(c){const id=Math.max(CUSTOM_POOL_MIN,Math.min(CUSTOM_POOL_MAX,+c.id||CUSTOM_POOL_MIN)),levelParam=Math.max(5,Math.min(80,+c.levelParam||5));let slots=(c.slots||[]).map(Number).filter(Number.isFinite).map(x=>Math.max(0,Math.min(255,x|0))).slice(0,8);if(!slots.length)slots=[0];return{id,enabled:!!c.enabled,levelParam,slots};}
  function isOriginalZanthp(bytes){if(!bytes||bytes.length!==ZANTHP_EXPECTED_SIZE)return false;const o=vaOff(ZANTHP_POOL_FN),sig=[0x55,0x8B,0xEC,0x81,0xEC,0x28,0x01,0x00,0x00,0x8B,0x45,0x08,0x83,0xF8,0x21,0x56];return sig.every((v,i)=>bytes[o+i]===v);}
  function hasMagicAt(bytes,va,magic){if(!bytes||bytes.length!==ZANTHP_EXPECTED_SIZE)return false;const o=vaOff(va);return [...magic].every((ch,i)=>bytes[o+i]===ch.charCodeAt(0));}
  function customPatchVersion(bytes){if(!bytes||bytes.length!==ZANTHP_EXPECTED_SIZE||bytes[vaOff(ZANTHP_POOL_FN)]!==0xE9)return 0;if(hasMagicAt(bytes,ZANTHP_META,ZANTHP_META_MAGIC))return 2;if(hasMagicAt(bytes,ZANTHP_V1_META,ZANTHP_META_MAGIC_V1))return 1;return 0;}
  function hasCustomPoolPatch(bytes){return customPatchVersion(bytes)>0;}
  function buildCustomDispatcherV2(){
    const b=[],labels=new Map(),fix=[];let cur=ZANTHP_CAVE;
    const emit=(...xs)=>{b.push(...xs);cur+=xs.length},u32=v=>emit(v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255);
    const label=n=>labels.set(n,cur),j32=(op,n)=>{emit(...op);const at=b.length;u32(0);fix.push({at,srcNext:cur,label:n})};
    const call=dst=>{emit(0xE8);u32(rel32(cur+4,dst))};
    emit(0x55,0x8B,0xEC,0x81,0xEC,0x28,0x01,0x00,0x00);emit(0x8B,0x45,0x08);emit(0x56);emit(0x83,0xF8,0x21);j32([0x0F,0x86],'orig');emit(0x3D);u32(CUSTOM_POOL_MAX);j32([0x0F,0x87],'exit');emit(0x83,0xE8,CUSTOM_POOL_MIN);emit(0x6B,0xC0,CUSTOM_RECORD_SIZE);emit(0x05);u32(ZANTHP_META_RECORDS);emit(0x80,0x38,0x00);j32([0x0F,0x84],'exit');emit(0x89,0x85,0xE0,0xFE,0xFF,0xFF);emit(0x0F,0xB6,0x48,0x02);emit(0x89,0x8D,0xDC,0xFE,0xFF,0xFF);emit(0xC7,0x85,0xD8,0xFE,0xFF,0xFF);u32(0);label('loop');emit(0x8B,0x85,0xD8,0xFE,0xFF,0xFF);emit(0x3B,0x85,0xDC,0xFE,0xFF,0xFF);j32([0x0F,0x83],'done');emit(0x8B,0x8D,0xE0,0xFE,0xFF,0xFF);emit(0x0F,0xB6,0x44,0x01,0x04);emit(0x50,0x6A,0x02);emit(0x8B,0x95,0xD8,0xFE,0xFF,0xFF);emit(0xC1,0xE2,0x03);emit(0x8D,0x4D,0xFC);emit(0x2B,0xCA);call(ZANTHP_HELP_MAKE);emit(0x8B,0x4D,0x0C,0x50);call(ZANTHP_HELP_ADD);emit(0xFF,0x85,0xD8,0xFE,0xFF,0xFF);j32([0xE9],'loop');label('done');emit(0x8B,0x8D,0xE0,0xFE,0xFF,0xFF);emit(0x0F,0xB6,0x49,0x01);emit(0x8B,0x45,0x10);emit(0x89,0x08);j32([0xE9],'exit');label('orig');j32([0xE9],'orig_abs');label('exit');j32([0xE9],'exit_abs');labels.set('orig_abs',ZANTHP_ORIG_TABLE_JMP);labels.set('exit_abs',ZANTHP_POOL_EXIT);
    for(const f of fix){const dst=labels.get(f.label);if(dst==null)throw new Error('Assembler label missing: '+f.label);const v=rel32(f.srcNext,dst);b[f.at]=v&255;b[f.at+1]=(v>>>8)&255;b[f.at+2]=(v>>>16)&255;b[f.at+3]=(v>>>24)&255;}
    return new Uint8Array(b);
  }
  function writeCustomMetaV2(out,configs){const o=vaOff(ZANTHP_META),end=vaOff(0x5A6000);out.fill(0,o,end);for(let i=0;i<ZANTHP_META_MAGIC.length;i++)out[o+i]=ZANTHP_META_MAGIC.charCodeAt(i);out[o+8]=2;putU32(out,o+9,CUSTOM_POOL_IDS.length);out[o+13]=CUSTOM_RECORD_SIZE;const map=new Map((configs||[]).map(c=>[+c.id,normalizeCustomPool(c)]));let q=vaOff(ZANTHP_META_RECORDS);for(const id of CUSTOM_POOL_IDS){const c=map.get(id)||{id,enabled:false,levelParam:5,slots:[0]};out[q]=c.enabled?1:0;out[q+1]=c.levelParam;out[q+2]=c.slots.length;out[q+3]=0;for(let j=0;j<8;j++)out[q+4+j]=(c.slots[j]??0)&255;q+=CUSTOM_RECORD_SIZE;}}
  function readV1CustomPools(bytes){const out=[],o=vaOff(ZANTHP_V1_META);let q=o+16;for(let i=0;i<ZANTHP_V1_COUNT;i++){const id=bytes[q],enabled=!!bytes[q+1],levelParam=bytes[q+2],n=Math.max(1,Math.min(8,bytes[q+3]));const slots=[];for(let j=0;j<n;j++)slots.push(bytes[q+4+j*2]|(bytes[q+5+j*2]<<8));out.push({id,enabled,levelParam,slots});q+=20;}return out;}
  function readZanthpCustomPools(bytes){const ver=customPatchVersion(bytes);if(!ver)return null;const base=defaultCustomPools();if(ver===1){const old=readV1CustomPools(bytes),m=new Map(old.map(c=>[c.id,c]));return base.map(c=>m.get(c.id)||c);}const out=[],o=vaOff(ZANTHP_META),count=Math.min(CUSTOM_POOL_IDS.length,getU32(bytes,o+9)||CUSTOM_POOL_IDS.length),recSize=bytes[o+13]||CUSTOM_RECORD_SIZE;let q=vaOff(ZANTHP_META_RECORDS);for(let i=0;i<count;i++){const id=CUSTOM_POOL_MIN+i,enabled=!!bytes[q],levelParam=bytes[q+1]||5,n=Math.max(1,Math.min(8,bytes[q+2]||1));const slots=[];for(let j=0;j<n;j++)slots.push(bytes[q+4+j]);out.push({id,enabled,levelParam,slots});q+=recSize;}while(out.length<CUSTOM_POOL_IDS.length){const id=CUSTOM_POOL_MIN+out.length;out.push({id,enabled:false,levelParam:5,slots:[0]});}return out;}
  function patchZanthpCustomPools(bytes,configs){const ver=customPatchVersion(bytes);if(!(isOriginalZanthp(bytes)||ver))throw new Error('Этот zanthp.exe не совпадает с поддерживаемой версией (ожидается EXE 2 170 880 байт и оригинальная функция wild pool).');let merged=configs||[];if(ver===1){const old=readV1CustomPools(bytes),m=new Map(old.map(c=>[c.id,c]));for(const c of merged)m.set(+c.id,c);merged=[...m.values()];}const out=new Uint8Array(bytes);const pe=getU32(out,0x3C),optSize=out[pe+20]|(out[pe+21]<<8),sec=pe+24+optSize,rwc=sec+40;putU32(out,rwc+8,0x1000);const eo=vaOff(ZANTHP_POOL_FN);out[eo]=0xE9;putU32(out,eo+1,rel32(ZANTHP_POOL_FN+5,ZANTHP_CAVE));out.fill(0x90,vaOff(ZANTHP_CAVE),vaOff(ZANTHP_META));const disp=buildCustomDispatcherV2();if(ZANTHP_CAVE+disp.length>=ZANTHP_META)throw new Error('Dispatcher v2 не помещается в code cave');out.set(disp,vaOff(ZANTHP_CAVE));writeCustomMetaV2(out,merged);return out;}

  function hex32(v){ return (v>>>0).toString(16).toUpperCase().padStart(8,'0'); }

  return {FAIRIES,FAIRY_BY_ID,ITEMS,ITEM_BY_MODEL,WILD_UID,WILD_ACTOR_UID,WILD_POOLS,WILD_POOL_BY_ID,CUSTOM_POOL_IDS,wildLevelRange,defaultCustomPools,isOriginalZanthp,hasCustomPoolPatch,customPatchVersion,readZanthpCustomPools,patchZanthpCustomPools,Reader,Writer,parseIndex,parseDatabase,serializeDatabase,fieldByColumn,fieldString,attackDialogUidFromEntry,setAttackDialogUid,cloneDialogueForNpc,dialogTextByUid,appearanceCodeFromEntry,setAppearanceCode,setActorUidFromEntry,buildNpcCatalog,teamFromEntry,setTeam,deckVariantsFromEntry,setDeckVariants,groupAttackFromEntry,setGroupAttack,cloneNpcProfile,createVisibleElfEnemy,actorUidFromEntry,isBattleReadyEnemyEntry,randomProfileFromEntry,setRandomFairyRange,setRandomPoolRange,createCustomWildEnemy,createCustomWildPoolEnemy,createCustomShadowElf,parseTriggers,parseMisc,parseSceneItems,parseModelsV3,parseBehaviours,patchScene,setLinkedGroupScript,setLinkedGroupCleanup,addLinkedGroupSupport,setOrAddAppearanceCode,setSc0203LeaderRole,setSc0203SupportRole,addSc0203Support,addSc0203Leader,placementsFromScene,addPlacement,updatePlacement,deletePlacement,deleteNpcProfile,deletePlacementsByUids,itemsFromScene,addItem,addItems,updateItem,deleteItem,wildFromScene,addWild,updateWild,deleteWild,hex32};
});
