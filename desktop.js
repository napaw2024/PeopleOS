(() => {
 const embedded=window.parent!==window&&new URLSearchParams(location.search).has('finderWindow');
 if(embedded)document.body.classList.add('finder-embedded');
 const local=document.getElementById('window');
 if(!embedded){
  let layer=20,serial=0;
  const windows=[local];
  const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
  function place(el,b){const w=Math.max(Math.min(480,innerWidth),Math.min(innerWidth,b.w)),h=Math.max(Math.min(330,innerHeight-40),Math.min(innerHeight-40,b.h));Object.assign(el.style,{left:Math.max(0,Math.min(innerWidth-w,b.x))+'px',top:Math.max(32,Math.min(innerHeight-48,b.y))+'px',width:w+'px',height:h+'px',right:'auto',bottom:'auto'});}
  function focus(el){el.style.zIndex=++layer;}
  function maximize(el){if(el._restore){place(el,el._restore);delete el._restore}else{el._restore=box(el);place(el,{x:8,y:34,w:innerWidth-16,h:innerHeight-125})}focus(el)}
  function create(){const el=document.createElement('section');el.className='finder-shell';el.setAttribute('aria-label','Finder window');const frame=document.createElement('iframe');frame.title='People — Finder window '+(++serial);const url=new URL(location.href);url.searchParams.set('finderWindow',String(serial));frame.src=url.href;el.append(frame);document.body.append(el);windows.push(el);place(el,{x:70+serial%5*24,y:65+serial%5*24,w:innerWidth*.82,h:innerHeight*.72});focus(el);}
  function close(el){if(el===local)el.hidden=true;else{windows.splice(windows.indexOf(el),1);el.remove()}}
  window.peopleDesktop={box,place,focus,maximize,create,close};place(local,box(local));focus(local);
  document.getElementById('finder').onclick=()=>{const hidden=windows.find(el=>el.hidden);const el=hidden||windows.at(-1);el.hidden=false;focus(el)};
  const button=document.getElementById('fileMenuButton'),menu=document.getElementById('fileMenu');
  function dismiss(){menu.hidden=true;button.setAttribute('aria-expanded','false')}
  button.onclick=()=>{menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)document.getElementById('newFinder').focus()};
  document.getElementById('newFinder').onclick=()=>{dismiss();create()};
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.desktop-file-menu'))dismiss()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss()});
  window.addEventListener('resize',()=>windows.forEach(el=>{if(!el.hidden)place(el,box(el))}));
 }
 const host=embedded?window.frameElement.parentElement:local,manager=embedded?parent.peopleDesktop:window.peopleDesktop;
 document.getElementById('close').onclick=()=>manager.close(host);
 document.getElementById('minimize').onclick=()=>host.hidden=true;
 document.getElementById('maximize').onclick=()=>manager.maximize(host);
 document.addEventListener('pointerdown',()=>manager.focus(host),true);
 document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='n'){e.preventDefault();manager.create()}});
 function gesture(handle,resizing){let drag=null;
  handle.addEventListener('pointerdown',e=>{if(e.button!==0||(!resizing&&e.target.closest('button,select,input')))return;e.preventDefault();manager.focus(host);drag={x:e.screenX,y:e.screenY,...manager.box(host)};drag.sx=e.screenX;drag.sy=e.screenY;handle.setPointerCapture(e.pointerId);});
  handle.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.screenX-drag.sx,dy=e.screenY-drag.sy;delete host._restore;manager.place(host,resizing?{...drag,w:drag.w+dx,h:drag.h+dy}:{...drag,x:drag.x+dx,y:drag.y+dy})});
  handle.addEventListener('pointerup',()=>drag=null);handle.addEventListener('pointercancel',()=>drag=null);
 }
 for(const handle of document.querySelectorAll('.toolbar,.traffic')){gesture(handle,false);handle.addEventListener('dblclick',e=>{if(!e.target.closest('button'))manager.maximize(host)})}
 const grip=document.createElement('button');grip.className='window-resize';grip.setAttribute('aria-label','Resize Finder window');grip.title='Resize';local.append(grip);gesture(grip,true);
 grip.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const b=manager.box(host);manager.place(host,{...b,w:b.w+(e.key==='ArrowRight'?20:e.key==='ArrowLeft'?-20:0),h:b.h+(e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0)})};
})();
