/* Presentation only; existing handlers and permission checks remain authoritative. */
window.powerCheckButton=function(label,attributes=''){
 return `<div class="power-check-toolbar"><button type="button" class="power-check-action" ${attributes} aria-label="${esc(t(label))}"><img src="/power-check.png?v=58" alt="" aria-hidden="true" width="40" height="46"></button></div>`;
};
