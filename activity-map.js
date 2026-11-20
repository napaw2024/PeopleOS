// Explicit narrative fixtures, not imported communication or collaboration records.
// A shared exchange joins its participants; a shared document joins contributors.
// You is excluded from clustering; person tags NEVER create participation edges.
const narrativeFigma={fileId:'figma-collaboration',name:'Untitled',kind:'figma',collaborationGroup:4,url:'https://www.figma.com/board/1JMYlGcPqGNfBA56bgh3yq/Untitled?node-id=0-1&t=rOZMcpUfyoO7bAvK-1'};
function isDirectExchange(event,id){const ids=[...new Set([event.sender,...(event.recipients||[])].filter(n=>n!==0))];return event.group===undefined&&ids.length===1&&(id===undefined||ids[0]===id)}
const activityFixtures={
 Communication:[
  // Additional synthetic exchanges for November 9–15; reuse existing file assets.
  {context:'sophie-direct-week',sender:1,recipients:[0],name:'Document 01',kind:'file',day:313,count:1},
  {context:'mia-direct-week',sender:5,recipients:[0],name:'Document 01',kind:'file',day:314,count:1},
  {context:'family-exchange-week',group:1,sender:2,recipients:[0,1,5],name:'Document 01',kind:'file',day:316,count:1},
  {context:'girls-exchange-week',group:3,sender:8,recipients:[0,9],name:'Zeichnungen.jpg',kind:'photo',src:'assets/files/Zeichnungen.jpg',day:317,count:8},
  {context:'designers-exchange-week',group:6,sender:19,recipients:[0,18],name:'Project overview.xlsx',kind:'spreadsheet',day:318,count:3},
  {context:'felix-timeline-week',group:6,sender:19,recipients:[0,18],name:'Project timeline.xlsx',kind:'spreadsheet',day:315,count:1,channel:'Mail'},
  {context:'sophie-direct',sender:1,recipients:[0],name:'Document 01',kind:'file',day:306,count:1},
  {context:'mia-direct',sender:5,recipients:[0],name:'Document 01',kind:'file',day:307,count:1},
  {...narrativeFigma,kind:'figma-link',context:'nora-link',sender:18,recipients:[0],day:312,count:1},
  {context:'recipe-direct',sender:2,recipients:[0],taggedPeople:[3],name:'Chocolate cake',kind:'file',original:true,day:122,count:1},
  {context:'family-exchange',group:1,sender:2,recipients:[0,1,5],name:'Document 01',kind:'file',day:309,count:1},
  {context:'family-exchange-history',group:1,sender:2,recipients:[0,1,5],name:'Document 01',kind:'file',day:280,count:24},
  {context:'girls-exchange',group:3,sender:8,recipients:[0,9],name:'Zeichnungen.jpg',kind:'photo',src:'assets/files/Zeichnungen.jpg',day:310,count:8},
  {context:'designers-exchange',group:6,teamName:'Designers',sender:18,recipients:[0,19],name:'Project overview.xlsx',kind:'spreadsheet',day:311,count:3},
  ...[3,4,6,7,10].map((id,i)=>({context:'direct-'+id,sender:id,recipients:[0],name:id===3?'Pumpkin.jpg':'Document 01',kind:id===3?'photo':'file',...(id===3?{src:'assets/files/Pumpkin.jpg'}:{}),day:121+i,count:1}))
 ],
 Collaboration:[
  {...narrativeFigma,context:'pm-designer-figma',group:4,teamName:'PM + Designer',contributors:[0,16,18],sender:18,day:312,count:3},
  {context:'pm-designer-document-2',group:4,teamName:'PM + Designer',contributors:[0,16,18],sender:16,name:'Document 02',kind:'file',day:127,count:2},
  {context:'pm-designer-svg',group:4,teamName:'PM + Designer',contributors:[0,16,18],sender:18,name:'Design.svg',kind:'svg',day:128,count:2},
  {context:'family-document',group:1,contributors:[0,1,5],sender:5,name:'Document 01',kind:'file',day:124,count:6},
  {context:'girls-document',group:3,contributors:[0,8,9],sender:8,name:'Zeichnungen.jpg',kind:'photo',src:'assets/files/Zeichnungen.jpg',day:125,count:11},
  {context:'team-1-document',group:6,teamName:'Team 1',contributors:[0,13,14,16,18,19],sender:16,name:'Document 01',kind:'file',day:129,count:9},
  {context:'pm-designer-document',group:4,teamName:'PM + Designer',contributors:[0,16,18],sender:16,name:'Document 03',kind:'file',day:127,count:5},
  {context:'two-designers-document',group:5,teamName:'Two designers',contributors:[0,18,19],sender:18,name:'Document 04',kind:'file',day:128,count:6},
  {context:'team-2-document',group:2,teamName:'Team 2',contributors:[0,14,15,17,20],sender:17,name:'Document 02',kind:'file',day:125,count:7},
  ...[2,3,4,6,7,10].map((id,i)=>({context:'individual-document-'+id,contributors:[0,id],sender:id,name:'Document 01',kind:'file',day:120+i,count:1}))
 ]
};
activityFixtures.Collaboration.push({context:'context-research-notes',group:4,contributors:[0,16,18],sender:16,name:'Research notes',kind:'note',channel:'Notes',day:313,count:1});
// Prototype change attribution: the existing contributing sender is the sample last editor.
activityFixtures.Collaboration.forEach(event=>{event.lastEditor=event.sender});
// Explicit prototype delivery channels; a Figma link sent by Mail is Mail, not Figma.
const prototypeMailContexts=new Set(['sophie-direct-week','family-exchange-week','designers-exchange-week','nora-link','sophie-direct','designers-exchange']);
activityFixtures.Communication.forEach(event=>{event.channel=prototypeMailContexts.has(event.context)?'Mail':'WhatsApp'});
activityFixtures.Collaboration.forEach(event=>{if(event.kind==='figma')event.channel='Figma'});
// Additional explicit prototype channels and application file types.
activityFixtures.Communication.forEach(event=>{
 if(['designers-exchange-week','felix-timeline-week'].includes(event.context))event.channel='Microsoft Teams';
 if(['sophie-direct-week','sophie-direct'].includes(event.context))event.channel='Outlook';
});
activityFixtures.Collaboration.forEach(event=>{
 if(event.context==='context-research-notes'){event.channel='Notes';event.kind='note';event.name='Research notes';event.day=313}
 if(event.context==='pm-designer-document-2'){event.channel='Google Docs';event.kind='google-docs';event.day=314}
 if(event.context==='pm-designer-document'){event.channel='Keynote';event.kind='keynote';event.name='Presentation.key';event.day=316}
});
let communicationChannel='all';
function buildActivityMap(kind,start=-Infinity,end=Infinity,channel=kind!=='Collaboration'?communicationChannel:'all'){
 if(kind==='All')return buildCombinedActivityMap(start,end,channel);

 const events=activityFixtures[kind].filter(e=>channel==='all'||e.channel===channel).map(e=>({...e,activityKind:kind.toLowerCase()})),parent=new Map(),members=e=>[...new Set((kind==='Communication'?[e.sender,...e.recipients]:e.contributors).filter(id=>id!==0))];
 const find=id=>parent.get(id)===id?id:find(parent.get(id));
 events.forEach(e=>{const ids=members(e);ids.forEach(id=>{if(!parent.has(id))parent.set(id,id)});ids.slice(1).forEach(id=>parent.set(find(id),find(ids[0])))});
 const components=new Map();[...parent.keys()].sort((a,b)=>a-b).forEach(id=>{const root=find(id);if(!components.has(root))components.set(root,[]);components.get(root).push(id)});
 const clusters=[],solos=[];
 if(kind==='Collaboration'){
  // Preserve distinct co-contributor sets even when a developer participates in both.
  const contexts=new Map();events.forEach(e=>{const key=members(e).sort((a,b)=>a-b).join(',');if(!contexts.has(key))contexts.set(key,[]);contexts.get(key).push(e)});
  for(const matching of contexts.values()){
   const ids=members(matching[0]),group=matching[0].group;
   if(group===undefined){ids.forEach(id=>{if(!solos.includes(id))solos.push(id)});continue}
   clusters.push({group,ids,name:matching[0].teamName,events:matching,count:matching.reduce((n,e)=>n+e.count,0),latest:Math.max(...matching.map(e=>e.day))});
  }
 }else{
  // Direct exchanges and group exchanges coexist; never union through people.
  const contexts=new Map();events.forEach(e=>{
   const ids=members(e);
   if(isDirectExchange(e)){if(!solos.includes(ids[0]))solos.push(ids[0]);return}
   const key=e.group!==undefined?'group:'+e.group:ids.slice().sort((a,b)=>a-b).join(',');
   if(!contexts.has(key))contexts.set(key,[]);contexts.get(key).push(e);
  });
  for(const matching of contexts.values()){const group=matching[0].group;if(group===undefined)continue;const ids=[...new Set(matching.flatMap(members))].sort((a,b)=>a-b);clusters.push({group,ids,events:matching,count:matching.reduce((n,e)=>n+e.count,0),latest:Math.max(...matching.map(e=>e.day))})}
 }

 // Radial distance is algorithmic closeness: more participation => nearer You.
 // Tags and the central user never add to another person's volume.
 const volumes={};parent.forEach((_,id)=>volumes[id]=0);
 events.filter(e=>e.day>=start&&e.day<end).forEach(e=>members(e).forEach(id=>volumes[id]+=e.count));
 const maximum=Math.max(1,...Object.values(volumes));
 const historyVolumes={};events.forEach(e=>members(e).forEach(id=>historyVolumes[id]=(historyVolumes[id]||0)+e.count));
 const historyMaximum=Math.max(1,...Object.values(historyVolumes));
 // Wider radial travel; absolute history reference prevents each period's leader
 // from snapping to the identical radius regardless of how much happened.
 const distance=id=>330-230*Math.pow(.7*volumes[id]/maximum+.3*volumes[id]/historyMaximum,.85);
 const position=(id,degrees)=>{const angle=degrees*Math.PI/180,r=distance(id);return [570+r*Math.cos(angle),360+r*Math.sin(angle)]};
 const sectors=kind==='Communication'?{1:-145,3:-35,6:65}:{1:-150,3:-65,6:30,2:110,4:20,5:40};
 const positions={0:[570,360]},labels={};
 clusters.forEach(c=>{const centre=sectors[c.group];c.ids.forEach((id,i)=>positions[id]=position(id,centre+(i-(c.ids.length-1)/2)*34));const radius=Math.max(...c.ids.map(distance))+65,angle=centre*Math.PI/180;labels[c.group]=[570+radius*Math.cos(angle)-groups[c.group].name.length*3.15,360+radius*Math.sin(angle)]});
 const angles=kind==='Communication'?[-65,-95,5,115,175,145]:[-95,5,115,175,145,90];
 solos.filter(id=>!positions[id]).forEach((id,i)=>positions[id]=position(id,angles[i%angles.length]));

 if(kind==='Collaboration'){
  const teamAngles={13:-10,16:10,18:30,19:50,14:70,15:95,17:120,20:145};
  Object.entries(teamAngles).forEach(([id,angle])=>positions[id]=position(+id,angle));
  const teamOne=clusters.find(c=>c.group===6);if(teamOne)teamOne.route=[13,16,18,19,14];
  const teamTwo=clusters.find(c=>c.group===2);if(teamTwo)teamTwo.route=[14,15,17,20];
  labels[6]=[870,385];labels[2]=[435,620];labels[4]=[730,285];labels[5]=[775,525];
  solos.forEach((id,i)=>positions[id]=position(id,[-115,-90,-175,-200,-225,-250][i]));
 }
 clusters.forEach(c=>{c.name=c.ids.map(id=>people[id][0]).join(', ')});
 return {events,clusters,solos,positions,labels,volumes};
}
function isPersonActivity(event,id){
 return event.activityKind==='communication' ? isDirectExchange(event,id) :
  event.group===undefined&&(event.sender===id||(event.contributors||[]).includes(id));
}
function buildCombinedActivityMap(start,end,channel){
 const models=[
  buildActivityMap('Collaboration',start,end,'all'),
  buildActivityMap('Communication',start,end,'all')
 ];
 const clusters=[],events=[],solos=new Set(),positions={0:[570,360]},labels={},volumes={};
 const reserved=new Set(models[0].clusters.map(c=>c.group));
 const used=new Set();
 for(const model of models){
  Object.entries(model.positions).forEach(([id,point])=>{if(!positions[id])positions[id]=point});
  Object.entries(model.volumes).forEach(([id,count])=>volumes[id]=(volumes[id]||0)+count);
  const remapped=new Map();
  for(const cluster of model.clusters){
   const key=cluster.ids.slice().sort((a,b)=>a-b).join(',');
   const existing=clusters.find(c=>c.key===key);
   let group=existing?.group??cluster.group;
   if(!existing&&used.has(group)){
    group=groups.findIndex((_,id)=>!used.has(id)&&!reserved.has(id));
   }
   if(group<0)continue;
   const matching=cluster.events.map(event=>({...event,sourceGroup:event.group,group}));
   matching.forEach(event=>remapped.set(event.context,event));
   if(existing){
    existing.events.push(...matching);
    existing.count+=cluster.count;
    existing.latest=Math.max(existing.latest,cluster.latest);
   }else{
    used.add(group);
    const centre=cluster.ids.reduce((sum,id)=>[sum[0]+positions[id][0],sum[1]+positions[id][1]],[0,0]).map(v=>v/cluster.ids.length);
    clusters.push({...cluster,key,group,events:matching});
    labels[group]=[centre[0],centre[1]-85];
   }
  }
  model.events.forEach(event=>events.push(remapped.get(event.context)||event));
  model.solos.forEach(id=>solos.add(id));
 }
 const filteredEvents=events.filter(event=>channel==='all'||event.channel===channel);
 const filteredClusters=clusters.map(cluster=>{
  const matching=cluster.events.filter(event=>channel==='all'||event.channel===channel);
  return {...cluster,events:matching,count:matching.reduce((sum,event)=>sum+event.count,0),latest:Math.max(...matching.map(event=>event.day))};
 }).filter(cluster=>cluster.events.length);
 return {events:filteredEvents,clusters:filteredClusters,solos:[...solos],positions,labels,volumes};
}
function activityContextFiles(groupId,kind){
 const model=activityModel||buildActivityMap(kind),cluster=model.clusters.find(c=>c.group===groupId);
 return (cluster?.events||[]).map(e=>({...e,contributors:e.contributors||[],activityKind:e.activityKind||kind.toLowerCase(),taggedPeople:e.taggedPeople||[]}));
}
