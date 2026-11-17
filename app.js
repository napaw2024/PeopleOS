const people=[['You','assets/avatars/me.png',570,360,'#f4c4cd'],['Sophie','assets/avatars/person-1.png',740,265,'#d6ebbc'],['Emma','assets/avatars/person-2.png',785,330,'#d6ebbc'],['Grandma','assets/avatars/grandma.png',785,407,'#d4e7f3'],['Olivia','assets/avatars/person-4.png',710,540,'#d7edd4'],['Mia','assets/avatars/person-5.png',590,515,'#f0d2ee'],['Lily','assets/avatars/person-6.png',465,523,'#d8efd9'],['Nina','assets/avatars/person-7.png',375,430,'#d8eeda'],['Alex','assets/avatars/person-8.png',300,275,'#f2d8c4'],['Zoe','assets/avatars/person-9.png',250,367,'#ded8ed'],['Noah','assets/avatars/person-10.png',210,535,'#e2dbee'],['James','assets/avatars/person-11.png',545,130,'#d4e3e7'],['Work contact','assets/avatars/work-person.png',850,95,'#d4e3e7']];
const groups=[{name:'Mom and Grandma',ids:[2,3],color:'#a8d4ec',label:[819,380],radius:34},{name:'Family core',ids:[2,1,5],color:'#d9ce8c',label:[792,250],radius:42},{name:'Miki and aunt Carolina',ids:[7,6],color:'#76c8ce',label:[320,475],radius:34},{name:'Girls',ids:[8,9],color:'#efbc9d',label:[235,280],radius:34},{name:'Family',ids:[2,3,4,6],color:'#a9dfb0',label:[736,560],radius:42},{name:'School gang',ids:[9,10],color:'#baacd4',label:[157,575],radius:34},{name:'Work',ids:[8,11,12],color:'#739eae',label:[525,94],radius:34},{name:'Cousins',ids:[6,5,4],color:'#eab4e4',label:[544,565],radius:34}];
// Additional collaboration identities, each with a unique supplied portrait.
[['Leon','person-0.png'],['Ben','ben.png'],['Amir','amir.png'],['Jonas','jonas.png'],['Clara','clara.png'],['Nora','person-3.png'],['Felix','felix.png'],['Lena','lena.png']].forEach(([name,asset])=>people.push([name,'assets/avatars/'+asset,570,360,'#e3e5e8']));
people[6][0]='Miki';people[7][0]='Aunt Carolina';
// Stable person identity colours, independent of relation/group membership.
function soloPersonColor(id){return `hsl(${Math.round((id*137.508+18)%360)} 46% 57%)`}
// One shared position per person, computed once under fixed-distance constraints.
mapLayout.positions.forEach(([x,y],i)=>{people[i][2]=x;people[i][3]=y});
groups.forEach((g,i)=>{g.label=mapLayout.labels[i];g.route=mapLayout.routes[i]});

const $=s=>document.querySelector(s);let selected=-1,view='map',mode='Social network',scale=1,dx=0,dy=0;const scene=$('#scene');
let activityModel=null;
let motionPositions=null,motionLabels=null,motionFrame=0,motionTime=0,motionMode=null;
function stopMapMotion(){cancelAnimationFrame(motionFrame);motionFrame=0;motionTime=0;motionPositions=null;motionLabels=null;motionMode=null}
function stageMapMotion(next){
 const old=motionPositions||activityModel?.positions,oldLabels=motionLabels||activityModel?.labels;
 if(!old||motionMode&&motionMode!==mode||reducedMotion.matches){stopMapMotion();return}
 motionMode=mode;motionPositions=Object.fromEntries(Object.entries(next.positions).map(([id,p])=>[id,[...(old[id]||p)]]));
 motionLabels=Object.fromEntries(Object.entries(next.labels).map(([id,p])=>[id,[...(oldLabels?.[id]||p)]]));
 if(!motionFrame)motionFrame=requestAnimationFrame(animateMapMotion);
}
function animateMapMotion(time){
 if(!activityModel||motionMode!==mode||reducedMotion.matches){stopMapMotion();resizeBands();positionLabels();return}
 const dt=motionTime?Math.min(50,time-motionTime):16;motionTime=time;const blend=1-Math.exp(-dt/180);let moving=false;
 for(const [values,targets] of [[motionPositions,activityModel.positions],[motionLabels,activityModel.labels]])for(const [id,target] of Object.entries(targets)){
  if(!values[id])values[id]=[...target];
  for(let axis=0;axis<2;axis++){const delta=target[axis]-values[id][axis];if(Math.abs(delta)>.05){values[id][axis]+=delta*blend;moving=true}else values[id][axis]=target[axis]}
 }
 resizeBands();positionLabels();
 if(moving)motionFrame=requestAnimationFrame(animateMapMotion);else{motionFrame=0;motionTime=0}
}

function windowMode(){return mode}
function displayedGroup(id){const c=activityModel?.clusters.find(c=>c.group===id);return c?{...groups[id],name:c.name||groups[id].name,ids:c.ids,route:c.route||c.ids,label:motionLabels?.[id]||activityModel.labels[id]}:groups[id]}
function displayPosition(id){return motionPositions?.[id]||activityModel?.positions[id]||[people[id][2],people[id][3]]}

$('#groupCount').textContent=groups.length;
function avatars(ids){return '<span class="avatars">'+ids.slice(0,3).map(i=>`<span class="avatar" style="--tint:${people[i][4]}"><img src="${people[i][1]}" alt="" draggable="false"></span>`).join('')+'</span>'}
$('#groups').innerHTML=groups.map((g,i)=>`<button class="group-row" data-group="${i}"><span class="avatars membership-stack">${g.ids.slice(0,3).map(id=>membershipAvatar(id,i)).join('')}</span><span class="name">${g.name}</span></button>`).join('');
// Sample rankings for the size experiment, not live activity data.
const sizePreview=[{latest:1,activity:38},{latest:12,activity:56},{latest:8,activity:24},{latest:65,activity:68},{latest:15,activity:75},{latest:3,activity:42},{latest:82,activity:100},{latest:100,activity:90}];
// Reproducible daily demo interactions, 1 Jan–29 Oct 2026 (not live data).
const timelineEpoch=Date.UTC(2026,0,1),timelineDays=302;
let activeSort='latest',rangeStart=298,rangeEnd=301;
const timeNow=Math.max(timelineDays,Math.ceil((Date.now()-timelineEpoch)/86400000));
const timeMin=(Date.UTC(new Date().getFullYear()-1,0,1)-timelineEpoch)/86400000;
let timeSelection='range',timePoint=timeNow,timeFrom=0,timeTo=timeNow;
let timeCenter=timeNow/2,timeSpan=timeNow;
function selectedTimeBounds(){if(mode==='Social network')return [0,timeNow];return timeSelection==='point'?[0,timePoint]:[timeFrom,timeTo]}
function selectedActivityModel(){
 const [start,end]=selectedTimeBounds(),model=buildActivityMap(mode,start,end);
 if(mode==='Collaboration'){
  const baseline=buildActivityMap(mode);
  model.clusters.forEach(c=>{const delta=c.ids.reduce((sum,id)=>[sum[0]+model.positions[id][0]-baseline.positions[id][0],sum[1]+model.positions[id][1]-baseline.positions[id][1]],[0,0]);model.labels[c.group]=model.labels[c.group].map((v,axis)=>v+delta[axis]/c.ids.length)});
 }
 model.events=model.events.filter(e=>e.day>=start&&e.day<end);
 model.clusters=model.clusters.map(c=>{const events=c.events.filter(e=>e.day>=start&&e.day<end);return {...c,events,count:events.reduce((n,e)=>n+e.count,0),latest:Math.max(...events.map(e=>e.day))}}).filter(c=>c.events.length);
 model.solos=model.solos.filter(id=>model.events.some(e=>mode==='Communication'?isDirectExchange(e,id):e.sender===id||(e.contributors||[]).includes(id)));
 const visible=new Set([0,...model.solos,...model.clusters.flatMap(c=>c.ids)]);
 Object.keys(model.positions).forEach(id=>{if(!visible.has(+id))delete model.positions[id]});
 return model;
}

