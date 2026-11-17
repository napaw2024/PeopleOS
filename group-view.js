(() => {
 const content=document.querySelector('.content'),panel=document.createElement('section');
 const sharedSort=document.querySelector('.finder-sort'),sortHome=document.createComment('Sort control home');
 sharedSort.before(sortHome);
 const restoreSort=()=>{sortHome.after(sharedSort);sharedSort.querySelector('img').src='assets/icons/sort.svg'};
 panel.id='groupFolder';panel.hidden=true;content.append(panel);
 let showFilePeople=true,showFileMessages=true;
 let groupId=-1,personId=-1,tab='all',layout='grid',order='latest',folder=null,selectedFile=-1;
 let detailChannel='all',documentsView=false;

 let structureState={shared:false,usingShared:false};
 try{structureState=JSON.parse(localStorage.getItem('people-jonas-nora-shared-structure-v2'))||structureState}catch{}

 const contextFolderKey='people-jonas-nora-context-folders-v1';
 let contextFolders=[],marked=new Set();
 try{const saved=JSON.parse(localStorage.getItem(contextFolderKey));if(Array.isArray(saved))contextFolders=saved.filter(f=>typeof f.id==='string'&&typeof f.name==='string'&&Array.isArray(f.refs))}catch{}
 const contextEnabled=()=>mode==='Collaboration'&&groupId===4&&personId<0;
 const fileRef=f=>f.fileId||f.context||f.name;
 const contextDocs=[{context:'context-design-review',name:'Design review.pdf',kind:'file',sender:18},{context:'context-project-brief',name:'Project brief.pdf',kind:'file',sender:16},{context:'context-feedback',name:'Feedback.pdf',kind:'file',sender:16},{context:'context-wireframes',name:'Wireframes',kind:'figma',sender:18,channel:'Figma'},{context:'context-components',name:'Components',kind:'figma',sender:18,channel:'Figma'},{context:'context-research-notes',name:'Research notes.pdf',kind:'file',sender:16},{context:'context-requirements',name:'Requirements.pdf',kind:'file',sender:16},{context:'context-review-notes',name:'Review notes.pdf',kind:'file',sender:18},{context:'context-handoff',name:'Design handoff.pdf',kind:'file',sender:18},{context:'context-icons',name:'Icons.svg',kind:'svg',sender:18},{context:'context-user-flow',name:'User flow.svg',kind:'svg',sender:16}].map(f=>({...f,contributors:[0,16,18],activityKind:'collaboration'}));
 const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function saveContextFolders(){try{localStorage.setItem(contextFolderKey,JSON.stringify(contextFolders))}catch{}}
 function leaveContextFolder(){folder=null;marked.clear();selectedFile=-1;render();heading.textContent=displayedGroup(groupId).name}
 let fileMenu=null,selectionAnchor=null,selectedCollection=null;
 function closeFileMenu(){fileMenu?.remove();fileMenu=null}
 document.addEventListener('pointerdown',e=>{if(fileMenu&&!fileMenu.contains(e.target))closeFileMenu()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fileMenu){e.preventDefault();closeFileMenu()}});
 function contextualFolderUI(items,g){
  const grid=panel.querySelector('.folder-files'),current=contextFolders.find(f=>f.id===folder);
  grid.classList.add('finder-selection-grid');
  if(current){
   const controls=document.createElement('div');controls.className='context-folder-tools';
   controls.innerHTML=`<button data-parent>‹ ${escapeHtml(g.name)}</button><span>${escapeHtml(current.name)}</span><button data-ungroup>Ungroup collection</button>`;
   grid.before(controls);controls.querySelector('[data-parent]').onclick=leaveContextFolder;
   controls.querySelector('[data-ungroup]').onclick=()=>{contextFolders=contextFolders.filter(f=>f.id!==folder);saveContextFolders();leaveContextFolder()};heading.textContent=current.name;return;
  }
  function refreshSelection(){
   grid.querySelectorAll('[data-file]').forEach(b=>{const f=items.find(f=>f.id===+b.dataset.file),on=marked.has(fileRef(f));b.classList.toggle('selected-file',on);b.setAttribute('aria-pressed',String(on))});
   grid.querySelectorAll('[data-collection]').forEach(b=>{const on=b.dataset.collection===selectedCollection;b.classList.toggle('selected-file',on);b.setAttribute('aria-pressed',String(on))});
   if(marked.size!==1||selectedCollection)panel.querySelector('.file-context-action').hidden=true;
  }
  function selectFile(f,e){
   selectedCollection=null;
   if(e.shiftKey&&selectionAnchor!==null){const from=items.findIndex(f=>fileRef(f)===selectionAnchor),to=items.indexOf(f);if(!e.metaKey&&!e.ctrlKey)marked.clear();items.slice(Math.min(from<0?to:from,to),Math.max(from<0?to:from,to)+1).forEach(f=>marked.add(fileRef(f)))}
   else if(e.metaKey||e.ctrlKey){marked.has(fileRef(f))?marked.delete(fileRef(f)):marked.add(fileRef(f));selectionAnchor=fileRef(f)}
   else{marked.clear();marked.add(fileRef(f));selectionAnchor=fileRef(f)}
   refreshSelection();
  }
  function renameCollection(f){
   const tile=grid.querySelector(`[data-collection="${f.id}"]`),label=tile.querySelector('.shared-file-name'),input=document.createElement('input');
   input.className='collection-name-input';input.setAttribute('aria-label','Collection name');input.value=f.name;input.maxLength=60;label.replaceWith(input);
   input.onclick=e=>e.stopPropagation();input.ondblclick=e=>e.stopPropagation();let finished=false;
   const finish=save=>{if(finished)return;finished=true;if(save&&input.value.trim()){f.name=input.value.trim();saveContextFolders()}input.replaceWith(label);label.textContent=f.name;tile.setAttribute('aria-label','Collection '+f.name);tile.focus()};
   input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true)}if(e.key==='Escape'){e.preventDefault();finish(false)}};
   input.onblur=()=>finish(true);input.focus();input.select();
  }
  function createCollection(){
   const refs=items.filter(f=>marked.has(fileRef(f))).map(fileRef);if(!refs.length)return;
   const f={id:'context-'+crypto.randomUUID(),name:'New collection',refs};contextFolders.push(f);saveContextFolders();marked.clear();selectedFile=-1;selectedCollection=f.id;render();
   panel.querySelector(`[data-collection="${f.id}"]`).dispatchEvent(new Event('renamecollection'));
  }
  function menuAt(e,entries,target){
   e.preventDefault();closeFileMenu();fileMenu=document.createElement('div');fileMenu.className='file-selection-menu';fileMenu.setAttribute('role','menu');fileMenu.setAttribute('aria-label','Selection actions');
   entries.forEach(([label,action])=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=label;b.onclick=()=>{closeFileMenu();action()};fileMenu.append(b)});
   document.body.append(fileMenu);const bounds=document.querySelector('#window').getBoundingClientRect(),r=fileMenu.getBoundingClientRect(),anchor=target.getBoundingClientRect();
   const x=e.clientX||anchor.left+anchor.width/2,y=e.clientY||anchor.bottom;
   fileMenu.style.left=Math.max(bounds.left+8,Math.min(x,bounds.right-r.width-8))+'px';fileMenu.style.top=Math.max(bounds.top+8,Math.min(y,bounds.bottom-r.height-8))+'px';
   fileMenu.onkeydown=e=>{const buttons=[...fileMenu.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus()}else if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();e.stopPropagation();closeFileMenu();target.focus()}};
   fileMenu.querySelector('button').focus();
  }
  for(const f of items){
   const button=grid.querySelector(`[data-file="${f.id}"]`);if(!button)continue;const originalClick=button.onclick,originalKey=button.onkeydown;
   button.onclick=e=>{if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey)originalClick(e);selectFile(f,e)};
   button.oncontextmenu=e=>{if(!marked.has(fileRef(f)))selectFile(f,{});menuAt(e,[[`New collection with selection (${marked.size} ${marked.size===1?'item':'items'})`,createCollection]],button)};
   button.onkeydown=e=>{if(e.key==='F10'&&e.shiftKey||e.key==='ContextMenu'){button.oncontextmenu(e)}else if(e.code==='Space'){e.preventDefault();selectFile(f,e)}else originalKey?.(e)};
  }
  if(contextFolders.some(f=>files(false,true).some(file=>f.refs.includes(fileRef(file)))))grid.querySelector('.folder-empty')?.remove();
  for(const f of [...contextFolders].reverse()){
   const matching=files(false,true).filter(file=>f.refs.includes(fileRef(file)));if(!matching.length)continue;
   const tile=document.createElement('button');tile.className='shared-file context-collection-tile';tile.dataset.collection=f.id;tile.setAttribute('aria-label','Collection '+f.name);
   const previews=matching.slice(0,3).map(file=>`<img src="${file.src||(['figma','figma-link'].includes(file.kind)?'assets/dock/figma.png':'assets/icons/document.png')}" alt="">`).join('');
   tile.innerHTML=`<span class="file-preview"><span class="collection-band" style="--collection-color:${g.color}">${previews}</span></span><span class="shared-file-name">${escapeHtml(f.name)}</span><small>${matching.length} file${matching.length===1?'':'s'}</small>`;
   const open=()=>{folder=f.id;marked.clear();selectedFile=-1;render()};
   tile.onclick=()=>{marked.clear();selectedCollection=f.id;refreshSelection()};tile.ondblclick=open;
   tile.addEventListener('renamecollection',()=>renameCollection(f));
   tile.oncontextmenu=e=>{tile.onclick();menuAt(e,[['Open collection',open],['Rename',()=>renameCollection(f)],['Ungroup collection',()=>{contextFolders=contextFolders.filter(c=>c.id!==f.id);saveContextFolders();selectedCollection=null;render()}]],tile)};
   tile.onkeydown=e=>{if(e.key==='Enter'||e.key==='F2'){e.preventDefault();renameCollection(f)}else if(e.key==='ArrowDown'&&(e.metaKey||e.ctrlKey)){e.preventDefault();open()}else if(e.key==='F10'&&e.shiftKey||e.key==='ContextMenu')tile.oncontextmenu(e)};
   grid.prepend(tile);
  }
  grid.onclick=e=>{if(e.target===grid){marked.clear();selectedCollection=null;refreshSelection()}};
  grid.onkeydown=e=>{if(e.target.tagName==='INPUT')return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='a'){e.preventDefault();items.forEach(f=>marked.add(fileRef(f)));selectedCollection=null;refreshSelection()}else if(e.key==='Escape'){marked.clear();selectedCollection=null;refreshSelection()}};
  refreshSelection();
 }
 // Reference-only examples, not actual messages or files.
 const pinnedRecipeMessage='I talked to Grandma and wrote down the recipe as she told it to me, so I’m not sure about the quantities. Do you have the written version somewhere and could you send it to me? You can also edit this note if you remember the quantities off the top of your head ;)';
 const examples=[{name:'Grandma recipe recreated',kind:'note',sender:6,message:pinnedRecipeMessage},{name:'Wandern 26',kind:'file',sender:6},{name:'IMG_8137.jpg',kind:'photo',sender:4,src:'assets/files/IMG_8137.jpg'},{name:'Zeichnungen.jpg',kind:'photo',sender:5,src:'assets/files/Zeichnungen.jpg'},{name:'Document 01',kind:'file',sender:6},{name:'IMG_8473.jpg',kind:'photo',sender:6,src:'assets/files/IMG_8473.jpg'},{name:'IMG_8432.jpg',kind:'photo',sender:5,src:'assets/files/IMG_8432.jpg'},{name:'IMG_8294.jpg',kind:'photo',sender:4,src:'assets/files/IMG_8294.jpg'},{name:'IMG_8272.jpg',kind:'photo',sender:6,src:'assets/files/IMG_8272.jpg'}];
 // Story fixtures: tags associate a file with a person independently of its sender.
 const familyExamples=[
  {name:'Chocolate cake',kind:'file',sender:2,recipient:0,taggedPeople:[3],original:true},
  {name:'IMG_8495.jpg',kind:'photo',sender:2,src:'assets/files/IMG_8495.jpg'},
  {name:'Pumpkin.jpg',kind:'photo',sender:3,src:'assets/files/Pumpkin.jpg'}
 ];
 examples.forEach(f=>f.channel='WhatsApp');familyExamples.forEach(f=>f.channel='WhatsApp');
 // Existing first file is the latest narrative example; no new file or sender is invented.
 window.manualHoverFile=id=>id===7?examples[0]:id===0?familyExamples[0]:undefined;
 renderLabels();positionLabels();
 window.openHoverFile=file=>{
  if(file.url){window.open(file.url,'_blank','noopener,noreferrer');return}
  document.querySelector('#quickFilePreview')?.remove();const dialog=document.createElement('dialog');dialog.id='quickFilePreview';
  const close=document.createElement('button');close.textContent='×';close.className='quick-file-close';close.setAttribute('aria-label','Close file preview');close.onclick=()=>dialog.close();
  const heading=document.createElement('h2');heading.textContent=file.name;dialog.append(close,heading);
  const img=document.createElement('img');img.src=file.src|| (file.kind==='note'?'assets/dock/notes.png':'assets/icons/document.png');img.alt=file.name;img.className=file.src?'quick-file-photo':'quick-file-icon';dialog.append(img);
  const text=document.createElement('p');text.textContent=file.message||(!file.src?'No file contents supplied for this prototype.':'');if(text.textContent)dialog.append(text);
  dialog.addEventListener('close',()=>dialog.remove());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});content.append(dialog);dialog.showModal();
 };
 const personName=id=>id===2?'Mom':people[id][0];
 const relatedPeople=file=>[...new Set([file.sender,...(file.contributors||[]),...(file.taggedPeople||[])].filter(id=>id!==null&&id!==undefined))];
 const folderSvg='<svg viewBox="0 0 90 76" aria-hidden="true"><path d="M4 17q0-7 7-7h23l9 8h36q7 0 7 7v42H4Z" fill="#229cce"/><rect x="4" y="22" width="82" height="47" rx="5" fill="#61cbf4" stroke="#28a8df" stroke-width="2"/></svg>';
 const fileSvg='<img class="document-file-icon" src="assets/icons/document.png" alt="Document">';
 function documentPeople(f){
 const ids=(f.relatedPeople||relatedPeople(f)).filter(id=>id!==0&&!(id===3&&f.taggedPeople?.includes(id))&&people[id]);
 const shown=ids.slice(0,3);return `<span class="document-people-stack">${shown.map(id=>`<span class="document-person" title="${id===f.sender?'Sent by':f.taggedPeople?.includes(id)?'Tagged':'Participant'}: ${personName(id)}"><img src="${people[id][1]}" alt="${personName(id)}"></span>`).join('')}${ids.length>3?`<span class="document-person overflow">+${ids.length-3}</span>`:''}</span>`;
 }
 function documentOverview(){
  const records=[...examples,...familyExamples,...contextDocs,...Object.entries(activityFixtures).flatMap(([kind,events])=>events.map(f=>({...f,activityKind:kind.toLowerCase()})))].filter(f=>!['link','figma-link','folder'].includes(f.kind));
  const unique=new Map();for(const f of records){const key=f.fileId||f.src||(f.original?'original-recipe':`${f.activityKind||'manual'}:${f.group??'direct'}:${f.sender}:${f.name}`);const prev=unique.get(key);if(!prev||(f.day??-1)>(prev.day??-1))unique.set(key,f)}
  return [...unique.values()].map((f,id)=>({...f,id,relatedPeople:[...new Set([...relatedPeople(f),...(f.recipients||[])])]})).sort((a,b)=>order==='name'?a.name.localeCompare(b.name):(b.day??-Infinity)-(a.day??-Infinity)||a.name.localeCompare(b.name));
 }
 function files(ignoreChannel=false,ignoreFolder=false){
  if(documentsView)return documentOverview();
  const [start,end]=selectedTimeBounds();
  const unfiltered=activityModel?buildActivityMap(mode,start,end,'all'):null;
  if(unfiltered)unfiltered.events=unfiltered.events.filter(e=>e.day>=start&&e.day<end);
  const source=personId>=0&&activityModel&&mode==='Communication'?unfiltered.events.filter(e=>isDirectExchange(e,personId)).map(e=>({...e,activityKind:'communication'})):personId<0&&activityModel?unfiltered.events.filter(e=>e.group===groupId).map(e=>({...e,activityKind:mode.toLowerCase()})):personId>=0?[...familyExamples,...examples,...(unfiltered?.events||[]).map(e=>({...e,activityKind:mode.toLowerCase()}))].filter(f=>relatedPeople(f).includes(personId)).filter((f,i,all)=>all.findIndex(other=>other.name===f.name&&other.sender===f.sender)===i):groupId===7?examples:groupId===0?familyExamples:[];
  const all=contextEnabled()?[...source,...contextDocs]:source;
  return all.map((f,i)=>({...f,id:i,relatedPeople:relatedPeople(f)})).filter(f=>personId>=0?f.relatedPeople.includes(personId):f.relatedPeople.some(id=>displayedGroup(groupId)?.ids.includes(id))).filter(f=>tab==='all'||(tab==='collaboration'?(f.activityKind?f.activityKind==='collaboration':f.kind==='note'):(f.activityKind?f.activityKind==='communication':f.kind!=='note'))).filter(f=>ignoreChannel||detailChannel==='all'||f.channel===detailChannel).sort((a,b)=>order==='name'?a.name.localeCompare(b.name):(b.day??-Infinity)-(a.day??-Infinity)||a.id-b.id).filter(f=>ignoreFolder||!contextEnabled()||(folder?contextFolders.find(g=>g.id===folder)?.refs.includes(fileRef(f)):!contextFolders.some(g=>g.refs.includes(fileRef(f)))))
 }

 function render(){closeFileMenu();restoreSort();document.querySelector('.documents-header-tools')?.remove();const availableChannels=[...new Set([...files(true,true).map(f=>f.channel).filter(Boolean),'Figma','Mail','AirDrop','Google Docs'])].sort();if(detailChannel!=='all'&&!availableChannels.includes(detailChannel))detailChannel='all';const g=documentsView?{name:'Documents',ids:[],color:'#e3e5e8'}:personId>=0?{name:personName(personId),ids:[personId],color:'#e3e5e8'}:displayedGroup(groupId),items=files();panel.innerHTML=`
 <div class="folder-context"><section><h3>People</h3><div class="folder-members">${g.ids.map(id=>`<span title="${people[id][0]}">${personId>=0?`<span class="membership-avatar" style="background:#e3e5e8"><img src="${people[id][1]}" alt="${personName(id)}"></span>`:membershipAvatar(id,groupId)}</span>`).join('')}${personId===3?'':`<button class="add-person" disabled aria-label="Add person (prototype)"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg></button>`}</div></section><section><h3>Channels</h3><div class="folder-channels">${availableChannels.length?`<label class="channel-filter"><select aria-label="Filter files by channel"><option value="all">All</option>${availableChannels.map(c=>`<option value="${c}" ${detailChannel===c?'selected':''}>${c}</option>`).join('')}</select></label>`:'<span class="folder-empty-channel">—</span>'}</div></section></div>
 <div class="folder-controls"><div class="folder-segments" role="tablist" aria-label="Group activity"><button role="tab" data-tab="all" aria-selected="${tab==='all'}">All</button><button role="tab" data-tab="communication" aria-selected="${tab==='communication'}">Communication</button><button role="tab" data-tab="collaboration" aria-selected="${tab==='collaboration'}">Collaboration</button></div><span class="folder-sort-caption" aria-live="polite"></span><div class="folder-tools"><div class="file-display-picker"><button class="file-display-button" aria-label="Display options" title="Display options" aria-haspopup="menu" aria-expanded="false"><svg viewBox="3 3 18 18" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></svg></button><div class="file-display-menu" role="menu" aria-label="Display options" hidden><button class="file-people-toggle" role="menuitemcheckbox" aria-checked="${showFilePeople}"><span class="display-check" aria-hidden="true">${showFilePeople?'✓':''}</span>People</button><button class="file-messages-toggle" role="menuitemcheckbox" aria-checked="${showFileMessages}"><span class="display-check" aria-hidden="true">${showFileMessages?'✓':''}</span>Messages</button></div></div><div class="folder-view-picker"><button class="folder-view-button" aria-label="File view" aria-haspopup="menu" aria-expanded="false"><svg viewBox="1 3 41 21" aria-hidden="true"><rect x="2" y="4" width="25" height="19" rx="2"/><path d="M10 4v19M19 4v19m16-12 3-3 3 3m-6 6 3 3 3-3"/></svg></button><div class="folder-view-menu" role="menu" aria-label="File view" hidden><button role="menuitemradio" aria-checked="true">✓ Icons</button></div></div><button class="send-files" disabled aria-label="Send files" title="Send files"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 9 15m12-12-7 18-5-6-6-5 18-7"/></svg></button></div></div>
 <div class="folder-files ${layout}" role="tabpanel" aria-label="${tab==='all'?'All':tab==='communication'?'Communication':'Collaboration'} files">${items.map(f=>`${f.message?'<div class="note-message-item">':''}<button class="shared-file ${selectedFile===f.id?'selected-file':''}" data-file="${f.id}" aria-pressed="${selectedFile===f.id}" title="${f.kind==='folder'?'Double-click to open. ':''}${f.sender===null?'':personName(f.sender)}"><span class="file-preview ${f.taggedPeople?.length?'has-person-tag':''}">${f.kind==='spreadsheet'?'<img class="note-file-icon" src="assets/icons/spreadsheet.svg" alt="Excel spreadsheet">':f.kind==='folder'?folderSvg:f.kind==='link'?'<span class="generic-link-icon" role="img" aria-label="Link">↗</span>':f.kind==='figma-link'?'<span class="figma-link-icon"><img class="note-file-icon" src="assets/dock/figma.png" alt="Figma link"><span aria-hidden="true">↗</span></span>':f.kind==='figma'?'<img class="note-file-icon" src="assets/dock/figma.png" alt="Figma file">':f.kind==='svg'?`<span class="svg-file-icon">${fileSvg}<b>SVG</b></span>`:f.kind==='note'?'<img class="note-file-icon" src="assets/dock/notes.png" alt="Notes">':f.kind==='photo'?`<img class="shared-photo" src="${f.src}" alt="${f.name}" loading="lazy">`:fileSvg}${documentsView?documentPeople(f):f.sender!==null&&!f.message?`<span class="file-sender" style="background:${g.color}"><img src="${people[f.sender][1]}" alt="${f.activityKind==='collaboration'?'Last changed by':'Sent by'} ${personName(f.lastEditor??f.sender)}"></span>`:''}${f.taggedPeople?.includes(3)?'<img class="file-grandma-tag" src="assets/icons/grandma-tag.png" alt="Tagged: Grandma" title="Tagged: Grandma (not the sender)">':''}</span><span class="shared-file-name">${f.name}${f.kind==='figma-link'?' · Link':''}</span><small>${f.sender===null?'':['figma','figma-link'].includes(f.kind)?(f.activityKind==='collaboration'?'Last changed by ':'Sent by ')+personName(f.lastEditor??f.sender):f.original?'Sent by '+personName(f.sender):personName(f.sender)}</small></button>${f.message?`<div class="attached-note-message" style="--message-color:${g.color}" aria-label="Message from ${people[f.sender][0]} attached to ${f.name}"><span class="message-author"><img src="${people[f.sender][1]}" alt="${people[f.sender][0]}"></span><p>${f.message}</p></div></div>`:''}`).join('')||'<p class="folder-empty">No files</p>'}</div><div class="file-context-action" hidden></div>`;
 const channelSelect=panel.querySelector('[aria-label="Filter files by channel"]');if(channelSelect)channelSelect.onchange=e=>{detailChannel=e.target.value;marked.clear();selectedFile=-1;render()};makeChannelSearch(channelSelect);
 panel.classList.toggle('hide-file-people',!showFilePeople);
 panel.classList.toggle('hide-file-messages',!showFileMessages);
 const displayPicker=panel.querySelector('.file-display-picker'),displayButton=displayPicker.querySelector('.file-display-button'),displayMenu=displayPicker.querySelector('[role=menu]');
 const closeDisplay=()=>{displayMenu.hidden=true;displayButton.setAttribute('aria-expanded','false')};
 displayButton.onclick=()=>{displayMenu.hidden=!displayMenu.hidden;displayButton.setAttribute('aria-expanded',String(!displayMenu.hidden));if(!displayMenu.hidden)displayMenu.querySelector('button').focus()};
 const updateDisplay=(button,on)=>{button.setAttribute('aria-checked',String(on));button.querySelector('.display-check').textContent=on?'✓':''};
 const messagesToggle=displayPicker.querySelector('.file-messages-toggle');messagesToggle.onclick=()=>{showFileMessages=!showFileMessages;updateDisplay(messagesToggle,showFileMessages);panel.classList.toggle('hide-file-messages',!showFileMessages)};
 const peopleToggle=displayPicker.querySelector('.file-people-toggle');peopleToggle.onclick=()=>{showFilePeople=!showFilePeople;updateDisplay(peopleToggle,showFilePeople);panel.classList.toggle('hide-file-people',!showFilePeople)};
 displayMenu.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();closeDisplay();displayButton.focus()}else if(e.key==='Tab')closeDisplay();else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const options=[...displayMenu.querySelectorAll('button')];options[(options.indexOf(document.activeElement)+1)%options.length].focus()}};
 if(documentsView||mode==='Collaboration'&&personId<0)panel.querySelector('.folder-segments').remove();
 sharedSort.querySelector('img').src='assets/icons/finder-sort.svg';panel.querySelector('.folder-tools').prepend(sharedSort);updateSortCaption();
 if(documentsView){
  panel.querySelector('.folder-context').remove();
  const sort=document.createElement('div');sort.className='documents-sort-picker';
  sort.innerHTML=`<button class="sort-button" aria-label="Sort documents" title="Sort documents" aria-haspopup="menu" aria-expanded="false"><img src="assets/icons/finder-sort.svg" alt=""><svg viewBox="0 0 12 8" aria-hidden="true"><path d="m2 2 4 4 4-4"/></svg></button><div class="sort-menu" role="menu" aria-label="Sort documents" hidden><button role="menuitemradio" aria-checked="${order==='name'}" data-order="name">${order==='name'?'✓ ':''}Name</button><button role="menuitemradio" aria-checked="${order==='latest'}" data-order="latest">${order==='latest'?'✓ ':''}Last activity</button></div>`;
  const trigger=sort.querySelector('button'),menu=sort.querySelector('[role=menu]');
  const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false')};
  trigger.onclick=()=>{menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)menu.querySelector('[aria-checked=true]').focus()};
  menu.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>{order=b.dataset.order;selectedFile=-1;render();document.querySelector('.documents-sort-picker>button').focus()});
  menu.onkeydown=e=>{const options=[...menu.querySelectorAll('button')];if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();options[(options.indexOf(document.activeElement)+1)%options.length].focus()}else if(e.key==='Escape'){e.preventDefault();close();trigger.focus()}else if(e.key==='Tab')close()};
  panel.querySelector('.folder-tools').prepend(sort);panel.querySelector('.send-files').remove();
 }


 panel.querySelectorAll('[data-tab]').forEach(b=>{b.onclick=()=>{tab=b.dataset.tab;folder=null;selectedFile=-1;render()};b.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const tabs=['all','communication','collaboration'];tab=tabs[(tabs.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3];folder=null;render();panel.querySelector(`[data-tab="${tab}"]`).focus()}}});
 const picker=panel.querySelector('.folder-view-button'),menu=panel.querySelector('.folder-view-menu');
 picker.onclick=()=>{menu.hidden=!menu.hidden;picker.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)menu.querySelector('button').focus()};
 menu.querySelector('button').onclick=()=>{menu.hidden=true;picker.setAttribute('aria-expanded','false');picker.focus()};
 menu.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();menu.hidden=true;picker.setAttribute('aria-expanded','false');picker.focus()}else if(e.key==='Tab'){menu.hidden=true;picker.setAttribute('aria-expanded','false')}};
 panel.querySelectorAll('[data-layout]').forEach(b=>b.onclick=()=>{layout=b.dataset.layout;render()});
 panel.querySelectorAll('[data-file]').forEach(b=>{b.onclick=()=>{selectedFile=+b.dataset.file;panel.querySelectorAll('[data-file]').forEach(el=>{el.classList.toggle('selected-file',+el.dataset.file===selectedFile);el.setAttribute('aria-pressed',String(+el.dataset.file===selectedFile))});const file=files().find(f=>f.id===selectedFile),action=panel.querySelector('.file-context-action');action.hidden=!(['figma','figma-link'].includes(file?.kind)&&file?.url);if(['figma','figma-link'].includes(file?.kind)&&file?.url){action.innerHTML=`<a href="${file.url}" target="_blank" rel="noopener noreferrer">Open in Figma ↗</a>${documentsView?'':mode==='Communication'?'<button>Show in Collaboration →</button>':`<span>Latest change in ${displayedGroup(file.collaborationGroup).name}</span>`}`;const jump=action.querySelector('button');if(jump)jump.onclick=()=>{setRelationMode('Collaboration');setSort('latest');navigate(-1)}}};const open=()=>{const f=files().find(f=>f.id===+b.dataset.file);if(['figma','figma-link'].includes(f?.kind)&&f.url){window.open(f.url,'_blank','noopener,noreferrer')}else if(f?.kind==='folder'){folder=f.name;selectedFile=-1;render()}else if(documentsView&&f){window.openHoverFile(f)}};b.ondblclick=open;b.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();open()}}});
 if(documentsView){const tools=panel.querySelector('.folder-tools');tools.classList.add('documents-header-tools');document.querySelector('.header-actions').append(tools);panel.querySelector('.folder-controls').remove();}
 if(contextEnabled()){
  contextualFolderUI(items,g);
  const control=document.createElement('div');control.className='structure-sync-control';
  control.innerHTML=`<div class="structure-picker"><button class="structure-picker-button" aria-label="Structure view" title="Structure view" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="7.5" cy="12" r=".8" fill="currentColor"/><circle cx="12" cy="12" r=".8" fill="currentColor"/><circle cx="16.5" cy="12" r=".8" fill="currentColor"/></svg><span aria-hidden="true">⌄</span></button><div class="structure-view-menu" role="menu" hidden></div></div><button class="structure-sync" type="button">Share structure</button>`;
  const trigger=control.querySelector('.structure-picker-button'),menu=control.querySelector('[role=menu]'),button=control.querySelector('.structure-sync');
  const save=()=>{try{localStorage.setItem('people-jonas-nora-shared-structure-v2',JSON.stringify(structureState))}catch{}};
  const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false')};
  const update=()=>{button.hidden=structureState.usingShared;trigger.title=structureState.usingShared?'Shared structure':'My structure';menu.innerHTML=`<button role="menuitemradio" aria-checked="${!structureState.usingShared}" data-shared="false"><span>${!structureState.usingShared?'✓':''}</span>My structure</button><button role="menuitemradio" aria-checked="${structureState.usingShared}" data-shared="true" ${structureState.shared?'':'disabled'}><span>${structureState.usingShared?'✓':''}</span>Shared structure${structureState.shared?'':'<small>Not available</small>'}</button>`;menu.querySelectorAll('button').forEach(b=>b.onclick=()=>{structureState.usingShared=b.dataset.shared==='true';save();update();close();trigger.focus()})};
  trigger.onclick=()=>{menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)menu.querySelector('[aria-checked=true]').focus()};
  menu.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();close();trigger.focus()}else if(e.key==='Tab')close();else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const options=[...menu.querySelectorAll('button:not(:disabled)')];options[(options.indexOf(document.activeElement)+1)%options.length].focus()}};
  button.onclick=()=>{
   const dialog=document.createElement('dialog');dialog.className='structure-dialog';dialog.setAttribute('aria-label','Share structure');
   dialog.innerHTML=`<h2>Share structure</h2><p class="structure-intro">Jonas, Nora & you</p><p class="structure-footnote">${structureState.shared?'Update the shared structure with your current arrangement?':'Offer your current arrangement to Jonas and Nora?'} Your personal structure stays unchanged. They can choose whether to adopt it.</p><div class="structure-actions"><button data-cancel>Cancel</button><button class="structure-primary" data-share>${structureState.shared?'Update shared structure':'Share my structure'}</button></div>`;
   dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.querySelector('[data-share]').onclick=()=>{structureState.shared=true;structureState.snapshot=JSON.parse(JSON.stringify(contextFolders));save();update();dialog.close()};document.body.append(dialog);dialog.onclose=()=>dialog.remove();dialog.showModal();
  };update();
  panel.querySelector('.folder-context').append(control);
 }
 }
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.structure-picker')){const p=document.querySelector('.structure-picker');if(p){p.querySelector('[role=menu]').hidden=true;p.querySelector('button').setAttribute('aria-expanded','false')}}if(!e.target.closest('.file-display-picker')){const picker=document.querySelector('.file-display-picker');if(picker){picker.querySelector('[role=menu]').hidden=true;picker.querySelector('.file-display-button').setAttribute('aria-expanded','false')}}if(!e.target.closest('.documents-sort-picker')){const picker=document.querySelector('.documents-sort-picker');if(picker){picker.querySelector('[role=menu]').hidden=true;picker.querySelector('button').setAttribute('aria-expanded','false')}}if(!e.target.closest('.folder-view-picker')){const menu=document.querySelector('.folder-view-menu');if(menu){menu.hidden=true;document.querySelector('.folder-view-button').setAttribute('aria-expanded','false')}}});
 function updateSortCaption(){const caption=panel.querySelector('.folder-sort-caption');if(caption){caption.textContent=activeSort==='latest'?'Sorted by last activity':activeSort==='activity'?'Sorted by most activity':'';caption.hidden=activeSort==='none'}}
 sharedSort.addEventListener('click',updateSortCaption);
 const back=document.querySelector('#folderBack'),forward=document.querySelector('#folderForward'),heading=document.querySelector('#folderHeading');
 const navigation=[{target:-1,mode}];let navigationIndex=0;
 function show(id,viewMode=mode){
  closeFileMenu();marked.clear();selectedCollection=null;selectionAnchor=null;detailChannel=viewMode==='Communication'?communicationChannel:'all';
  if(viewMode!==mode)setRelationMode(viewMode);
  closeSort(false);if(id===-1){restoreSort();document.querySelector('.documents-header-tools')?.remove();}
  documentsView=id==='documents';order=documentsView?'name':'latest';document.body.classList.toggle('in-documents',documentsView);document.querySelector('#documentsNav').setAttribute('aria-pressed',String(documentsView));document.querySelectorAll('.relation').forEach(b=>b.classList.toggle('active',!documentsView&&b.dataset.mode===mode));
  personId=typeof id==='string'&&id.startsWith('person:')?Number(id.slice(7)):-1;
  groupId=documentsView||personId>=0?-1:id;tab=mode==='Collaboration'&&groupId>=0?'collaboration':'all';folder=null;selectedFile=-1;
  const opened=documentsView||groupId>=0||personId>=0;panel.hidden=!opened;content.classList.toggle('group-open',opened);document.body.classList.toggle('in-group-folder',opened);
  select(groupId);document.querySelectorAll('[data-person]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.person===personId)));updateTimeline();if(opened)render();
  heading.textContent=documentsView?'Documents':personId>=0?personName(personId):opened?displayedGroup(groupId).name:mapTitle();back.disabled=navigationIndex===0;forward.disabled=navigationIndex===navigation.length-1;
  heading.focus({preventScroll:true});
 }
 function navigate(id){const current=navigation[navigationIndex];if(current.target!==id||current.mode!==mode){navigation.splice(navigationIndex+1);navigation.push({target:id,mode});navigationIndex++}show(id)}
 back.onclick=()=>{if(contextEnabled()&&folder){leaveContextFolder();return}if(navigationIndex>0){const entry=navigation[--navigationIndex];show(entry.target,entry.mode)}};
 forward.onclick=()=>{if(navigationIndex<navigation.length-1){const entry=navigation[++navigationIndex];show(entry.target,entry.mode)}};
 document.querySelector('#documentsNav').onclick=()=>navigate('documents');
 window.openGroupView=navigate;
 window.openPersonView=id=>navigate('person:'+id);
 // Record every relation-map visit, including switches made while already on a map.
 document.querySelectorAll('.relation').forEach(b=>b.addEventListener('click',()=>navigate(-1)));
})();
