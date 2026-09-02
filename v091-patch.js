'use strict';
// ZMS v0.9.1 UI/runtime patch: 8 custom pool species + direct zanthp.exe overwrite.
(function(){
  const $=id=>document.getElementById(id);
  function addMissingRows(){
    const rows=$('customRows'); if(!rows)return;
    for(let i=rows.querySelectorAll('.customrow').length;i<8;i++){
      const d=document.createElement('div');d.className='customrow';
      d.innerHTML=`<label>Фея ${i+1}<select data-cfairy="${i}"></select></label><label>Вес<input data-cweight="${i}" type="number" min="0" max="8" step="1" value="0"></label>`;
      rows.appendChild(d);const sel=d.querySelector('select');
      for(const f of ZEE.FAIRIES){const o=document.createElement('option');o.value=f.id;o.textContent=`${f.id}: ${f.name}`;sel.appendChild(o)}
    }
  }
  function readPool8(){
    const id=+$('customPoolId').value,enabled=$('customEnabled').checked,levelParam=Math.max(5,Math.min(80,+$('customLevelRange').value||5));
    let manualMin=null,manualMax=null;
    if($('customLevelMode').value==='manual'){manualMin=Math.max(1,Math.min(99,+$('customMinLevel').value||1));manualMax=Math.max(1,Math.min(99,+$('customMaxLevel').value||manualMin));if(manualMax<manualMin)[manualMin,manualMax]=[manualMax,manualMin]}
    const slots=[];for(let i=0;i<8;i++){const s=document.querySelector(`[data-cfairy="${i}"]`),wq=document.querySelector(`[data-cweight="${i}"]`);if(!s||!wq)continue;const fid=+s.value,w=Math.max(0,Math.min(8,+wq.value||0));for(let j=0;j<w;j++)slots.push(fid)}
    if(slots.length>8)throw new Error(`Сумма весов ${slots.length}. Максимум — 8.`);if(enabled&&!slots.length)throw new Error('У активного кастомного пула должна быть хотя бы одна фея.');
    return{id,enabled,levelParam,slots:slots.length?slots:[0],manualMin,manualMax};
  }
  function saveCurrent(){const cfg=readPool8(),i=state.customPools.findIndex(x=>x.id===cfg.id);if(i>=0)state.customPools[i]=cfg;else state.customPools.push(cfg);return cfg}
  function show8(){addMissingRows();const id=+$('customPoolId').value,cfg=state.customPools.find(x=>x.id===id)||{id,enabled:false,levelParam:5,slots:[0]};const counts=new Map();for(const f of cfg.slots)counts.set(f,(counts.get(f)||0)+1);const entries=[...counts.entries()];for(let i=0;i<8;i++){const e=entries[i],s=document.querySelector(`[data-cfairy="${i}"]`),w=document.querySelector(`[data-cweight="${i}"]`);if(s)s.value=String(e?.[0]??ZEE.FAIRIES[0].id);if(w)w.value=e?.[1]??0}}
  async function overwriteWithExe(){
    try{
      if(!state.canWriteGame)throw new Error('Папка игры открыта без права записи.');if(!state.db)throw new Error('_fb0x05.fbs не загружен.');if(!state.sceneBytes||!state.sceneName)throw new Error('Сначала откройте сцену.');
      const fm=state.writeMeta.get('_fb0x05.fbs'),sm=state.writeMeta.get(state.sceneName.toLowerCase()),em=state.writeMeta.get('zanthp.exe');
      if(!fm||!sm)throw new Error('Не найден FBS или текущая SCN.');
      let exeOut=null;if(em&&state.exeBytes){saveCurrent();exeOut=ZEE.patchZanthpCustomPools(state.exeBytes,state.customPools)}
      const paths=[fm.path,sm.path];if(exeOut)paths.push(em.path);
      if(!confirm(`Перезаписать файлы игры?\n\n${paths.join('\n')}\n\nПеред первой перезаписью будут созданы *.zwe.bak.`))return;
      await ensureBackup(fm);await ensureBackup(sm);if(exeOut)await ensureBackup(em);
      await writeBytes(fm.handle,ZEE.serializeDatabase(state.db));await writeBytes(sm.handle,state.sceneBytes);if(exeOut){await writeBytes(em.handle,exeOut);state.exeBytes=exeOut;state.exeFile=await em.handle.getFile();state.files.set('zanthp.exe',state.exeFile)}
      state.files.set('_fb0x05.fbs',await fm.handle.getFile());const sf=await sm.handle.getFile();state.files.set(state.sceneName.toLowerCase(),sf);state.scenes.set(state.sceneName.toLowerCase(),sf);state.fbsDirty=false;state.sceneDirty=false;updateDebug();
      status(`Перезаписано: <b>_fb0x05.fbs + ${state.sceneName}${exeOut?' + zanthp.exe':''}</b>. Резервные копии *.zwe.bak сохранены.`)
    }catch(e){alert(e.message);console.error(e)}
  }
  addMissingRows();show8();
  $('customPoolId').addEventListener('change',()=>setTimeout(show8,0));
  $('saveCustomPool').onclick=()=>{try{const cfg=saveCurrent();renderWildSelect();renderCustomPreview();status(`Настройки <b>Pool ${cfg.id}</b> запомнены. ${state.canWriteGame?'Нажмите «Перезаписать файлы игры», чтобы записать их прямо в zanthp.exe.':'Можно скачать zanthp_custom.exe.'}`)}catch(e){alert(e.message)}};
  $('patchExe').onclick=()=>{try{if(!state.exeBytes)throw new Error('Сначала выберите zanthp.exe');saveCurrent();const out=ZEE.patchZanthpCustomPools(state.exeBytes,state.customPools);download('zanthp_custom.exe',out);renderWildSelect();status('Скачан <b>zanthp_custom.exe</b>.')}catch(e){alert(e.message)}};
  $('overwriteGame').onclick=overwriteWithExe;
  $('overwriteGame').textContent='Перезаписать FBS + SCN + EXE';
})();