const dailyActivity=groups.map((g,id)=>Array.from({length:timelineDays},(_,day)=>{
 const week=Math.floor(day/7),dominant=[5,2,0,4,1,3,7,6][week%8];
 if((id+week)%4===0&&id!==dominant)return 0;
 return id===dominant?8+(day*3+id)%12:((day+id*3)%5===0?2+(id+day)%5:0);
}));
function periodCounts(start=rangeStart,end=rangeEnd){return dailyActivity.map(days=>days.slice(Math.max(0,start),Math.max(0,end+1)).reduce((a,b)=>a+b,0))}
// Scripted narrative moment: May 6 belongs to Mom and Grandma.
dailyActivity[0].fill(0);
dailyActivity.forEach((days,id)=>days[125]=id===0?96:2);
let activityCounts=periodCounts();
function timelineDate(day){return new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'short'}).format(new Date(timelineEpoch+day*86400000))}
let selectedPeriodLabel='';
function periodLabel(){if(selectedPeriodLabel)return selectedPeriodLabel;return `${timelineDate(rangeStart)} – ${timelineDate(rangeEnd)} 2026`}
function updateTimeline(){
 const visible=mode!=='Social network'&&view==='map'&&!$('.content').classList.contains('group-open');
 $('#activityTimeline').hidden=!visible;$('.content').classList.toggle('has-timeline',visible);
 renderTimeSelection();
}
function changePeriod(start,end){rangeStart=Math.max(0,Math.min(timelineDays-1,Math.round(start)));rangeEnd=Math.max(rangeStart,Math.min(timelineDays-1,Math.round(end)));activityCounts=periodCounts();setSort('activity')}
function shiftPeriod(delta){delta=Math.max(-rangeStart,Math.min(timelineDays-1-rangeEnd,delta));changePeriod(rangeStart+delta,rangeEnd+delta)}
function hoverFile(id){
 if(!activityModel)return mode==='Social network'?window.manualHoverFile?.(id):undefined;
 const events=activityModel.clusters.find(c=>c.group===id)?.events||[];
 const visible=events;
 return [...visible].sort((a,b)=>b.day-a.day)[0];
}
function hoverActor(file){return mode==='Collaboration'?file.lastEditor:file.sender}
function hoverAvatar(id){const file=hoverFile(id);return file?`<img src="${people[hoverActor(file)][1]}" alt="">`:''}
function hoverFileIcon(file){
 if(file.kind==='link')return '<span class="hover-file-icon hover-link-icon" aria-hidden="true">↗</span>';
 const src=file.kind==='spreadsheet'?'assets/icons/spreadsheet.svg':file.kind==='photo'&&file.src?file.src:file.kind==='note'?'assets/dock/notes.png':['figma','figma-link'].includes(file.kind)?'assets/dock/figma.png':'assets/icons/document.png';
 return `<span class="hover-file-icon" aria-hidden="true"><img src="${src}" alt="" draggable="false">${file.kind==='figma-link'?'<b>↗</b>':file.kind==='svg'?'<b>SVG</b>':''}</span>`;
}
function hoverDetails(id){
 const file=hoverFile(id),summary=hoverSummary(id);
 if(!file)return `<span class="hover-time">${summary}</span>`;
 const actor=hoverActor(file),name=actor===2?'Mom':actor===6?'Miki':people[actor][0];
 return `<span class="hover-time">${activityModel?summary:summary.replace(' · ',' at ')}</span><span class="hover-file"><span>${name} ${mode==='Collaboration'?'changed':file.kind==='note'?'shared':'sent'}:</span><button class="hover-filename" data-hover-file="${id}" aria-label="Open ${file.name}">${hoverFileIcon(file)}<span class="hover-file-title">${file.name}</span></button></span>`;
}
function hoverSummary(id){if(activityModel){const c=activityModel.clusters.find(c=>c.group===id);if(c)return mode==='Collaboration'?'Last change':'Prototype · Shared exchange'}return activeSort==='activity'?(activityCounts[id]===0?'No activity':`${activityCounts[id]} interaction${activityCounts[id]===1?'':'s'}`):activityDate(id)}
function rankedRadii(mode){
 if(mode==='none')return groups.map(()=>34);
 if(mode==='latest'||mode==='activity'){const order=latestFocusContexts();return groups.map((g,id)=>[76,48,32][order.findIndex(c=>c.type==='group'&&c.id===id)]||28)}
 const order=groups.map((g,i)=>i).sort((a,b)=>sizePreview[b][mode]-sizePreview[a][mode]);
 const radii=[];order.forEach((id,rank)=>radii[id]=28+28*(1-rank/(groups.length-1)));return radii;
}
function manualLatest(id){if(mode==='Social network')return sizePreview[id].latest;const [start,end]=selectedTimeBounds();for(let d=Math.min(timelineDays-1,Math.ceil(end)-1);d>=Math.floor(start);d--)if(dailyActivity[id][d]>0)return d;return -1}
function latestGroupOrder(){
 return groups.map((g,i)=>i).filter(groupVisible).sort((a,b)=>{
  const score=id=>activityModel?activityModel.clusters.find(c=>c.group===id)?.latest||0:manualLatest(id);
  return score(b)-score(a)||a-b;
 });
}
function latestFocusContexts(){
 const contexts=latestGroupOrder().map(id=>({type:'group',id,latest:activityModel?activityModel.clusters.find(c=>c.group===id).latest:manualLatest(id)}));
 if(activityModel)activityModel.solos.forEach(id=>{const events=activityModel.events.filter(e=>mode==='Communication'?isDirectExchange(e,id):e.sender===id||(e.recipients||[]).includes(id)||(e.contributors||[]).includes(id));contexts.push({type:'person',id,latest:Math.max(...events.map(e=>e.day))})});
 if(activeSort==='activity')contexts.forEach(c=>{c.latest=c.type==='group'?activityCounts[c.id]:activityModel.events.filter(e=>e.sender===c.id||(e.recipients||[]).includes(c.id)||(e.contributors||[]).includes(c.id)).reduce((n,e)=>n+e.count,0)});
 return contexts.sort((a,b)=>b.latest-a.latest||a.id-b.id).slice(0,3);
}
function groupInFocus(id){return groupVisible(id)&&(activeSort==='none'||latestFocusContexts().some(c=>c.type==='group'&&c.id===id))}
function personInFocus(id){return id===0||activeSort==='none'||latestFocusContexts().some(c=>c.type==='person'?c.id===id:displayedGroup(c.id).ids.includes(id))}
function sortSidebar(mode){
 const order=groups.map((g,i)=>i);
 if(mode!=='none')order.sort((a,b)=>mode==='activity'?activityCounts[b]-activityCounts[a]||a-b:sizePreview[b][mode]-sizePreview[a][mode]);
 if(activityModel&&mode!=='none')order.sort((a,b)=>{const ca=activityModel.clusters.find(c=>c.group===a),cb=activityModel.clusters.find(c=>c.group===b);return (mode==='latest'?(cb?.latest||0)-(ca?.latest||0):(activityCounts[b]||0)-(activityCounts[a]||0))});
 if(mode==='latest'){const ranks=latestGroupOrder();order.sort((a,b)=>(ranks.indexOf(a)<0?99:ranks.indexOf(a))-(ranks.indexOf(b)<0?99:ranks.indexOf(b)))}
 const rows=[...document.querySelectorAll('#groups .group-row')];
 order.forEach(id=>$('#groups').appendChild(rows.find(row=>Number(row.dataset.group)===id)));
 const caption=$('#sidebarSort');caption.hidden=mode==='none';
 caption.textContent={latest:'Sorted by last activity',activity:'Sorted by most activity'+(' · '+periodLabel()),none:''}[mode];
}
sortSidebar('latest');
let emphasisMix=1,targetEmphasis=1;
let currentRadii=rankedRadii('latest'),targetRadii=currentRadii.slice(),sizeFrame=0,sizeTime=0;
function animateSize(time){
 const dt=sizeTime?Math.min(time-sizeTime,50):16;sizeTime=time;let done=true;
 currentRadii=currentRadii.map((r,i)=>{const diff=targetRadii[i]-r;if(Math.abs(diff)<.03)return targetRadii[i];done=false;return r+diff*(1-Math.exp(-dt/95))});
 const mixDiff=targetEmphasis-emphasisMix;if(Math.abs(mixDiff)<.001){emphasisMix=targetEmphasis}else{done=false;emphasisMix+=mixDiff*(1-Math.exp(-dt/95))}
 resizeBands();if(done){sizeFrame=0;sizeTime=0}else sizeFrame=requestAnimationFrame(animateSize);
}
function setSort(nextSort,timelineOnly=false){if(mode!=='Social network'&&nextSort==='activity')nextSort='none';const oldGroups=new Set(groups.map((_,id)=>id).filter(groupInFocus)),oldPeople=new Set(people.map((_,id)=>id).filter(personInFocus));const changed=nextSort!==activeSort;activeSort=nextSort;
 document.querySelectorAll('#sortMenu [data-sort]').forEach(b=>{b.hidden=mode!=='Social network'&&b.dataset.sort==='activity';b.setAttribute('aria-checked',String(b.dataset.sort===activeSort))});$('#sortButton').title='Sort by: '+({none:'Overview',latest:'Last activity',activity:'Most activity'}[activeSort]);
 const [start,end]=selectedTimeBounds();rangeStart=Math.floor(start);rangeEnd=Math.ceil(end)-1;
 let reuseScene=false;
 if(windowMode()!=='Social network'){
  const next=selectedActivityModel();
  if(timelineOnly&&activityModel&&JSON.stringify(next.events)===JSON.stringify(activityModel.events)){selectedPeriodLabel=timeText(start)+' – '+timeText(end);updateTimeline();return}
  reuseScene=timelineOnly&&activityModel&&JSON.stringify(Object.keys(next.positions))===JSON.stringify(Object.keys(activityModel.positions))&&JSON.stringify(next.clusters.map(c=>[c.group,c.ids]))===JSON.stringify(activityModel.clusters.map(c=>[c.group,c.ids]));
  stageMapMotion(next);activityModel=next;
 }
 activityCounts=timeCounts(start,end);if(!reuseScene)draw();
 if(activityModel&&!reducedMotion.matches){scene.querySelectorAll('.map-group,.member-enclosures').forEach(el=>{const id=Number(el.dataset.group);if(groupInFocus(id)&&!oldGroups.has(id))el.animate([{opacity:0},{opacity:1}],{duration:140,easing:'ease-out'})});scene.querySelectorAll('.person').forEach(el=>{const id=Number(el.dataset.personId);if(personInFocus(id)&&!oldPeople.has(id))el.animate([{opacity:0},{opacity:1}],{duration:140,easing:'ease-out'})})}
 selectedPeriodLabel=timeText(start)+' – '+timeText(end);
 updateTimeline();sortSidebar(nextSort);if(reuseScene)renderLabels();positionLabels();targetEmphasis=nextSort==='none'?0:1;targetRadii=rankedRadii(nextSort);if(reducedMotion.matches){cancelAnimationFrame(sizeFrame);sizeFrame=0;sizeTime=0;currentRadii=targetRadii.slice();emphasisMix=targetEmphasis;resizeBands()}else if(!sizeFrame)sizeFrame=requestAnimationFrame(animateSize)};
