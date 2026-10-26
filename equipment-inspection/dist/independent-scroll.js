/* Retain each pane's position when the app rebuilds its DOM (e.g. language change).
   Navigation to a different view starts that view at the top; the menu stays put. */
(()=>{
 let scope='',menuTop=0,contentTop=0,contentLeft=0,lastView='';
 const accountKey=()=>activeCountry+':'+profile?.account_id;
 const previous=render;
 render=function(){
  const same=scope===accountKey(),side=document.querySelector('.layout>.side'),main=document.querySelector('.layout>.main');
  if(same){if(side)menuTop=side.scrollTop;if(main){contentTop=main.scrollTop;contentLeft=main.scrollLeft;}}
  else{menuTop=0;contentTop=0;contentLeft=0;}
  const keepContent=same&&lastView===view;
  previous();scope=accountKey();lastView=view;
  const nextSide=document.querySelector('.layout>.side'),nextMain=document.querySelector('.layout>.main');
  if(nextSide){nextSide.tabIndex=0;nextSide.setAttribute('aria-label',t('navigation'));nextSide.scrollTop=menuTop;}
  if(nextMain){nextMain.tabIndex=0;nextMain.setAttribute('aria-label',t(view));nextMain.scrollTop=keepContent?contentTop:0;nextMain.scrollLeft=keepContent?contentLeft:0;}
 };
 if(document.querySelector('.layout'))render();
})();
