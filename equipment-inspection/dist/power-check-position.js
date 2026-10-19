/* Keep the action before informational rows added by other form extensions. */
(()=>{
 const prior=renderCheck;
 renderCheck=function(){
  prior();
  const body=document.querySelector('#check .dialog-body');
  const action=body?.querySelector('#quickPass')?.closest('.power-check-toolbar');
  if(action&&body.firstElementChild!==action)body.prepend(action);
 };
})();