const sortButton=$('#sortButton'),sortMenu=$('#sortMenu');
function closeSort(focus=true){sortMenu.hidden=true;sortButton.setAttribute('aria-expanded','false');if(focus)sortButton.focus()}
function openSort(last=false){sortMenu.hidden=false;sortButton.setAttribute('aria-expanded','true');const items=sortMenu.querySelectorAll('[data-sort]:not([hidden])');(last?items[items.length-1]:sortMenu.querySelector('[aria-checked="true"]')||items[0]).focus()}
sortButton.onclick=()=>sortMenu.hidden?openSort():closeSort();
sortButton.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();openSort(e.key==='ArrowUp')}};
sortMenu.onclick=e=>{const item=e.target.closest('[data-sort]');if(!item)return;setSort(item.dataset.sort);sortMenu.querySelectorAll('[data-sort]:not([hidden])').forEach(b=>b.setAttribute('aria-checked',b===item?'true':'false'));sortButton.title='Sort by: '+item.textContent.replace('✓','').trim();closeSort()};
sortMenu.onkeydown=e=>{const items=[...sortMenu.querySelectorAll('[data-sort]:not([hidden])')],index=items.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus()}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSort()}else if(e.key==='Tab')closeSort(false)};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.finder-sort'))closeSort(false)});
function groupVisible(id){return activityModel?activityModel.clusters.some(c=>c.group===id):id!==6&&(timeSelection==='point'&&timePoint===timeNow||dailyActivity[id].slice(Math.max(0,Math.floor(selectedTimeBounds()[0])),Math.max(0,Math.ceil(selectedTimeBounds()[1]))).some(n=>n>0))}
function draw(){
 document.querySelectorAll('#groups .group-row').forEach(row=>{const id=+row.dataset.group,g=displayedGroup(id);row.hidden=!groupVisible(id);row.querySelector('.name').textContent=g.name;row.querySelector('.avatars').innerHTML=g.ids.slice(0,3).map(id=>membershipAvatar(id,+row.dataset.group)).join('')});
 $('#groupCount').textContent=groups.filter((g,i)=>groupVisible(i)).length;
 let html=`<defs><radialGradient id="closeness-field"><stop offset="0" stop-color="#7196c3" stop-opacity=".34"/><stop offset=".35" stop-color="#7196c3" stop-opacity=".24"/><stop offset=".7" stop-color="#7196c3" stop-opacity=".10"/><stop offset="1" stop-color="#7196c3" stop-opacity="0"/></radialGradient></defs><circle class="closeness-field" cx="570" cy="360" r="380" fill="url(#closeness-field)" pointer-events="none" aria-hidden="true"/>`;
 const bands=groups.map((base,i)=>{const g=displayedGroup(i);return {g,i,pts:(g.route||g.ids).map(displayPosition),radius:g.radius}}).filter(({i})=>groupVisible(i));
 if(mode==='Collaboration')bands.sort((a,b)=>b.pts.length-a.pts.length);
 // Each adjacent pair gets its own closed capsule, centered on both people.
 bands.forEach(({g,i,pts,radius})=>{
  const segments=pts.slice(1).map((b,k)=>{
   const a=pts[k],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
   const angle=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
   return `<rect class="rubberband" data-from="${(g.route||g.ids)[k]}" data-to="${(g.route||g.ids)[k+1]}" data-size-group="${i}" data-radius="${radius}" data-length="${length}" x="${-radius}" y="${-radius}" width="${length+radius*2}" height="${radius*2}" rx="${radius}" transform="translate(${a[0]} ${a[1]}) rotate(${angle})" fill="${g.color}" fill-opacity=".20" stroke="${g.color}" stroke-width="5"/>`;
  }).join('');
  html+=`<g class="map-group" data-group="${i}" tabindex="0" role="button" aria-label="Open ${g.name}" opacity="${selected<0||selected===i?1:.35}">${segments}</g>`;
 });
 // Keep every member's enclosure visible, including at bends and shared nodes.
 bands.forEach(({g,i,pts,radius})=>{
  html+=`<g class="member-enclosures" data-group="${i}" opacity="${selected<0||selected===i?1:.35}">${pts.map(([x,y],k)=>`<circle data-member="${(g.route||g.ids)[k]}" data-size-group="${i}" data-radius="${radius}" cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${g.color}" stroke-width="5"/>`).join('')}</g>`;
 });
 // Avatars sit above every band, so later groups cannot obscure them.
 people.forEach((p,id)=>{if(activityModel?!activityModel.positions[id]:id!==0&&!groups.some((g,i)=>groupVisible(i)&&g.ids.includes(id)))return;const [x,y]=displayPosition(id),solo=id!==0&&!!activityModel;const avatar=person(id,x,y,selected<0||displayedGroup(selected).ids.includes(id)||id===0?1:.35);html+=solo?`<g class="activity-solo" data-activity-person="${id}" tabindex="0" role="button" aria-label="Open ${p[0]}">${avatar}</g>`:avatar});

 scene.innerHTML=html;renderLabels();transform();}
