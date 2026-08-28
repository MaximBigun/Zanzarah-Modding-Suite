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
    models.items.push({idx,fileName,position:{x:+position.x,y:+position.y,z:+position.z},rotation:p.rotation,scaleX:p.scaleX,scaleY:p.scaleY,scaleZ:p.scaleZ,color:p.color,i1:p.i1,i15:p.i15,i2:p.i2});
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
      models.items.push({idx,fileName,position:{x:+position.x,y:+position.y,z:+position.z},rotation:{...p.rotation},scaleX:p.scaleX,scaleY:p.scaleY,scaleZ:p.scaleZ,color:Uint8Array.from(p.color),i1:p.i1,i15:p.i15,i2:p.i2});
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
    // Собственный диапазон редактора. UID нужен только как связка FBS <-> SCN.
    for(let uid=0xE5000001;uid<=0xE500FFFF;uid++)if(!used.has(uid>>>0))return uid>>>0;
    throw new Error('Закончился диапазон UID для Custom Shadow Elf');
  }
  function createCustomShadowElf(db,team){
    const base=db.entries.find(e=>internalName(e)==='_ShadowElf');
    if(!base)throw new Error('В _fb0x05.fbs не найден оригинальный _ShadowElf');
    const entry=cloneDbEntry(base), name=nextCustomShadowName(db), uid=nextCustomShadowUid(db);
    entry.uid=uid;
    const nameField=fieldByColumn(entry,19);
    if(!nameField||nameField.type!==0)throw new Error('У _ShadowElf не найдено внутреннее имя (column 19)');
    nameField._modifiedString=name;
    // Ключевое отличие от оригинального _ShadowElf: удаляем динамические U/n-блоки
    // из Script2 и превращаем запись в обычного NPC с фиксированной W-командой.
    const script2=fieldByColumn(entry,25);
    if(!script2||script2.type!==0)throw new Error('У _ShadowElf не найден Script2 (column 25)');
    script2._modifiedString='C.u002s02m\n';
    setTeam(entry,team||[]);
    db.entries.push(entry);
    return {index:db.entries.length-1,uid,name,team:teamFromEntry(entry),entry,isCustomShadowElf:true};
  }

  function buildNpcCatalog(db){ return db.entries.map((entry,index)=>{const name=internalName(entry);return {index,uid:entry.uid>>>0,name,team:teamFromEntry(entry),entry,isCustomShadowElf:/^_CustomShadowElf_\d+$/i.test(name)}}).filter(x=>x.name); }
  function placementsFromScene(bytes,catalog){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); if(!tr||!sc) return {triggers:tr,scene:sc,placements:[]};
    const byUid=new Map(catalog.map(n=>[n.uid>>>0,n])); const trByIdx=new Map(tr.items.map(t=>[t.idx,t])); const out=[];
    for(const si of sc.items){
      if(si.i2!==4) continue; const t=trByIdx.get(si.i1); if(!t||(t.type!==2&&t.type!==1)) continue; const npc=byUid.get(t.ii1>>>0);
      if(npc && (t.ii1>>>0)!==WILD_UID) out.push({kind:'npc',sceneItem:si,trigger:t,npc,name:si.s||npc.name,position:t.vv,attackRadius:t.type===1?Math.max(0,+t.int||0):0,hostileTrigger:t.type===1});
    }
    return {triggers:tr,scene:sc,placements:out};
  }

  function addPlacement(bytes,npc,position,prototype,attackRadius=0){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); if(!tr||!sc) throw new Error('В сцене нет Triggers/Scene');
    const used=new Set(tr.items.map(x=>x.idx)); let idx=0; while(used.has(idx)) idx++;
    const p=prototype ? JSON.parse(JSON.stringify(prototype)) : {type:2,someFlag:0,v:{x:0,y:0,z:1},ii:3,ii2:0,ii3:0,ii4:0,s:''};
    const radius=Math.max(0,+attackRadius||0), type=radius>0?1:2;
    const t={idx,type,someFlag:p.someFlag||0,v:p.v||{x:0,y:0,z:1},ii:p.ii||3,ii1:npc.uid>>>0,ii2:p.ii2||0,ii3:p.ii3||0,ii4:p.ii4||0,s:p.s||'',vv:{x:+position.x,y:+position.y,z:+position.z}};
    if(type===1)t.int=radius;
    tr.items.push(t); sc.items.push({s:npc.name,i1:idx,i2:4});
    return patchScene(bytes,tr,sc);
  }
  function updatePlacement(bytes, placement, npc, position, direction, attackRadius){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); const t=tr.items.find(x=>x.idx===placement.trigger.idx); const si=sc.items.find(x=>x.i2===4&&x.i1===placement.trigger.idx);
    if(!t||!si) throw new Error('Размещение не найдено после повторного чтения');
    t.ii1=npc.uid>>>0; t.vv={x:+position.x,y:+position.y,z:+position.z}; if(direction) t.v={x:+direction.x,y:+direction.y,z:+direction.z}; si.s=npc.name;
    if(attackRadius!==undefined){const radius=Math.max(0,+attackRadius||0); if(radius>0){t.type=1;t.int=radius;}else{t.type=2;delete t.int;}}
    return patchScene(bytes,tr,sc);
  }
  function deletePlacement(bytes,placement){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes), idx=placement.trigger.idx;
    tr.items=tr.items.filter(x=>x.idx!==idx); sc.items=sc.items.filter(x=>!(x.i2===4&&x.i1===idx&&x.s===placement.sceneItem.s)); return patchScene(bytes,tr,sc);
  }


  const WILD_UID = 0x902391A4;
  // ii4 у wild-trigger — индекс encounter-пула (0..33).
  // Таблица ниже статически извлечена из zanthp.exe, функция 0x00476102.
  // Каждый элемент slots — отдельная запись в списке выбора; повторы дают больший вес.
  // levelParam — внутренний параметр M. Игра вычисляет q=floor(M/4),
  // internalLevel=(M-q)+random(q), а отображаемый уровень равен internalLevel-1.
  const WILD_POOL_RAW = [
    {id:0,  slots:[9,26],          levelParam:5},
    {id:1,  slots:[10,75],         levelParam:13},
    {id:2,  slots:[57,1,0],        levelParam:36},
    {id:3,  slots:[50,57],         levelParam:42},
    {id:4,  slots:[18,10],         levelParam:13},
    {id:5,  slots:[9,19],          levelParam:24},
    {id:6,  slots:[18,0],          levelParam:42},
    {id:7,  slots:[23],            levelParam:13},
    {id:8,  slots:[64,23],         levelParam:24},
    {id:9,  slots:[64,6],          levelParam:36},
    {id:10, slots:[6,6,24,25],     levelParam:42},
    {id:11, slots:[20,20],         levelParam:5},
    {id:12, slots:[62,20],         levelParam:13},
    {id:13, slots:[4,21],          levelParam:24},
    {id:14, slots:[3,62],          levelParam:42},
    {id:15, slots:[27,28],         levelParam:13},
    {id:16, slots:[27,47],         levelParam:24},
    {id:17, slots:[27,47],         levelParam:36},
    {id:18, slots:[46,46,27],      levelParam:42},
    {id:19, slots:[12,13],         levelParam:36},
    {id:20, slots:[41,40],         levelParam:36},
    {id:21, slots:[54,40],         levelParam:42},
    {id:22, slots:[55,55],         levelParam:42},
    {id:23, slots:[31,32,31],      levelParam:54},
    {id:24, slots:[34,35],         levelParam:36},
    {id:25, slots:[36,52],         levelParam:42},
    {id:26, slots:[15,37],         levelParam:24},
    {id:27, slots:[15,37],         levelParam:36},
    {id:28, slots:[15,53,69],      levelParam:42},
    {id:29, slots:[69,70,29],      levelParam:54},
    {id:30, slots:[65],            levelParam:36},
    {id:31, slots:[65],            levelParam:42},
    {id:32, slots:[65,66,29],      levelParam:54},
    {id:33, slots:[72,72,73,43],   levelParam:54}
  ];
  function wildLevelRange(levelParam){
    const q=Math.floor(levelParam/4), min=levelParam-q-1, max=levelParam-2;
    return min===max?String(min):`${min}–${max}`;
  }
  function makeWildPool(raw){
    const counts=new Map(); for(const id of raw.slots)counts.set(id,(counts.get(id)||0)+1);
    const weights=[...counts.entries()].map(([id,count])=>({
      id,count,probability:count/raw.slots.length,
      name:FAIRY_BY_ID.get(id)?.name||`Fairy ${id}`
    }));
    const species=weights.map(x=>x.name).join(' / ');
    return {
      id:raw.id,name:`Пул ${raw.id}: ${species}`,slots:[...raw.slots],fairies:weights.map(x=>x.id),weights,
      confirmed:true,levelParam:raw.levelParam,levelRange:wildLevelRange(raw.levelParam),
      source:'zanthp.exe 0x00476102'
    };
  }
  const WILD_POOLS=WILD_POOL_RAW.map(makeWildPool);
  const WILD_POOL_BY_ID = new Map(WILD_POOLS.map(x=>[x.id,x]));
  function wildFromScene(bytes){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes);
    if(!tr||!sc) return {triggers:tr,scene:sc,wilds:[]};
    const trByIdx=new Map(tr.items.map(t=>[t.idx,t]));
    const out=[];
    for(const si of sc.items){
      if(si.i2!==4) continue;
      const t=trByIdx.get(si.i1);
      if(!t||t.type!==1||t.ii!==8||(t.ii1>>>0)!==WILD_UID) continue;
      const pool=WILD_POOL_BY_ID.get(t.ii4)||{id:t.ii4,name:`Пул ${t.ii4}`,fairies:[],confirmed:false};
      out.push({kind:'wild',sceneItem:si,trigger:t,poolId:t.ii4,pool,name:pool.name,position:t.vv,chance:t.ii3,radius:t.int,rawMode:t.ii2});
    }
    return {triggers:tr,scene:sc,wilds:out};
  }
  function addWild(bytes,params,prototype){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); if(!tr||!sc) throw new Error('В сцене нет Triggers/Scene');
    const used=new Set(tr.items.map(x=>x.idx)); let idx=0; while(used.has(idx)) idx++;
    const p=prototype ? JSON.parse(JSON.stringify(prototype)) : {type:1,someFlag:0,v:{x:0,y:-0.2,z:1},ii:8,ii1:WILD_UID,ii2:0,ii3:50,ii4:0,s:'',int:5};
    const t={idx,type:1,someFlag:p.someFlag||0,v:p.v||{x:0,y:-0.2,z:1},ii:8,ii1:WILD_UID,ii2:params.rawMode!==undefined?+params.rawMode:(p.ii2||0),ii3:+params.chance,ii4:+(params.poolId!==undefined?params.poolId:params.fairyId),s:p.s||'',vv:{x:+params.position.x,y:+params.position.y,z:+params.position.z},int:+params.radius};
    tr.items.push(t); sc.items.push({s:'',i1:idx,i2:4});
    return patchScene(bytes,tr,sc);
  }
  function updateWild(bytes,wild,params){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes); const t=tr.items.find(x=>x.idx===wild.trigger.idx);
    if(!t) throw new Error('Точка дикой феи не найдена после повторного чтения');
    t.vv={x:+params.position.x,y:+params.position.y,z:+params.position.z}; t.ii4=+(params.poolId!==undefined?params.poolId:params.fairyId); t.ii3=+params.chance; t.int=+params.radius;
    if(params.rawMode!==undefined) t.ii2=+params.rawMode;
    return patchScene(bytes,tr,sc);
  }
  function deleteWild(bytes,wild){
    const tr=parseTriggers(bytes), sc=parseSceneItems(bytes), idx=wild.trigger.idx;
    tr.items=tr.items.filter(x=>x.idx!==idx); sc.items=sc.items.filter(x=>!(x.i2===4&&x.i1===idx));
    return patchScene(bytes,tr,sc);
  }

  // Experimental zanthp.exe custom encounter-pool patch.
  // Original function 0x00476102 accepts only pool 0..33. We redirect its entry
  // to executable slack in _rwcseg, keep 0..33 on the original jump table and
  // add 12 new pool IDs 34..45. Each custom pool can contain up to 8 weighted slots.
  const CUSTOM_POOL_IDS=Array.from({length:12},(_,i)=>34+i);
  const ZANTHP_EXPECTED_SIZE=2170880;
  const ZANTHP_BASE=0x400000, ZANTHP_POOL_FN=0x476102, ZANTHP_ORIG_TABLE_JMP=0x476118, ZANTHP_POOL_EXIT=0x4767A6;
  const ZANTHP_CAVE=0x5A5100, ZANTHP_CUSTOM_TABLE=0x5A5140, ZANTHP_STUB_START=0x5A5180, ZANTHP_META=0x5A5D00;
  const ZANTHP_HELP_MAKE=0x499D1E, ZANTHP_HELP_ADD=0x46E038;
  const ZANTHP_META_MAGIC='ZEECPV1\0';
  function rel32(srcNext,dst){ return (dst-srcNext)>>>0; }
  function putU32(a,o,v){a[o]=v&255;a[o+1]=(v>>>8)&255;a[o+2]=(v>>>16)&255;a[o+3]=(v>>>24)&255;}
  function getU32(a,o){return (a[o]|(a[o+1]<<8)|(a[o+2]<<16)|(a[o+3]<<24))>>>0;}
  function vaOff(va){return va-ZANTHP_BASE;}
  function defaultCustomPools(){return CUSTOM_POOL_IDS.map(id=>({id,enabled:false,levelParam:5,slots:[0]}));}
  function normalizeCustomPool(c){
    const id=+c.id, levelParam=Math.max(5,Math.min(80,+c.levelParam||5));
    let slots=(c.slots||[]).map(Number).filter(Number.isFinite).map(x=>x>>>0).slice(0,8);
    if(!slots.length)slots=[0];
    return {id,enabled:!!c.enabled,levelParam,slots};
  }
  function isOriginalZanthp(bytes){
    if(!bytes||bytes.length!==ZANTHP_EXPECTED_SIZE)return false;
    const o=vaOff(ZANTHP_POOL_FN), sig=[0x55,0x8B,0xEC,0x81,0xEC,0x28,0x01,0x00,0x00,0x8B,0x45,0x08,0x83,0xF8,0x21,0x56];
    return sig.every((v,i)=>bytes[o+i]===v);
  }
  function hasCustomPoolPatch(bytes){
    if(!bytes||bytes.length!==ZANTHP_EXPECTED_SIZE)return false;
    const o=vaOff(ZANTHP_META);
    for(let i=0;i<ZANTHP_META_MAGIC.length;i++)if(bytes[o+i]!==ZANTHP_META_MAGIC.charCodeAt(i))return false;
    return bytes[vaOff(ZANTHP_POOL_FN)]===0xE9;
  }
  function buildCustomStub(addr,cfg){
    const b=[], emit=(...xs)=>b.push(...xs), u32=v=>emit(v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255);
    let cur=addr; const call=dst=>{emit(0xE8);u32(rel32(cur+5,dst));cur+=5};
    const local=[0xFC,0xF4,0xEC,0xE4,0xDC,0xD4,0xCC,0xC4];
    for(let i=0;i<cfg.slots.length;i++){
      emit(0x68);u32(cfg.slots[i]);cur+=5;             // push fairy id
      emit(0x6A,0x02);cur+=2;                          // push 2
      emit(0x8D,0x4D,local[i]);cur+=3;                 // lea ecx,[ebp-local]
      call(ZANTHP_HELP_MAKE);
      emit(0x8B,0x4D,0x0C);cur+=3;                    // mov ecx,[ebp+0Ch]
      emit(0x50);cur+=1;                               // push eax
      call(ZANTHP_HELP_ADD);
    }
    emit(0x8B,0x45,0x10);cur+=3;                      // mov eax,[ebp+10h]
    emit(0xC7,0x00);u32(cfg.levelParam);cur+=6;        // mov dword [eax],M
    emit(0xE9);u32(rel32(cur+5,ZANTHP_POOL_EXIT));cur+=5;
    return new Uint8Array(b);
  }
  function buildCustomDispatcher(maxId){
    const b=[], emit=(...xs)=>b.push(...xs), u32=v=>emit(v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255);
    let cur=ZANTHP_CAVE;
    emit(0x55,0x8B,0xEC,0x81,0xEC,0x28,0x01,0x00,0x00);cur+=9; // original prologue
    emit(0x8B,0x45,0x08);cur+=3;                                    // eax=pool
    emit(0x83,0xF8,maxId&255);cur+=3;                               // cmp eax,max
    emit(0x56);cur+=1;                                               // push esi
    emit(0x0F,0x87);u32(rel32(cur+6,ZANTHP_POOL_EXIT));cur+=6;      // ja exit
    emit(0x83,0xF8,0x21);cur+=3;                                    // cmp eax,33
    emit(0x0F,0x86);u32(rel32(cur+6,ZANTHP_ORIG_TABLE_JMP));cur+=6; // jbe original table
    emit(0x83,0xE8,0x22);cur+=3;                                    // sub eax,34
    emit(0xFF,0x24,0x85);u32(ZANTHP_CUSTOM_TABLE);cur+=7;            // jmp [eax*4+table]
    return new Uint8Array(b);
  }
  function writeCustomMeta(out,configs){
    const o=vaOff(ZANTHP_META); out.fill(0,o,o+0x200);
    for(let i=0;i<ZANTHP_META_MAGIC.length;i++)out[o+i]=ZANTHP_META_MAGIC.charCodeAt(i);
    out[o+8]=1; out[o+9]=CUSTOM_POOL_IDS.length;
    let q=o+16;
    for(const raw of configs){const c=normalizeCustomPool(raw);out[q]=c.id;out[q+1]=c.enabled?1:0;out[q+2]=c.levelParam;out[q+3]=c.slots.length;for(let j=0;j<8;j++){const v=c.slots[j]??0;out[q+4+j*2]=v&255;out[q+5+j*2]=(v>>>8)&255;}q+=20;}
  }
  function readZanthpCustomPools(bytes){
    if(!hasCustomPoolPatch(bytes))return null; const out=[],o=vaOff(ZANTHP_META);let q=o+16;
    for(let i=0;i<CUSTOM_POOL_IDS.length;i++){const id=bytes[q],enabled=!!bytes[q+1],levelParam=bytes[q+2],n=Math.max(1,Math.min(8,bytes[q+3]));const slots=[];for(let j=0;j<n;j++)slots.push(bytes[q+4+j*2]|(bytes[q+5+j*2]<<8));out.push({id,enabled,levelParam,slots});q+=20;}
    return out;
  }
  function patchZanthpCustomPools(bytes,configs){
    if(!(isOriginalZanthp(bytes)||hasCustomPoolPatch(bytes)))throw new Error('Этот zanthp.exe не совпадает с поддерживаемой версией (ожидается EXE 2 170 880 байт и оригинальная функция wild pool).');
    const cfgMap=new Map((configs||[]).map(c=>[+c.id,normalizeCustomPool(c)]));
    const cfgs=CUSTOM_POOL_IDS.map(id=>cfgMap.get(id)||{id,enabled:false,levelParam:5,slots:[0]});
    const out=new Uint8Array(bytes);
    // Expand _rwcseg VirtualSize from 0xDC to 0x1000 (no section movement; raw size already 0x1000).
    const pe=getU32(out,0x3C), optSize=out[pe+20]|(out[pe+21]<<8), sec=pe+24+optSize, rwc=sec+40; putU32(out,rwc+8,0x1000);
    // Function entry -> dispatcher.
    const eo=vaOff(ZANTHP_POOL_FN); out[eo]=0xE9;putU32(out,eo+1,rel32(ZANTHP_POOL_FN+5,ZANTHP_CAVE));
    // Clear our executable slack and write dispatcher/table/stubs.
    out.fill(0x90,vaOff(ZANTHP_CAVE),vaOff(ZANTHP_META));
    const disp=buildCustomDispatcher(CUSTOM_POOL_IDS[CUSTOM_POOL_IDS.length-1]);out.set(disp,vaOff(ZANTHP_CAVE));
    let addr=ZANTHP_STUB_START; const ptrs=[];
    for(const cfg0 of cfgs){const cfg=cfg0.enabled?cfg0:{...cfg0,slots:[0],levelParam:5};const stub=buildCustomStub(addr,cfg);if(addr+stub.length>=ZANTHP_META)throw new Error('Кастомные пулы не помещаются в code cave');out.set(stub,vaOff(addr));ptrs.push(addr);addr=(addr+stub.length+15)&~15;}
    for(let i=0;i<ptrs.length;i++)putU32(out,vaOff(ZANTHP_CUSTOM_TABLE)+i*4,ptrs[i]);
    writeCustomMeta(out,cfgs);
    return out;
  }

  function hex32(v){ return (v>>>0).toString(16).toUpperCase().padStart(8,'0'); }

  return {FAIRIES,FAIRY_BY_ID,ITEMS,ITEM_BY_MODEL,WILD_UID,WILD_POOLS,WILD_POOL_BY_ID,CUSTOM_POOL_IDS,wildLevelRange,defaultCustomPools,isOriginalZanthp,hasCustomPoolPatch,readZanthpCustomPools,patchZanthpCustomPools,Reader,Writer,parseIndex,parseDatabase,serializeDatabase,buildNpcCatalog,teamFromEntry,setTeam,createCustomShadowElf,parseTriggers,parseMisc,parseSceneItems,parseModelsV3,parseBehaviours,patchScene,placementsFromScene,addPlacement,updatePlacement,deletePlacement,itemsFromScene,addItem,addItems,updateItem,deleteItem,wildFromScene,addWild,updateWild,deleteWild,hex32};
});
