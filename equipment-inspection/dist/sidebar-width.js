/* Local navigation width preference, independent of form contents and permissions. */
(()=>{
const key='inspection_sidebar_width_v1',normal=340,min=240,media=matchMedia('(min-width:901px)');let preferred=normal,frame=0;
try{const saved=Number(localStorage.getItem(key));if(Number.isFinite(saved)&&saved>=min&&saved<=560)preferred=saved;}catch{}
const words={zh:'拖曳調整左側選單寬度；按兩下恢復預設',en:'Drag to resize the left menu; double-click to reset',es:'Arrastre para ajustar el menú; doble clic para restablecer',vi:'Kéo để đổi độ rộng menu; nhấp đúp để đặt lại'};
const maximum=()=>Math.max(min,Math.min(560,innerWidth-480));
function apply(layout,handle){const width=Math.round(Math.max(min,Math.min(maximum(),preferred)));layout.style.setProperty('--sidebar-width',width+'px');handle.setAttribute('aria-valuemin',min);handle.setAttribute('aria-valuemax',maximum());handle.setAttribute('aria-valuenow',width);return width;}
function mount(){const layout=document.querySelector('.layout'),side=layout?.querySelector(':scope>.side');if(!side)return;let handle=layout.querySelector(':scope>.sidebar-resize-handle');if(!handle){handle=document.createElement('div');handle.className='sidebar-resize-handle';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');side.id||='inspectionSidebar';handle.setAttribute('aria-controls',side.id);side.after(handle);
 const reset=()=>{preferred=normal;try{localStorage.removeItem(key);}catch{}apply(layout,handle);};
 const save=()=>{try{localStorage.setItem(key,String(preferred));}catch{}};
 handle.addEventListener('dblclick',reset);
 handle.addEventListener('keydown',e=>{const current=apply(layout,handle);if(e.key==='Enter'){e.preventDefault();reset();return;}if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();preferred=e.key==='Home'?min:e.key==='End'?maximum():Math.max(min,Math.min(maximum(),current+(e.key==='ArrowLeft'?-10:10)));apply(layout,handle);save();});
 handle.addEventListener('pointerdown',e=>{if(e.button!==0||!media.matches||side.hidden)return;e.preventDefault();const startX=e.clientX,start=apply(layout,handle);handle.setPointerCapture(e.pointerId);document.body.classList.add('resizing-sidebar');
 const move=ev=>{if(ev.pointerId!==e.pointerId)return;preferred=Math.max(min,Math.min(maximum(),start+ev.clientX-startX));apply(layout,handle);};
 const finish=ev=>{if(ev.pointerId!==e.pointerId)return;handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);handle.removeEventListener('lostpointercapture',finish);document.body.classList.remove('resizing-sidebar');if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);save();};
 handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);
 });}
 const visible=!side.hidden;layout.classList.toggle('sidebar-resizable',visible);const hidden=!visible||!media.matches;if(handle.hidden!==hidden)handle.hidden=hidden;handle.title=words[typeof primary==='string'?primary:'zh']||words.zh;handle.setAttribute('aria-label',handle.title);apply(layout,handle);
}
function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;mount();});}
new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
media.addEventListener('change',schedule);addEventListener('resize',schedule);mount();
})();