// Fixed sample timestamps, Europe/Berlin; replace with actual events when connected.
const lastActivityDates=['2026-05-06T16:20:00+02:00','2026-09-21T10:15:00+02:00','2026-09-12T14:30:00+02:00','2026-10-23T19:45:00+02:00','2026-09-28T18:10:00+02:00','2026-08-30T12:00:00+02:00','2026-10-26T09:15:00+01:00','2026-10-28T20:30:00+01:00'];
function activityDate(id){const date=new Date(lastActivityDates[id]);return new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',year:'2-digit'}).format(date)+' · '+new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date)}
let hoveredGroup=-1,hoveredPerson=-1,hoverCloseTimer;
let hoverGrowth=0,hoverGrowthTarget=0,hoverGrowthFrame=0,hoverGrowthTime=0,hoverBandGroup=-1;
function animateHoverGrowth(time){
 const dt=hoverGrowthTime?Math.min(50,time-hoverGrowthTime):16;hoverGrowthTime=time;
 hoverGrowth+=(hoverGrowthTarget-hoverGrowth)*(1-Math.exp(-dt/155));
 if(Math.abs(hoverGrowthTarget-hoverGrowth)<.003)hoverGrowth=hoverGrowthTarget;
 updateHoverConnection();
 if(hoverGrowth!==hoverGrowthTarget)hoverGrowthFrame=requestAnimationFrame(animateHoverGrowth);else{hoverGrowthFrame=0;hoverGrowthTime=0}
}
function updateHoverConnection(){
 const personActive=mode!=='Social network'&&hoveredPerson>0&&personInFocus(hoveredPerson),active=(personActive||hoveredGroup>=0&&groupInFocus(hoveredGroup))&&!$('.content').classList.contains('group-open'),id=active?(personActive?-hoveredPerson-2:hoveredGroup):hoverBandGroup;
 if(active&&hoverBandGroup!==id){hoverBandGroup=id;hoverGrowth=0}
 hoverGrowthTarget=active?1:0;
 if(reducedMotion.matches)hoverGrowth=hoverGrowthTarget;else if(hoverGrowth!==hoverGrowthTarget&&!hoverGrowthFrame)hoverGrowthFrame=requestAnimationFrame(animateHoverGrowth);
 const members=id>=0?displayedGroup(id).ids:id<-1?[-id-2]:[];
 scene.querySelectorAll('.map-group,.member-enclosures').forEach(el=>{el.classList.toggle('hover-muted',active&&+el.dataset.group!==id)});
 document.querySelectorAll('.map-label').forEach(el=>{el.classList.toggle('hover-muted',active&&+el.dataset.group!==id)});
 scene.querySelectorAll('.person').forEach(el=>{const personId=+el.dataset.personId;el.classList.toggle('hover-muted',active&&personId!==0&&!members.includes(personId));el.classList.toggle('show-person-name',active&&members.includes(personId))});
 scene.querySelectorAll('.activity-solo').forEach(el=>el.classList.toggle('hover-muted',active&&!members.includes(+el.dataset.activityPerson)));
 let band=scene.querySelector('.hover-self-connection');
 if(!active&&hoverGrowth===0){band?.remove();return}
 if(!band){band=document.createElementNS('http://www.w3.org/2000/svg','g');band.classList.add('hover-self-connection','hover-connected');band.setAttribute('aria-hidden','true');band.style.pointerEvents='none';scene.querySelector('.closeness-field').after(band)}
 band.style.opacity=Math.min(1,hoverGrowth*5);
 const a=displayPosition(0),nearest=members.reduce((best,member)=>{const p=displayPosition(member),d=Math.hypot(p[0]-a[0],p[1]-a[1]);return !best||d<best.d?{p,d}:best},null);if(!nearest)return;
 const b=nearest.p,r=(id>=0?currentRadii[id]:30*soloActivitySize(-id-2))/Math.pow(scale,.85),color=id>=0?displayedGroup(id).color:soloPersonColor(-id-2),stroke=5/scale,angle=Math.atan2(a[1]-b[1],a[0]-b[0])*180/Math.PI;
 band.innerHTML=`<rect x="${-r}" y="${-r}" width="${nearest.d*hoverGrowth+2*r}" height="${2*r}" rx="${r}" transform="translate(${b[0]} ${b[1]}) rotate(${angle})" fill="${color}" fill-opacity=".2" stroke="${color}" stroke-width="${stroke}"/><circle cx="${b[0]+(a[0]-b[0])*hoverGrowth}" cy="${b[1]+(a[1]-b[1])*hoverGrowth}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"/>`;
}
function revealActivity(id){
 hoveredPerson=-1;
 clearTimeout(hoverCloseTimer);if(id>=0&&!groupInFocus(id))id=-1;hoveredGroup=id;
 document.querySelectorAll('.map-label').forEach(el=>{const active=Number(el.dataset.group)===id;el.classList.toggle('activity-visible',active);el.style.zIndex=active?'5':''});
 updateHoverConnection();
}
function groupTarget(target){return target instanceof Element?target.closest('[data-group]'):null}
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const g=groupTarget(e.target);if(g)revealActivity(Number(g.dataset.group))});
document.addEventListener('pointerout',e=>{const from=groupTarget(e.target),to=groupTarget(e.relatedTarget);if(!from)return;if(to&&to.dataset.group===from.dataset.group)return;if(to){revealActivity(Number(to.dataset.group));return}hoverCloseTimer=setTimeout(()=>revealActivity(-1),150)});
document.addEventListener('focusin',e=>{const g=groupTarget(e.target);if(g)revealActivity(Number(g.dataset.group))});
document.addEventListener('focusout',e=>{if(groupTarget(e.target)&&!groupTarget(e.relatedTarget))hoverCloseTimer=setTimeout(()=>revealActivity(-1),150)});
function personHoverTarget(target){return mode!=='Social network'&&target instanceof Element?target.closest('[data-activity-person]'):null}
function revealPerson(id){if(!directContextVisible(id)){const cluster=activityModel?.clusters.filter(c=>c.ids.includes(id)&&groupInFocus(c.group)).sort((a,b)=>(b.latest??0)-(a.latest??0))[0];revealActivity(cluster?.group??-1);return}revealActivity(-1);hoveredPerson=id;updateHoverConnection()}
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const p=personHoverTarget(e.target);if(p)revealPerson(+p.dataset.activityPerson)});
document.addEventListener('pointerout',e=>{const p=personHoverTarget(e.target),next=personHoverTarget(e.relatedTarget);if(!p||next===p)return;hoverCloseTimer=setTimeout(()=>revealActivity(-1),150)});
document.addEventListener('focusin',e=>{const p=personHoverTarget(e.target);if(p)revealPerson(+p.dataset.activityPerson)});
document.addEventListener('focusout',e=>{if(personHoverTarget(e.target)&&!personHoverTarget(e.relatedTarget))hoverCloseTimer=setTimeout(()=>revealActivity(-1),150)});
const labelBoundsObserver=new ResizeObserver(clampHoverLabels);
function clampHoverLabels(){
 const bounds=$('#map').getBoundingClientRect();
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 document.querySelectorAll('.map-label').forEach(el=>{
  if(el.hidden)return;const left=parseFloat(el.style.left)||0,top=parseFloat(el.style.top)||0;
  el.style.maxWidth=Math.max(0,bounds.width-16)+'px';const w=el.offsetWidth,h=el.offsetHeight;
  let x=Math.max(8,Math.min(bounds.width-w-8,left)),y=Math.max(8,Math.min(bounds.height-h-8,top-h/2));
  if(el.classList.contains('activity-visible')){
   const id=Number(el.dataset.group),nodes=[...scene.querySelectorAll(`.map-group[data-group="${id}"],.member-enclosures[data-group="${id}"]`)];
   const rects=nodes.map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.height);
   if(rects.length){const groupLeft=Math.min(...rects.map(r=>r.left))-bounds.left,groupRight=Math.max(...rects.map(r=>r.right))-bounds.left,groupTop=Math.min(...rects.map(r=>r.top))-bounds.top,groupBottom=Math.max(...rects.map(r=>r.bottom))-bounds.top;
    x=Math.max(8,Math.min(bounds.width-w-8,(groupLeft+groupRight-w)/2));
    y=groupTop-h-16;
    y=Math.max(8,y);
   }
  }
  el.style.translate=`${x-left}px ${y-(top-h/2)}px`;
 });
}
new ResizeObserver(clampHoverLabels).observe($('#map'));
function renderLabels(){
 labelBoundsObserver.disconnect();
 $('#mapLabels').innerHTML=groups.map((base,i)=>{const g=displayedGroup(i);return `<div role="group" class="map-label ${hoveredGroup===i?'activity-visible':''}" data-group="${i}" ${groupInFocus(i)?'':'hidden'} aria-label="${g.name}, ${hoverSummary(i)}" aria-pressed="${selected===i}" style="--group-color:${g.color};opacity:${selected<0||selected===i?1:.45}"><button class="pill-name" aria-label="Open ${g.name}">${g.name}</button><span class="pill-joint" aria-hidden="true">${hoverAvatar(i)}</span><span class="pill-date">${hoverDetails(i)}</span></div>`}).join('');
 document.querySelectorAll('.map-label').forEach(el=>labelBoundsObserver.observe(el));
}
document.addEventListener('click',e=>{const target=e.target.closest('[data-hover-file]');if(!target)return;e.preventDefault();e.stopImmediatePropagation();const file=hoverFile(+target.dataset.hoverFile);if(file)window.openHoverFile?.(file)},true);
document.addEventListener('keydown',e=>{if(e.target.closest('[data-hover-file]')&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();e.target.click()}},true);
function positionLabels(){
 requestAnimationFrame(clampHoverLabels);
 const matrix=scene.getScreenCTM();if(!matrix)return;
 const bounds=$('#map').getBoundingClientRect(),placed=[];
 const labels=[...document.querySelectorAll('.map-label')];
 if(motionPositions&&labels.filter(el=>!el.hidden).every(el=>el.dataset.anchorDx!==undefined)){
  labels.forEach(label=>{if(label.hidden)return;const g=displayedGroup(+label.dataset.group),point=new DOMPoint(g.label[0]+g.name.length*3.15,g.label[1]-2.5).matrixTransform(matrix);label.style.left=(point.x-bounds.left+Number(label.dataset.anchorDx))+'px';label.style.top=(point.y-bounds.top+Number(label.dataset.anchorDy))+'px'});return;
 }
 const faces=[...scene.querySelectorAll('.person > image, .person > .map-portrait')].map(el=>{const r=el.getBoundingClientRect();return {x:r.left-bounds.left-9,y:r.top-bounds.top-9,w:r.width+18,h:r.height+18}});
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 document.querySelectorAll('.map-label').forEach((label,i)=>{
  if(label.hidden)return;
  const g=displayedGroup(i);
  const point=new DOMPoint(g.label[0]+g.name.length*3.15,g.label[1]-2.5).matrixTransform(matrix);
  const w=label.querySelector('.pill-name').offsetWidth,h=label.offsetHeight||34,origin={x:point.x-bounds.left-w/2,y:point.y-bounds.top-h/2};
  let best=null;
  for(let oy=-64;oy<=64;oy+=16)for(let ox=-64;ox<=64;ox+=16){const box={x:Math.max(8,Math.min(bounds.width-w-8,origin.x+ox)),y:Math.max(8,Math.min(bounds.height-h-8,origin.y+oy)),w,h};const cost=Math.hypot(ox,oy)+[...placed,...faces].reduce((sum,r)=>sum+overlap({...box,x:box.x-5,y:box.y-5,w:w+10,h:h+10},r)*100,0);if(!best||cost<best.cost)best={...box,cost}}
  placed.push(best);label.dataset.anchorDx=best.x-(point.x-bounds.left);label.dataset.anchorDy=best.y+h/2-(point.y-bounds.top);label.style.left=`${best.x}px`;label.style.top=`${best.y+h/2}px`; 
 });
}
// Visible artwork bounds compensate for unequal transparent PNG padding.
const portraitBounds=[[0, 0, 105, 105, 105, 105], [71, 54, 145, 191, 280, 280], [65, 47, 147, 171, 272, 272], [23, 22, 125, 148, 171, 171], [50, 17, 112, 148, 208, 208], [81, 50, 114, 166, 272, 272], [58, 45, 138, 184, 256, 252], [67, 41, 132, 180, 272, 272], [44, 18, 120, 167, 208, 208], [47, 34, 115, 174, 208, 208], [41, 27, 122, 148, 208, 208], [47, 23, 119, 168, 208, 208], [50, 28, 115, 140, 210, 210]];
function directContextVisible(id){return activityModel?.solos.includes(id)&&(activeSort==='none'||latestFocusContexts().some(c=>c.type==='person'&&c.id===id))}
function person(id,x,y,opacity){const p=people[id],manual=!activityModel;
 const [left,top,w,h,iw,ih]=portraitBounds[id]||[0,0,208,208,208,208],size=40;
 const portrait=manual?`<svg class="map-portrait" x="${x-size*w/h/2}" y="${y-size/2}" width="${size*w/h}" height="${size}" viewBox="${left} ${top} ${w} ${h}"><image href="${p[1]}" width="${iw}" height="${ih}"/></svg>`:`<image href="${p[1]}" x="${x-(id===0?29:20)}" y="${y-(id===0?29:20)}" width="${id===0?58:40}" height="${id===0?58:40}" preserveAspectRatio="xMidYMid meet"/>`;
 return `<g class="person" data-person-id="${id}" data-x="${x}" data-y="${y}" opacity="${opacity}">${id===0||directContextVisible(id)?`<circle cx="${x}" cy="${y}" r="${id===0?(manual?20:29):28}" ${id!==0&&activityModel?.solos.includes(id)?`stroke="${soloPersonColor(id)}" stroke-width="3"`:''} fill="${id===0?p[4]:'none'}"/>`:""}${portrait}${id!==0?`<text x="${x}" y="${y+47}" text-anchor="middle" fill="#9398a1" font-size="12">${id===0?'You':p[0]}</text>`:''}</g>`}
