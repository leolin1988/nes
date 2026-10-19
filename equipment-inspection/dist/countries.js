const countryNames={TW:{zh:'台灣',en:'Taiwan',es:'Taiwán',vi:'Đài Loan'},VM:{zh:'越南',en:'Vietnam',es:'Vietnam',vi:'Việt Nam'},MX:{zh:'墨西哥',en:'Mexico',es:'México',vi:'Mexico'}};
`country|國家|Country|País|Quốc gia
chooseCountry|請先選擇國家|Choose a country first|Seleccione primero un país|Vui lòng chọn quốc gia trước
countryHelp|選擇後進入該國的設備點檢功能。|Continue to equipment inspections for the selected country.|Acceda a las inspecciones del país seleccionado.|Tiếp tục kiểm tra thiết bị của quốc gia đã chọn.
switchCountry|切換國家|Switch country|Cambiar país|Đổi quốc gia
countryEmpty|此國家目前沒有您可使用的設備資料。|No equipment is available to you in this country yet.|Aún no tiene equipos disponibles en este país.|Hiện chưa có thiết bị bạn có thể sử dụng tại quốc gia này.
countrySwitchConfirm|切換國家會關閉尚未儲存的表單，是否繼續？|Switching country closes unsaved forms. Continue?|Cambiar de país cierra los formularios sin guardar. ¿Continuar?|Đổi quốc gia sẽ đóng biểu mẫu chưa lưu. Tiếp tục?`.split('\n').forEach(line=>{const[k,...v]=line.split('|');translations[k]=Object.fromEntries(['zh','en','es','vi'].map((l,n)=>[l,v[n]]));});
let activeCountry='',countryGeneration=0,countryBusy=0;
const emptyCountryData=()=>({departments:[],equipment:[],groups:[],forms:[],records:[],assignments:[],maintenanceRecords:[]});
const baseCountryApi=api;
api=async function(payload){
 const isLogin=payload.action==='login',global=isLogin||payload.action==='session';
 if(!global&&!activeCountry)throw Error('country_required');
 const generation=countryGeneration,country=activeCountry;countryBusy++;
 try{const result=await baseCountryApi(global?payload:{...payload,country_code:country});
  if(!global&&(generation!==countryGeneration||country!==activeCountry))throw Error('country_changed');
  if(isLogin){activeCountry='';countryGeneration++;data=emptyCountryData();}
  return result;
 }finally{countryBusy--;}
};
function countryLabel(code){return multilingual(countryNames[code])+' · '+code;}
const countryHeader=header;
header=function(){const html=countryHeader();return profile&&activeCountry?html.replace('<div class="top-actions">',`<div class="top-actions"><button id="switchCountry" class="btn secondary" title="${t('switchCountry')}">${esc(countryLabel(activeCountry))} · ${txt('switchCountry')}</button>`):html;};
const countryRender=render;
render=function(){countryRender();if(!profile||!activeCountry){$('.side').hidden=true;$('.layout').classList.add('country-layout');}if($('#switchCountry'))$('#switchCountry').onclick=resetCountry;};
const countryContent=renderContent;
renderContent=function(){if(profile&&!activeCountry){$('.page-title h1').innerHTML=txt('chooseCountry');$('#refresh')?.remove();$('#content').innerHTML=`<p>${txt('countryHelp')}</p><div class="country-grid">${['TW','VM','MX'].map(code=>`<button class="country-card" data-country="${code}"><strong>${code}</strong><span>${esc(multilingual(countryNames[code]))}</span></button>`).join('')}</div><p id="countryError" role="alert"></p>`;$$('[data-country]').forEach(b=>b.onclick=()=>selectCountry(b.dataset.country));return;}countryContent();if(profile&&activeCountry&&!data.equipment.length)$('#content').insertAdjacentHTML('afterbegin',`<div class="notice country-empty">${txt('countryEmpty')}</div>`);};
function clearCountryState(){data=emptyCountryData();department='';group='';query='';status='';view='board';kind='daily';editing=null;check=null;window.InspectionManagement.resetCountry();assignmentMachine='';assigningForm=null;photoCache.clear();$$('.modal').forEach(e=>e.remove());}
function resetCountry(){if(countryBusy||pendingReferenceUploads)return;if((editing||check||window.InspectionManagement.hasUnsaved())&&!confirm(t('countrySwitchConfirm')))return;activeCountry='';countryGeneration++;clearCountryState();render();}
async function selectCountry(code){if(!countryNames[code]||countryBusy)return;$$('[data-country]').forEach(b=>b.disabled=true);activeCountry=code;countryGeneration++;clearCountryState();await load();}
load=async function(){try{if(!activeCountry){const r=await api({action:'session'});profile=r.profile;data=emptyCountryData();render();return;}const r=await api({action:'workspace'});data=r;profile=r.profile;render();}catch(e){if(e.message==='country_changed')return;data=emptyCountryData();activeCountry='';render();toast('error');}};
const countryLogout=logout;
logout=function(){activeCountry='';countryGeneration++;clearCountryState();countryLogout();};
// Exports retain country identification even when separated from the website.
const countryCsv=csvDownload;
csvDownload=function(name,columns,rows){return countryCsv(activeCountry+'-'+name,['國別 / Country',...columns],rows.map(r=>[activeCountry,...r]));};
render();if(localStorage.getItem('inspection_token'))load();