function membershipAvatar(id,groupIndex){
 const group=displayedGroup(groupIndex);
 return `<span class="membership-avatar" style="background:${group.color}" title="${group.name}"><img src="${people[id][1]}" alt="${people[id][0]}" draggable="false"></span>`;
}
function select(i){selected=i;document.querySelectorAll('.group-row').forEach(e=>{e.classList.toggle('selected',Number(e.dataset.group)===i);e.setAttribute('aria-pressed',Number(e.dataset.group)===i)});draw()}
document.addEventListener('click',e=>{const g=e.target.closest('[data-group]');if(g){select(+g.dataset.group);window.openGroupView?.(+g.dataset.group)}});document.addEventListener('keydown',e=>{const g=e.target.closest('[data-group]');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(+g.dataset.group);window.openGroupView?.(+g.dataset.group)}if(e.key==='Escape'){revealActivity(-1);select(-1)}});
// Ranking changes geometry only; all visible contexts have the same visual strength.
function bandStyle(id){return {color:groups[id].color,width:5,fill:.2,opacity:1}}
function personActivityOpacity(){return 1}
// Communication's latest direct sender receives a larger portrait, never a group band.
function soloActivitySize(id){
 if(activeSort==='none'||!activityModel?.solos.includes(id))return 1;
 const rank=latestFocusContexts().findIndex(c=>c.type==='person'&&c.id===id);
 return [1.65,1.3,1][rank]||1;
}
function resizeBands(){
 scene.querySelectorAll('.map-group,.member-enclosures').forEach(el=>{
  const focused=groupInFocus(Number(el.dataset.group));
  el.style.display=activeSort!=='none'&&!focused?'none':'';
  el.style.pointerEvents=focused?'':'none';
  el.setAttribute('aria-hidden',String(!focused));
  if(el.classList.contains('map-group'))el.setAttribute('tabindex',focused?'0':'-1');
 });
 document.querySelectorAll('.map-label').forEach(el=>{
  const style=bandStyle(Number(el.dataset.group));
  el.style.opacity=1;el.style.setProperty('--group-color',style.color);
  el.style.background=`color-mix(in srgb, ${style.color} 38%, white)`;
  el.style.borderColor=style.color;el.style.borderWidth='1px';el.style.fontWeight=500;
 });
 document.querySelectorAll('.person').forEach(el=>{const x=Number(el.dataset.x),y=Number(el.dataset.y),id=Number(el.dataset.personId),[px,py]=displayPosition(id);el.style.display=personInFocus(id)?'':'none';el.setAttribute('opacity',personActivityOpacity(id)*(selected<0||id===0||displayedGroup(selected).ids.includes(id)?1:.35));el.setAttribute('transform',`translate(${px} ${py}) scale(${Math.pow(scale,-.85)*soloActivitySize(id)}) translate(${-x} ${-y})`)});
 scene.querySelectorAll('.activity-solo').forEach(el=>{const visible=personInFocus(Number(el.dataset.activityPerson));el.style.display=visible?'':'none';el.setAttribute('aria-hidden',String(!visible));el.setAttribute('tabindex',visible?'0':'-1')});
 const softness=Math.pow(scale,.85),stroke=5/scale;
 document.querySelectorAll('.rubberband').forEach(el=>{
  const a=displayPosition(Number(el.dataset.from)),b=displayPosition(Number(el.dataset.to));el.dataset.length=Math.hypot(b[0]-a[0],b[1]-a[1]);el.setAttribute('transform',`translate(${a[0]} ${a[1]}) rotate(${Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI})`);
  const r=currentRadii[Number(el.dataset.sizeGroup)]/softness;
  el.setAttribute('x',-r);el.setAttribute('y',-r);
  el.setAttribute('width',Number(el.dataset.length)+2*r);
  el.setAttribute('height',2*r);el.setAttribute('rx',r);
  const fillStyle=bandStyle(Number(el.dataset.sizeGroup));el.setAttribute('fill',fillStyle.color);el.setAttribute('fill-opacity',fillStyle.fill);
  const style=bandStyle(Number(el.dataset.sizeGroup));el.setAttribute('stroke-width',style.width/scale);el.setAttribute('stroke',style.color);el.setAttribute('stroke-opacity',style.opacity);
 });
 document.querySelectorAll('.member-enclosures circle').forEach(el=>{
  const [x,y]=displayPosition(Number(el.dataset.member));el.setAttribute('cx',x);el.setAttribute('cy',y);
  el.setAttribute('r',currentRadii[Number(el.dataset.sizeGroup)]/softness);
  const style=bandStyle(Number(el.dataset.sizeGroup));el.setAttribute('stroke-width',style.width/scale);el.setAttribute('stroke',style.color);el.setAttribute('stroke-opacity',style.opacity);
 });

 updateHoverConnection();
}
let targetScale=1,zoomFrame=0,lastFrame=0;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
function animateZoom(time){
 const dt=lastFrame?Math.min(time-lastFrame,50):16;lastFrame=time;
 scale+=(targetScale-scale)*(1-Math.exp(-dt/65));
 if(Math.abs(targetScale-scale)<.0005){scale=targetScale;zoomFrame=0;lastFrame=0;transform();return;}
 transform();zoomFrame=requestAnimationFrame(animateZoom);
}
function transform(){scene.setAttribute('transform',`translate(${550+dx} ${360+dy}) scale(${scale}) translate(-550 -360)`);$('#zoomLabel').textContent=Math.round(scale*100)+'%';resizeBands();positionLabels()}function zoom(n){targetScale=Math.min(2.5,Math.max(.5,n));if(reducedMotion.matches){cancelAnimationFrame(zoomFrame);zoomFrame=0;lastFrame=0;scale=targetScale;transform()}else if(!zoomFrame){zoomFrame=requestAnimationFrame(animateZoom)}}$('#plus').onclick=()=>zoom(targetScale+.15);$('#minus').onclick=()=>zoom(targetScale-.15);$('#reset').onclick=()=>{dx=dy=0;zoom(1)};const svg=$('#network');$('#map').addEventListener('wheel',e=>{e.preventDefault();zoom(targetScale*Math.exp(-Math.max(-120,Math.min(120,e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?svg.clientHeight:1)))*.0015))},{passive:false});let drag=null;svg.addEventListener('pointerdown',e=>{if(e.target.closest('[data-group],[data-activity-person]'))return;drag=[e.clientX,e.clientY,dx,dy];svg.setPointerCapture(e.pointerId)});svg.addEventListener('pointermove',e=>{if(!drag)return;dx=drag[2]+(e.clientX-drag[0])*1100/svg.clientWidth;dy=drag[3]+(e.clientY-drag[1])*720/svg.clientHeight;transform()});svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
const viewButton=$('#mapButton'),viewMenu=$('#viewMenu');
function closeViewMenu(){viewMenu.hidden=true;viewButton.setAttribute('aria-expanded','false')}
viewButton.onclick=()=>{viewMenu.hidden=!viewMenu.hidden;viewButton.setAttribute('aria-expanded',String(!viewMenu.hidden));if(!viewMenu.hidden)$('#mapViewOption').focus()};
$('#mapViewOption').onclick=()=>{closeViewMenu();viewButton.focus()};
viewButton.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();viewMenu.hidden=false;viewButton.setAttribute('aria-expanded','true');$('#mapViewOption').focus()}};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.finder-view'))closeViewMenu()});
viewMenu.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();closeViewMenu();viewButton.focus()}else if(e.key==='Tab')closeViewMenu()};
function mapTitle(){return mode==='Social network'?'Social network':mode}
let previousMapCamera;
let collaborationFitFrame = 0;

function fitCollaborationMap() {
 collaborationFitFrame = 0;
 const viewport = $('#map').getBoundingClientRect();
 const matrix = svg.getScreenCTM();
 if (!matrix || !viewport.width || !viewport.height) return;

 cancelAnimationFrame(zoomFrame);
 zoomFrame = lastFrame = 0;
 const artwork = [...scene.querySelectorAll('.member-enclosures circle, .person')];
 const labels = [...$('#mapLabels').querySelectorAll('.map-label:not([hidden])')];
 const inset = Math.min(8, viewport.width / 12, viewport.height / 12);
 const controls = $('#map .zoom').getBoundingClientRect();
 const bottom = viewport.bottom - inset;
 const centerX = (viewport.left + viewport.right) / 2;
 const centerY = (viewport.top + inset + bottom) / 2;

 function bounds(elements) {
  const boxes = elements.map(el => el.getBoundingClientRect()).filter(box => box.width && box.height);
  return {
   left: Math.min(...boxes.map(box => box.left)),
   top: Math.min(...boxes.map(box => box.top)),
   right: Math.max(...boxes.map(box => box.right)),
   bottom: Math.max(...boxes.map(box => box.bottom))
  };
 }

 const fits = candidate => {
  scale = candidate;
  dx = dy = 0;
  transform();
  const content = bounds(artwork);
  dx = (centerX - (content.left + content.right) / 2) / matrix.a;
  dy = (centerY - (content.top + content.bottom) / 2) / matrix.d;
  transform();
  const visible = bounds([...artwork, ...labels]);
  const coversControls = controls.height && visible.right > controls.left && visible.bottom > controls.top;
  return !coversControls && visible.left >= viewport.left + inset && visible.right <= viewport.right - inset &&
   visible.top >= viewport.top + inset && visible.bottom <= bottom;
 };

 let low = .5, high = 2.5;
 if (artwork.some(el => Number(el.dataset.personId) > 0 && el.getBoundingClientRect().width)) {
  if (fits(high)) low = high;
  else {
   for (let i = 0; i < 6; i++) {
    const candidate = (low + high) / 2;
    if (fits(candidate)) low = candidate;
    else high = candidate;
   }
  }
 } else {
  low = 1;
 }
 fits(low);
 targetScale = scale;
}

function setRelationMode(nextMode){
 if (mode !== 'Collaboration' && nextMode === 'Collaboration') {
  previousMapCamera = { scale: targetScale, dx, dy };
 } else if (mode === 'Collaboration' && nextMode !== 'Collaboration' && previousMapCamera) {
  cancelAnimationFrame(zoomFrame);
  zoomFrame = lastFrame = 0;
  scale = targetScale = previousMapCamera.scale;
  ({ dx, dy } = previousMapCamera);
 }
 revealActivity(-1);
 stopMapMotion();
 mode=nextMode;
 document.querySelector('#mapChannelControl').hidden=mode!=='Communication';
 $('#folderHeading').textContent=mapTitle();
 activityModel=mode==='Social network'?null:buildActivityMap(mode);
 selected=-1;
 currentRadii=rankedRadii(activeSort);
 targetRadii=currentRadii.slice();
 setSort(activeSort);
 document.querySelectorAll('.relation').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 draw();
 cancelAnimationFrame(collaborationFitFrame);
 if (mode === 'Collaboration') collaborationFitFrame = requestAnimationFrame(fitCollaborationMap);
}
const mapChannelControl=document.createElement('label');mapChannelControl.id='mapChannelControl';mapChannelControl.className='channel-filter';mapChannelControl.hidden=true;
mapChannelControl.innerHTML='<select aria-label="Communication channel"><option value="all">All</option>'+[...new Set(activityFixtures.Communication.map(e=>e.channel))].sort().map(c=>`<option value="${c}">${c}</option>`).join('')+'</select>';
document.querySelector('.header-actions').prepend(mapChannelControl);
mapChannelControl.querySelector('select').onchange=e=>{communicationChannel=e.target.value;revealActivity(-1);setSort(activeSort)};makeChannelSearch(mapChannelControl.querySelector('select'));
document.querySelectorAll('.relation').forEach(e=>e.onclick=()=>setRelationMode(e.dataset.mode));$('#close').onclick=$('#minimize').onclick=()=>$('#window').hidden=true;$('#finder').onclick=()=>$('#window').hidden=false;$('#maximize').onclick=()=>$('#window').classList.toggle('full');function clock(){const now=new Date();$('#dockMonth').textContent=new Intl.DateTimeFormat('de-DE',{month:'short',timeZone:'Europe/Berlin'}).format(now).replace('.','').toUpperCase();$('#dockDay').textContent=new Intl.DateTimeFormat('de-DE',{day:'numeric',timeZone:'Europe/Berlin'}).format(now);$('#clock').textContent=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',weekday:'short',day:'numeric',month:'short'}).format(now)+'  '+new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'}).format(now)}clock();setInterval(clock,60000);draw();

new ResizeObserver(positionLabels).observe($('#map'));

// Time selection is independent from sorting; the viewport only changes navigation scale.
function timeCounts(start,end){
 if(mode!=='Social network')return groups.map((g,id)=>activityFixtures[mode].filter(e=>e.group===id&&e.day>=start&&e.day<end).reduce((n,e)=>n+e.count,0));
 return dailyActivity.map(days=>days.slice(Math.max(0,Math.floor(start)),Math.max(0,Math.ceil(end))).reduce((a,b)=>a+b,0));
}
function timeText(day){if(day>=timeNow)return 'Now';return new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'}).format(new Date(timelineEpoch+day*86400000))}
function renderTimeSelection(){
 const point=timeSelection==='point',lo=Math.max(timeMin,timeCenter-timeSpan/2),hi=Math.min(timeNow,timeCenter+timeSpan/2);
 $('#timeSelectionLabel').textContent=point?(timePoint===timeNow?'Now':timeText(timePoint)):timeText(timeFrom)+' – '+timeText(Math.ceil(timeTo)-1);
 const a=$('#timeStart'),b=$('#timeEnd');a.hidden=point;
 for(const input of [a,b]){input.min=lo;input.max=hi;input.step=1/24}
 a.value=timeFrom;b.value=point?timePoint:timeTo;b.setAttribute('aria-label',point?'Point in time':'Period end');a.setAttribute('aria-valuetext',timeText(timeFrom));b.setAttribute('aria-valuetext',point&&timePoint===timeNow?'Now':timeText(+b.value));
 $('#timeAxisStart').textContent=timeText(lo);$('#timeAxisEnd').textContent=hi===timeNow?'Now':timeText(hi);
 const pct=v=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100));
 $('#timeSelectedBand').style.left=(point?pct(timePoint):pct(timeFrom))+'%';$('#timeSelectedBand').style.width=(point?0:pct(timeTo)-pct(timeFrom))+'%';
}
function setTimeViewport(center,span){timeSpan=Math.min(timeNow-timeMin,Math.max(1,span));timeCenter=Math.max(timeMin+timeSpan/2,Math.min(timeNow-timeSpan/2,center));renderTimeSelection()}
function dateISO(day){return new Date(timelineEpoch+day*86400000).toISOString().slice(0,10)}
function dateDay(value){return (Date.parse(value+'T00:00:00Z')-timelineEpoch)/86400000}
function periodPreset(kind,today){
 const d=new Date(today+'T00:00:00Z'),y=d.getUTCFullYear(),m=d.getUTCMonth();let start,end;
 if(kind==='day'){end=new Date(d);start=new Date(d);start.setUTCDate(start.getUTCDate()-1)}
 else if(kind==='week'){end=new Date(d);end.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);start=new Date(end);start.setUTCDate(start.getUTCDate()-7)}
 else if(kind==='month'){start=new Date(Date.UTC(y,m-1,1));end=new Date(Date.UTC(y,m,1))}
 else{start=new Date(Date.UTC(y-1,0,1));end=new Date(Date.UTC(y,0,1))}
 return [(start-timelineEpoch)/86400000,(end-timelineEpoch)/86400000];
}
function closeDatePicker(){ $('#timeDatePopup').hidden=true;$('#timeSelectionLabel').setAttribute('aria-expanded','false') }
$('#timeSelectionLabel').onclick=()=>{
 const popup=$('#timeDatePopup');if(!popup.hidden){closeDatePicker();return}
 const point=timeSelection==='point';$('#dateFromLabel').hidden=point;$('#datePresetLabel').hidden=point;$('#dateToLabel').textContent=point?'Date':'To';
 for(const input of [$('#dateFrom'),$('#dateTo')]){input.min=dateISO(timeMin);input.max=dateISO(timeNow-1)}
 $('#dateFrom').value=dateISO(Math.floor(timeFrom));$('#dateTo').value=dateISO(Math.max(timeMin,Math.ceil(point?timePoint:timeTo)-1));$('#datePreset').value='';popup.hidden=false;$('#timeSelectionLabel').setAttribute('aria-expanded','true');(point?$('#dateTo'):$('#dateFrom')).focus();
};
$('#datePreset').onchange=e=>{if(!e.target.value)return;const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const [from,to]=periodPreset(e.target.value,today);$('#dateFrom').value=dateISO(from);$('#dateTo').value=dateISO(to-1);$('#applyDates').click()};
$('#applyDates').onclick=()=>{const from=dateDay($('#dateFrom').value),to=dateDay($('#dateTo').value)+1;const point=timeSelection==='point';if(!Number.isFinite(to)||to>timeNow||to<=timeMin||(!point&&(!Number.isFinite(from)||from<timeMin||from>=to))){$('#dateTo').setCustomValidity('Choose a valid date range.');$('#dateTo').reportValidity();return}$('#dateTo').setCustomValidity('');if(point)timePoint=to;else{timeFrom=from;timeTo=to}closeDatePicker();setTimeViewport(point?to:(from+to)/2,point?Math.min(timeSpan,31):Math.max(7,(to-from)*1.2));setSort(activeSort);$('#timeSelectionLabel').focus()};
for(const input of [$('#dateFrom'),$('#dateTo')])input.oninput=()=>$('#dateTo').setCustomValidity('');
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.time-date-picker'))closeDatePicker()});$('#timeDatePopup').onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();closeDatePicker();$('#timeSelectionLabel').focus()}};
let timelineUpdateFrame=0;function scheduleTimelineUpdate(){if(!timelineUpdateFrame)timelineUpdateFrame=requestAnimationFrame(()=>{timelineUpdateFrame=0;setSort(activeSort,true)})}
$('#timeStart').oninput=e=>{timeFrom=Math.min(+e.target.value,timeTo-1/24);scheduleTimelineUpdate()};
$('#timeEnd').oninput=e=>{if(timeSelection==='point')timePoint=+e.target.value;else timeTo=Math.max(timeFrom+1/24,+e.target.value);scheduleTimelineUpdate()};
let timePan=null;$('#timeTrack').onpointerdown=e=>{if(e.target.tagName==='INPUT')return;timePan={x:e.clientX,center:timeCenter,from:timeFrom,to:timeTo,range:e.target.id==='timeSelectedBand'};e.currentTarget.setPointerCapture(e.pointerId)};$('#timeTrack').onpointermove=e=>{if(!timePan)return;const delta=(e.clientX-timePan.x)*timeSpan/e.currentTarget.clientWidth;if(timePan.range){const shift=Math.max(timeMin-timePan.from,Math.min(timeNow-timePan.to,delta));timeFrom=timePan.from+shift;timeTo=timePan.to+shift;renderTimeSelection();scheduleTimelineUpdate()}else setTimeViewport(timePan.center-delta,timeSpan)};$('#timeTrack').onpointerup=$('#timeTrack').onpointercancel=()=>timePan=null;
$('#timeTrack').addEventListener('wheel',e=>{e.preventDefault();setTimeViewport(timeCenter,timeSpan*Math.exp(Math.max(-100,Math.min(100,e.deltaY))*.008))},{passive:false});
setSort(activeSort);

function renderPeopleSummary(){
 const row=$('#peopleSummary'),available=Math.max(0,row.clientWidth-36);
 const count=Math.min(people.length,Math.max(1,Math.floor((available-34)/20)));
 const remaining=people.length-count;
 $('#peopleStack').innerHTML=people.slice(0,count).map(p=>`<span class="people-avatar" title="${p[0]}"><img src="${p[1]}" alt="${p[0]}" draggable="false"></span>`).join('')+(remaining?`<span class="people-overflow" aria-label="${remaining} more people">+${remaining}</span>`:'');
}
$('#peopleExpanded').innerHTML=people.map((p,id)=>`${id===3?'<button class="people-entry" data-person="3">':'<div class="people-entry">'}<span class="people-avatar"><img src="${p[1]}" alt="" draggable="false"></span><span>${p[0]}</span>${id===3?'</button>':'</div>'}`).join('');
$('#peopleExpanded').addEventListener('click',e=>{const person=e.target.closest('[data-person]');if(person)window.openPersonView?.(+person.dataset.person)});

$('#peopleSummary').onclick=()=>{const open=$('#peopleSummary').getAttribute('aria-expanded')!=='true';$('#peopleSummary').setAttribute('aria-expanded',String(open));$('#peopleExpanded').hidden=!open};
new ResizeObserver(renderPeopleSummary).observe($('#peopleSummary'));renderPeopleSummary();

document.addEventListener('click',e=>{const el=e.target.closest('[data-activity-person]');if(el)window.openPersonView?.(+el.dataset.activityPerson)});
document.addEventListener('keydown',e=>{const el=e.target.closest('[data-activity-person]');if(el&&['Enter',' '].includes(e.key)){e.preventDefault();window.openPersonView?.(+el.dataset.activityPerson)}});

// Searchable channel picker preserves the existing select/filter contract.
function makeChannelSearch(select){
 if(!select||select.dataset.searchable)return;select.dataset.searchable='true';select.hidden=true;
 const wrap=document.createElement('span');wrap.className='channel-search';select.after(wrap);
 const input=document.createElement('input');input.type='text';input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-label',select.getAttribute('aria-label'));input.placeholder='Search channels';input.autocomplete='off';
 const list=document.createElement('span');list.className='channel-results';list.setAttribute('role','listbox');list.id='channel-options-'+Math.random().toString(36).slice(2);input.setAttribute('aria-controls',list.id);list.hidden=true;wrap.append(input,list);
 let index=-1;const label=()=>select.selectedOptions[0]?.textContent||'All';input.value=label();
 const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');input.value=label();index=-1};
 const choose=value=>{select.value=value;close();select.dispatchEvent(new Event('change',{bubbles:true}))};
 const show=(query='')=>{list.replaceChildren();index=-1;input.removeAttribute('aria-activedescendant');const options=[...select.options].filter(o=>o.textContent.toLowerCase().includes(query.trim().toLowerCase()));for(const o of options){const b=document.createElement('button');b.type='button';b.tabIndex=-1;b.setAttribute('role','option');b.setAttribute('aria-selected',String(o.selected));b.id=list.id+'-'+o.index;b.textContent=o.textContent;b.onpointerdown=e=>e.preventDefault();b.onclick=()=>choose(o.value);b.dataset.value=o.value;list.append(b)}if(!options.length){const empty=document.createElement('span');empty.className='channel-no-results';empty.textContent='No channels found';list.append(empty)}list.hidden=false;input.setAttribute('aria-expanded','true')};
 input.onfocus=()=>{input.select();show()};input.onclick=()=>{if(list.hidden)show()};input.oninput=()=>show(input.value);
 input.onblur=()=>close();input.onkeydown=e=>{const options=[...list.querySelectorAll('button')];if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(list.hidden)show();const rows=[...list.querySelectorAll('button')];if(!rows.length)return;index=(index+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;rows.forEach((b,i)=>b.classList.toggle('highlighted',i===index));input.setAttribute('aria-activedescendant',rows[index].id)}else if(e.key==='Enter'&&!list.hidden){e.preventDefault();const selected=options[index>=0?index:0];if(selected)choose(selected.dataset.value)}else if(e.key==='Tab')close()};
}

// Search the current view without changing its filters.
const finderSearch=document.createElement('div');finderSearch.className='finder-search';finderSearch.innerHTML='<button class="finder-search-button" aria-label="Search" title="Search" aria-expanded="false"><svg viewBox="2.5 2.5 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m18.5 18.5 7 7"/></svg></button><div class="finder-search-popup" hidden><input type="search" aria-label="Search current view" placeholder="Search"><div class="finder-search-results"></div></div>';document.querySelector('.header-actions').append(finderSearch);
const searchTrigger=finderSearch.querySelector('button'),searchPopup=finderSearch.querySelector('.finder-search-popup'),searchInput=finderSearch.querySelector('input'),searchResults=finderSearch.querySelector('.finder-search-results');
function closeFinderSearch(){searchPopup.hidden=true;searchTrigger.setAttribute('aria-expanded','false')}
searchTrigger.onclick=()=>{searchPopup.hidden=!searchPopup.hidden;searchTrigger.setAttribute('aria-expanded',String(!searchPopup.hidden));if(!searchPopup.hidden){searchInput.value='';searchResults.replaceChildren();searchInput.focus()}};
searchInput.oninput=()=>{searchResults.replaceChildren();const q=searchInput.value.trim().toLowerCase();if(!q)return;const detail=document.querySelector('#groupFolder');const nodes=detail&&!detail.hidden?[...detail.querySelectorAll('.shared-file')]:[...document.querySelectorAll('#groups button')];const matches=nodes.filter(n=>n.textContent.toLowerCase().includes(q)).slice(0,12);for(const n of matches){const b=document.createElement('button');b.textContent=n.querySelector('.shared-file-name')?.textContent||n.textContent.trim();b.onclick=()=>{closeFinderSearch();n.click();n.scrollIntoView({block:'nearest'});n.focus()};searchResults.append(b)}if(!matches.length)searchResults.textContent='No results'};
searchPopup.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();closeFinderSearch();searchTrigger.focus()}else if(e.key==='Enter'&&document.activeElement===searchInput){e.preventDefault();searchResults.querySelector('button')?.click()}};document.addEventListener('pointerdown',e=>{if(!e.target.closest('.finder-search'))closeFinderSearch()});
