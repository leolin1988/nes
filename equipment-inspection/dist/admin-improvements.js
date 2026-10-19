/* Administration, local appearance preferences and secondary-language notes. */
(() => {
const labels={board:['設備狀態即時看板','Live equipment status','Estado de equipos en vivo','Trạng thái thiết bị trực tiếp'],visual:["每日機器點檢紀錄表","Daily machine inspection records","Registros de inspección diaria de máquinas","Hồ sơ kiểm tra máy hằng ngày"],qr03:["每日設備點檢輸入","Daily equipment inspection entry","Ingreso de inspección diaria","Nhập kiểm tra thiết bị hằng ngày"],history:['設備點檢履歷查詢','Equipment inspection history','Historial de inspecciones','Tra cứu lịch sử kiểm tra'],qr04:["預保養紀錄表輸入","Preventive maintenance record entry","Ingreso de registros de mantenimiento","Nhập hồ sơ bảo dưỡng phòng ngừa"],approval:['點檢與保養單簽核','Inspection and maintenance approvals','Aprobación de inspecciones y mantenimiento','Duyệt phiếu kiểm tra và bảo dưỡng'],backfill:["每日設備點檢(補登)","Daily inspection (backfill)","Inspección diaria (registro atrasado)","Kiểm tra hằng ngày (bổ sung)"],maintenance:["預防保養設備設定","Preventive maintenance equipment settings","Configurar equipos de mantenimiento","Thiết lập thiết bị bảo dưỡng phòng ngừa"],items:['部門點檢項目設定','Department inspection settings','Configurar inspecciones del departamento','Thiết lập hạng mục kiểm tra'],assignment:['設備點檢表分配與啟用','Assign and enable inspection forms','Asignar y activar formularios','Phân công và bật biểu mẫu'],equipmentAdmin:['設備清單與基本資料','Equipment list and details','Lista y datos de equipos','Danh sách và thông tin thiết bị'],mapping:['批量匯入設備資料','Bulk import equipment','Importación masiva de equipos','Nhập hàng loạt thiết bị'],formExport:['點檢報表匯出 (Excel)','Export inspection reports (Excel)','Exportar informes (Excel)','Xuất báo cáo kiểm tra (Excel)'],accounts:['使用者權限與帳號管理','User accounts and permissions','Usuarios y permisos','Tài khoản và quyền người dùng'],settings:["版面顏色設定","Page color settings","Configuración de colores","Thiết lập màu giao diện"],database:['資料庫連線設定','Database connection settings','Conexión de base de datos','Thiết lập kết nối cơ sở dữ liệu'],backoffice:['管理員功能','Administrator','Administración','Quản trị viên'],field:['現場作業管理','Field operations','Operaciones de planta','Quản lý hiện trường'],dataExport:['資料庫資料匯出','Export database records','Exportar datos','Xuất dữ liệu'],appearance:['版面顏色','Page colors','Colores de página','Màu giao diện'],sideColor:['左邊選單顏色','Left menu color','Color del menú izquierdo','Màu menu bên trái'],pageColor:['右邊頁面顏色','Right page color','Color de página derecha','Màu trang bên phải'],localPreference:['配色會自動儲存在這台瀏覽器。','Colors are saved in this browser.','Los colores se guardan en este navegador.','Màu được lưu trong trình duyệt này.'],resetColors:['恢復預設配色','Restore default colors','Restaurar colores','Khôi phục màu mặc định'],accountRule:['帳號限 3–40 個英文字母、數字、底線或連字號，所有國家不可重複。','Use 3–40 letters, digits, underscores or hyphens; unique across countries.','Use 3–40 letras, números, guiones o guiones bajos; único entre países.','Dùng 3–40 chữ Latin, số, dấu gạch; duy nhất giữa các quốc gia.'],departmentRequired:['請選擇所屬部門；沒有部門時請先新增。','Select a department, or create one first.','Seleccione o cree un departamento.','Chọn hoặc tạo bộ phận trước.'],addDepartment:['新增部門','Add department','Añadir departamento','Thêm bộ phận'],duplicateAccount:['此帳號已存在（包含其他國家或已停用帳號），請改用其他帳號。','This account already exists, possibly in another country or disabled.','Esta cuenta ya existe, incluso en otro país o desactivada.','Tài khoản đã tồn tại, có thể ở quốc gia khác hoặc bị tắt.'],saveAccountFailed:['帳號未儲存，請稍後再試；若持續失敗請重新登入。','Account not saved. Retry or sign in again.','No se guardó la cuenta. Reintente o inicie sesión.','Chưa lưu tài khoản. Thử lại hoặc đăng nhập lại.'],exportHelp:['僅匯出目前所選國家的資料。帳號匯出不含密碼、密碼雜湊、PIN 或登入憑證；照片僅匯出索引。','Exports cover the selected country. Passwords, hashes, PINs and credentials are excluded; reference photos export as indexes.','Exportación del país seleccionado, sin contraseñas, hashes, PIN ni credenciales; fotos como índices.','Xuất quốc gia đã chọn, không gồm mật khẩu, mã băm, PIN hay thông tin đăng nhập; ảnh dạng chỉ mục.'],exportAll:['全部資料表','All tables','Todas las tablas','Tất cả bảng'],exportJson:['匯出 JSON','Export JSON','Exportar JSON','Xuất JSON'],exportExcel:['匯出 Excel','Export Excel','Exportar Excel','Xuất Excel'],exportFailed:['匯出未完成，沒有下載不完整的檔案。請重試。','Export failed; no incomplete file was downloaded. Retry.','Falló la exportación; no se descargó un archivo incompleto.','Xuất thất bại; không tải tệp chưa đầy đủ.'],exportDone:['匯出完成','Export complete','Exportación completa','Đã xuất xong']};
for(const[k,v]of Object.entries(labels))translations[k]=Object.fromEntries(['zh','en','es','vi'].map((l,i)=>[l,v[i]]));

// Keep plain strings in attributes, native selects, downloads and API payloads.
// Only recognized bilingual display strings receive a smaller secondary span.
const pairs=new Map();let ordered=[],dirty=true;
function remember(a,b,result){if(b&&a!==b){pairs.set(result,[a,b]);dirty=true;}return result;}
const plainT=t;t=function(key){const result=plainT(key),v=translations[key];return remember(translated(v,primary),secondary&&secondary!==primary?translated(v,secondary):'',result);};
const plainMulti=multilingual;multilingual=function(v){const result=plainMulti(v);return v&&typeof v==='object'?remember(translated(v,primary),secondary&&secondary!==primary?translated(v,secondary):'',result):result;};
const observer=new MutationObserver(records=>{observer.disconnect();const roots=new Set();for(const r of records){if(r.type==='characterData')roots.add(r.target.parentElement);else for(const n of r.addedNodes)roots.add(n.nodeType===3?n.parentElement:n);}for(const root of roots)if(root?.isConnected)styleNotes(root);observer.observe(document.body,{childList:true,subtree:true,characterData:true});});
function styleNotes(root){if(dirty){ordered=[...pairs].sort((a,b)=>b[0].length-a[0].length);dirty=false;}const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walk.nextNode())nodes.push(walk.currentNode);for(const node of nodes){if(node.parentElement.closest('script,style,option,textarea,input,.secondary-note,[contenteditable]'))continue;let text=node.data;if(!text.includes(' / '))continue;const parts=[];while(text){let best=null,pos=Infinity;for(const [key,pair]of ordered){const at=text.indexOf(key);if(at>=0&&at<pos){best=[key,pair];pos=at;}}if(!best){parts.push(document.createTextNode(text));break;}parts.push(document.createTextNode(text.slice(0,pos)+best[1][0]));const note=document.createElement('small');note.className='secondary-note';note.lang=secondary;note.textContent=' / '+best[1][1];parts.push(note);text=text.slice(pos+best[0].length);}node.replaceWith(...parts);}}
observer.observe(document.body,{childList:true,subtree:true,characterData:true});
const colorKey='inspection_appearance_v2';
const zones=[
 ['side',['左側選單','Left menu','Menú izquierdo','Menu bên trái'],'#ffffff','#15263a'],
 ['nav',['選單選取項目','Selected menu','Menú seleccionado','Mục menu đã chọn'],'#e6f1f6','#086287'],
 ['top',['上方標題區','Top header','Encabezado superior','Thanh tiêu đề'],'#ffffff','#173d59'],
 ['page',['頁面工作區','Main page','Página principal','Trang chính'],'#f2f6f9','#15263a'],
 ['card',['設備卡片','Equipment cards','Tarjetas de equipos','Thẻ thiết bị'],'#ffffff','#18394f'],
 ['detail',['卡片內頁／彈出視窗','Card details / dialogs','Detalles / diálogos','Chi tiết / hộp thoại'],'#f6f9fb','#15263a'],
 ['table',['表格表頭','Table headers','Cabeceras de tabla','Tiêu đề bảng'],'#eef5f8','#476276'],
 ['input',['輸入框與下拉選單','Inputs and dropdowns','Campos y listas','Ô nhập và danh sách'],'#ffffff','#18394f'],
 ['button',['主要操作按鈕','Primary buttons','Botones principales','Nút chính'],'#12658a','#ffffff']
];
const defaults=Object.fromEntries(zones.flatMap(([k,,bg,ink])=>[[k,bg],[k+'-ink',ink]]));defaults.line='#d8e2eb';
const presets={
 red:{label:['典雅紅','Classic red','Rojo clásico','Đỏ cổ điển'],colors:{side:'#fff5f3','side-ink':'#572b30',nav:'#f5d4d1','nav-ink':'#762e38',top:'#8c3340','top-ink':'#ffffff',page:'#fbf4f2','page-ink':'#3d292c',card:'#fffdfc','card-ink':'#3d292c',detail:'#fff8f6','detail-ink':'#3d292c',table:'#f4e1dd','table-ink':'#602f36',input:'#ffffff','input-ink':'#3d292c',button:'#963746','button-ink':'#ffffff',line:'#dfc5c2'}},
 blue:{label:['沉穩藍','Calm blue','Azul sereno','Xanh dương trầm'],colors:{side:'#edf4fb','side-ink':'#243e58',nav:'#cee2f5','nav-ink':'#164b76',top:'#204f78','top-ink':'#ffffff',page:'#f1f6fb','page-ink':'#24384d',card:'#ffffff','card-ink':'#24384d',detail:'#f7faff','detail-ink':'#24384d',table:'#ddeaf7','table-ink':'#244c70',input:'#ffffff','input-ink':'#24384d',button:'#246398','button-ink':'#ffffff',line:'#c5d5e5'}},
 green:{label:['森林綠','Forest green','Verde bosque','Xanh lá rừng'],colors:{side:'#eef6f0','side-ink':'#284638',nav:'#d2e8d9','nav-ink':'#225b3b',top:'#285b43','top-ink':'#ffffff',page:'#f3f7f2','page-ink':'#2c4033',card:'#fefffc','card-ink':'#2c4033',detail:'#f7fbf5','detail-ink':'#2c4033',table:'#e0eddf','table-ink':'#31553b',input:'#ffffff','input-ink':'#2c4033',button:'#2c694a','button-ink':'#ffffff',line:'#c6d9c8'}},
 black:{label:['石墨黑','Graphite black','Negro grafito','Đen than chì'],colors:{side:'#262c35','side-ink':'#f0f3f7',nav:'#465367','nav-ink':'#ffffff',top:'#191e26','top-ink':'#ffffff',page:'#edf0f4','page-ink':'#283341',card:'#ffffff','card-ink':'#283341',detail:'#f7f8fa','detail-ink':'#283341',table:'#dce2ea','table-ink':'#283341',input:'#ffffff','input-ink':'#283341',button:'#354357','button-ink':'#ffffff',line:'#c7ced8'}},
 gold:{label:['暖陽金','Warm gold','Dorado cálido','Vàng ấm'],colors:{side:'#fbf5e9','side-ink':'#55432a',nav:'#f0dfb8','nav-ink':'#624715',top:'#6d5129','top-ink':'#ffffff',page:'#f7f3e9','page-ink':'#493c2c',card:'#fffef9','card-ink':'#493c2c',detail:'#fcf8ee','detail-ink':'#493c2c',table:'#eee2c8','table-ink':'#634b24',input:'#ffffff','input-ink':'#493c2c',button:'#805d27','button-ink':'#ffffff',line:'#dfd0b2'}}
};
let colors={...defaults};try{let saved=JSON.parse(localStorage.getItem(colorKey)||'null');if(!saved){saved=JSON.parse(localStorage.getItem('inspection_appearance_v1')||'{}');for(const k of ['side','page'])if(validColor(saved[k]))saved[k+'-ink']=foreground(saved[k]);}for(const k of Object.keys(defaults))if(validColor(saved[k]))colors[k]=saved[k];}catch{}
function validColor(v){return /^#[0-9a-f]{6}$/i.test(v||'');}
function foreground(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#15263a':'#ffffff';}
function applyColors(){for(const [k,v]of Object.entries(colors))document.documentElement.style.setProperty('--user-'+k,v);}
const paletteText=v=>esc(multilingual(Object.fromEntries(['zh','en','es','vi'].map((l,i)=>[l,v[i]]))));
function saveColors(){applyColors();localStorage.setItem(colorKey,JSON.stringify(colors));}
applyColors();
const previousSettings=renderSettings;renderSettings=async function(){if(view!=='settings')return previousSettings();if(!profile)return;
 const picker=(key,label)=>`<label>${label}<div class="color-control"><input type="color" data-color="${key}" id="${key}Color" value="${colors[key]}"><output id="${key}ColorValue">${colors[key]}</output></div></label>`;
 const bg=paletteText(['背景顏色','Background','Fondo','Màu nền']),ink=paletteText(['字體顏色','Text color','Color del texto','Màu chữ']);
 $('#content').innerHTML=`<section class="settings-panel"><h2>${txt('appearance')}</h2><p>${txt('localPreference')}</p><div class="palette-presets">${Object.entries(presets).map(([k,p])=>`<button class="btn secondary palette-option" data-palette="${k}"><span class="palette-swatches" aria-hidden="true">${['top','nav','page'].map(zone=>`<i style="background:${p.colors[zone]}"></i>`).join('')}</span>${paletteText(p.label)}</button>`).join('')}</div><div class="palette-grid">${zones.map(([k,n])=>`<fieldset><legend>${paletteText(n)}</legend>${picker(k,bg)}${picker(k+'-ink',ink)}</fieldset>`).join('')}<fieldset><legend>${paletteText(['框線與分隔線','Borders and dividers','Bordes y separadores','Viền và đường phân cách'])}</legend>${picker('line',paletteText(['框線顏色','Border color','Color del borde','Màu viền']))}</fieldset></div><p>${button('resetColors','id="resetColors"')}</p></section>`;
 for(const el of $$('[data-color]'))el.oninput=()=>{colors[el.dataset.color]=el.value;document.getElementById(el.dataset.color+'ColorValue').textContent=el.value;saveColors();};
 for(const el of $$('[data-palette]'))el.onclick=()=>{colors={...defaults,...presets[el.dataset.palette].colors};saveColors();renderSettings();};
 $('#resetColors').onclick=()=>{colors={...defaults};localStorage.removeItem('inspection_appearance_v1');localStorage.removeItem(colorKey);applyColors();renderSettings();};
};


accountEditor=function(a,depts){
 if(profile?.role!=='admin')return;
 const m=dialog('accountEditor',t(a?'edit':'newAccount'),`<form id="accountForm"><div class="editor-fields">${!a?`<label>${txt('account')}<input id="accountCode" class="select" required minlength="3" maxlength="40" pattern="[A-Za-z0-9_-]{3,40}" autocomplete="off"><small>${txt('accountRule')}</small></label>`:''}<label>${txt('fullName')}<input id="accountName" class="select" maxlength="100" value="${esc(a?.full_name||'')}"></label><label>${txt('newPassword')}<input id="accountPassword" type="password" class="select" minlength="6" ${a?'':'required'} autocomplete="new-password"><small>${txt('passwordRule')}</small></label><label>${txt('confirmPassword')}<input id="accountPasswordConfirm" type="password" class="select" ${a?'':'required'} autocomplete="new-password"></label><label>${txt('department')}<select id="accountDept" class="select" required><option value="">${txt('unassigned')}</option>${depts.map(d=>`<option value="${esc(d.id)}" ${d.id===a?.department_id?'selected':''}>${esc(localName(d.name_zh))}</option>`).join('')}</select><small>${txt('departmentRequired')}</small></label><label>${txt('role')}<select id="accountRole" class="select">${['operator','supervisor','admin'].map(r=>`<option value="${r}" ${a?.role===r?'selected':''}>${txt(r)}</option>`).join('')}</select></label></div><label class="checkbox-line"><input id="showAccountPassword" type="checkbox">${txt('showPassword')}</label><p id="accountSaveStatus" role="alert"></p><details><summary>${txt('addDepartment')}</summary><label>${txt('department')}<input id="newDepartmentName" class="select" maxlength="100"></label>${button('addDepartment','type="button" id="addAccountDepartment"')}</details></form>`,button('save','id="saveAccount" type="submit" form="accountForm"','primary'));
 const form=m.querySelector('#accountForm'),status=m.querySelector('#accountSaveStatus'),save=m.querySelector('#saveAccount');
 m.querySelector('#showAccountPassword').onchange=e=>{for(const id of ['accountPassword','accountPasswordConfirm'])m.querySelector('#'+id).type=e.target.checked?'text':'password';};
 m.querySelector('#addAccountDepartment').onclick=async e=>{const name=m.querySelector('#newDepartmentName').value.trim();if(!name){status.textContent=t('departmentRequired');return;}e.target.disabled=true;try{const r=await api({action:'admin_department_create',name});const select=m.querySelector('#accountDept');if(![...select.options].some(o=>o.value===r.department.id))select.add(new Option(r.department.name_zh,r.department.id));select.value=r.department.id;status.textContent=t('saved');}catch{status.textContent=t('saveAccountFailed');}finally{e.target.disabled=false;}};
 form.onsubmit=async e=>{e.preventDefault();const password=m.querySelector('#accountPassword').value;if((!a||password)&&(password.length<6||password!==m.querySelector('#accountPasswordConfirm').value)){status.textContent=t('passwordRule');return;}save.disabled=true;status.textContent=t('loading');try{const result=await api({action:a?'admin_account_update':'admin_account_create',id:a?.id,account_code:m.querySelector('#accountCode')?.value.trim(),full_name:m.querySelector('#accountName').value,password,department_id:m.querySelector('#accountDept').value,role:m.querySelector('#accountRole').value});if(a&&password)verifyPasswordReset(result,a.id);m.remove();if(a&&password&&a.id===profile?.account_id){logout();showLogin();toast('passwordSignInAgain');return;}await renderSettings();toast('saved');}catch(error){const key={'duplicate_account':'duplicateAccount','Account already exists or cannot be created':'duplicateAccount','Invalid account data':'accountRule','Invalid department':'departmentRequired','invalid_department':'departmentRequired'}[error.message]||'saveAccountFailed';status.textContent=t(key);save.disabled=false;}};
};

const priorRender=render;render=function(){priorRender();if(profile?.role==='admin'&&activeCountry){const nav=document.createElement('button');nav.className='nav'+(view==='dataExport'?' active':'');nav.dataset.view='dataExport';nav.innerHTML=txt('dataExport');nav.onclick=()=>{view='dataExport';render();};$('.side').append(nav);}};
const priorContent=renderContent;renderContent=function(){if(view==='dataExport'&&profile&&activeCountry){if(profile.role!=='admin'){view='board';return render();}return renderDataExport();}return priorContent();};
async function renderDataExport(){const container=$('#content');container.innerHTML=txt('loading');try{const result=await api({action:'admin_export_tables'});if(!container.isConnected||view!=='dataExport')return;container.innerHTML=`<p class="notice">${txt('exportHelp')}</p><label>${txt('dataExport')}<select id="exportTable" class="select"><option value="">${txt('exportAll')}</option>${result.tables.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><p>${button('exportExcel','id="exportDatabaseExcel"','primary')} ${button('exportJson','id="exportDatabaseJson"')}</p><p id="databaseExportStatus" role="status"></p>`;
 for(const type of ['Excel','Json'])$('#exportDatabase'+type).onclick=async()=>{const country=activeCountry,selected=$('#exportTable').value,tables=result.tables.filter(x=>!selected||x.id===selected),output={};const status=container.querySelector('#databaseExportStatus');const buttons=[...container.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{for(const table of tables){let offset=0;output[table.id]=[];do{if(activeCountry!==country)throw Error('country_changed');status.textContent=table.name+' · '+output[table.id].length;const r=await api({action:'admin_export',table:table.id,offset});output[table.id].push(...r.rows);if(r.next_offset!==null&&r.next_offset<=offset)throw Error('invalid_page');offset=r.next_offset;}while(offset!==null);}
 const filename=country+'_資料匯出_'+new Date().toISOString().slice(0,10);if(type==='Json'){const blob=new Blob([JSON.stringify({country_code:country,exported_at:new Date().toISOString(),tables:output},null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}else{const wb=XLSX.utils.book_new();for(const table of tables){const rows=output[table.id].map(row=>{const cells={};for(const [key,value]of Object.entries(row)){const v=value!=null&&typeof value==='object'?JSON.stringify(value):value??'';if(typeof v==='string'&&v.length>30000){for(let i=0;i<v.length;i+=30000)cells[key+'_part'+(i/30000+1)]=v.slice(i,i+30000);}else cells[key]=v;}return cells;}),keys=[...new Set(rows.flatMap(Object.keys))];const matrix=rows.length?[keys,...rows.map(row=>keys.map(k=>row[k]!=null&&typeof row[k]==='object'?JSON.stringify(row[k]):row[k]??''))]:[['無資料 / No records']];const ws=XLSX.utils.aoa_to_sheet(matrix);XLSX.utils.book_append_sheet(wb,ws,table.name.slice(0,31));}XLSX.writeFile(wb,filename+'.xlsx');}status.textContent=t('exportDone')+' · '+Object.values(output).reduce((n,r)=>n+r.length,0);
 }catch{status.textContent=t('exportFailed');}finally{buttons.forEach(b=>b.disabled=false);}};
 }catch{if(container.isConnected)container.textContent=t('exportFailed');}}
render();
})();

// Admin-only reference photo backup. Data remains in private storage; this UI
// requests country-scoped, short-lived download links from the authenticated API.
(() => {
  const copy={
    photoBackupTitle:['參考照片備份','Reference photo backup','Respaldo de fotos de referencia','Sao lưu ảnh tham khảo'],
    photoBackupHelp:['依目前國別按部門打包照片本體與索引 CSV。ZIP 解壓後可直接放回「設備點檢照片備份」資料夾。','Export photo files and an index CSV by department for the selected country. Extract the ZIP into the existing “Equipment Photo Backup” folder.','Exporte fotos e índice CSV por departamento para el país seleccionado. Extraiga el ZIP en la carpeta de respaldo existente.','Xuất ảnh và chỉ mục CSV theo bộ phận của quốc gia đã chọn. Giải nén ZIP vào thư mục sao lưu hiện có.'],
    photoBackupDepartment:['部門','Department','Departamento','Bộ phận'],
    photoAllDepartments:['全部部門','All departments','Todos los departamentos','Tất cả bộ phận'],
    photoBackupLoading:['正在讀取照片清單…','Loading photo list…','Cargando lista de fotos…','Đang tải danh sách ảnh…'],
    photoBackupReady:['已載入 {count} 張照片','Loaded {count} photos','Se cargaron {count} fotos','Đã tải {count} ảnh'],
    photoBackupStart:['建立照片 ZIP','Build photo ZIP','Crear ZIP de fotos','Tạo ZIP ảnh'],
    photoBackupPreparing:['正在準備 {total} 張照片…','Preparing {total} photos…','Preparando {total} fotos…','Đang chuẩn bị {total} ảnh…'],
    photoBackupProgress:['照片下載中 {done}/{total}','Downloading photos {done}/{total}','Descargando fotos {done}/{total}','Đang tải ảnh {done}/{total}'],
    photoBackupDownload:['下載備份 ZIP','Download backup ZIP','Descargar ZIP de respaldo','Tải ZIP sao lưu'],
    photoBackupComplete:['備份 ZIP 已完成，共 {count} 張，大小 {size} MB。','Backup ZIP is ready: {count} photos, {size} MB.','ZIP listo: {count} fotos, {size} MB.','ZIP đã sẵn sàng: {count} ảnh, {size} MB.'],
    photoBackupFailed:['匯出未完成，沒有建立不完整的 ZIP。請重試或通知系統管理員。','Export failed; no incomplete ZIP was created. Retry or contact the administrator.','Falló la exportación; no se creó un ZIP incompleto. Reintente o contacte al administrador.','Xuất thất bại; không tạo ZIP chưa hoàn chỉnh. Hãy thử lại hoặc liên hệ quản trị viên.'],
    photoBackupEmpty:['此範圍沒有可匯出的照片。','No photos are available for this selection.','No hay fotos disponibles para esta selección.','Không có ảnh để xuất trong lựa chọn này.'],
    photoBackupUnassigned:['未歸屬部門','Unassigned department','Departamento sin asignar','Bộ phận chưa phân loại']
  };
  for(const [key,value] of Object.entries(copy))translations[key]=Object.fromEntries(['zh','en','es','vi'].map((language,index)=>[language,value[index]]));
  const replace=(key,values={})=>Object.entries(values).reduce((text,[name,value])=>text.replaceAll('{'+name+'}',String(value)),t(key));
  const safeName=value=>{
    let name=String(value||'photo').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/,'').trim().slice(0,180)||'photo';
    if(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))name='_'+name;
    return name;
  };
  const csvCell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  const dateStamp=()=>new Date().toISOString().slice(0,10).replaceAll('-','');
  function mount(){
    if(!profile||profile.role!=='admin'||!activeCountry||view!=='dataExport')return;
    const content=document.querySelector('#content'),notice=content?.querySelector('.notice');
    if(!content||!notice||content.querySelector('#photoBackupPanel'))return;
    const country=activeCountry,panel=document.createElement('section');panel.id='photoBackupPanel';panel.className='settings-panel photo-backup-panel';
    panel.innerHTML=`<h2>${txt('photoBackupTitle')}</h2><p>${txt('photoBackupHelp')}</p><label>${txt('photoBackupDepartment')}<select id="photoBackupDepartment" class="select"><option value="">${txt('photoAllDepartments')}</option></select></label><p><button type="button" id="photoBackupStart" class="btn primary" disabled>${txt('photoBackupStart')}</button></p><p id="photoBackupStatus" role="status" aria-live="polite">${txt('photoBackupLoading')}</p><div id="photoBackupDownload"></div>`;
    notice.insertAdjacentElement('afterend',panel);
    const select=panel.querySelector('#photoBackupDepartment'),button=panel.querySelector('#photoBackupStart'),status=panel.querySelector('#photoBackupStatus'),downloadBox=panel.querySelector('#photoBackupDownload');
    let photos=[];
    api({action:'admin_reference_photo_export_list'}).then(result=>{
      if(!panel.isConnected||country!==activeCountry||view!=='dataExport')return;
      photos=Array.isArray(result.photos)?result.photos:[];
      const buckets=new Map();for(const photo of photos){const key=photo.department_id||'__unassigned__';if(!buckets.has(key))buckets.set(key,{name:photo.department,count:0});buckets.get(key).count++;}
      for(const [id,entry] of [...buckets].sort((a,b)=>multilingual(a[1].name).localeCompare(multilingual(b[1].name)))){
        const option=document.createElement('option');option.value=id;option.textContent=`${multilingual(entry.name||{zh:t('photoBackupUnassigned'),en:t('photoBackupUnassigned'),es:t('photoBackupUnassigned'),vi:t('photoBackupUnassigned')})} (${entry.count})`;select.append(option);
      }
      status.textContent=replace('photoBackupReady',{count:photos.length});button.disabled=photos.length===0;
    }).catch(()=>{if(panel.isConnected){status.textContent=txt('photoBackupFailed');button.disabled=true;}});
    button.onclick=async()=>{
      const chosen=select.value,list=photos.filter(photo=>!chosen||(chosen==='__unassigned__'?!photo.department_id:photo.department_id===chosen));
      if(!list.length){status.textContent=txt('photoBackupEmpty');return;}
      button.disabled=true;downloadBox.replaceChildren();status.textContent=replace('photoBackupPreparing',{total:list.length});
      try{
        if(typeof JSZip==='undefined')throw new Error('zip_unavailable');
        const signedById=new Map();
        for(let offset=0;offset<list.length;offset+=100){
          if(country!==activeCountry)throw new Error('country_changed');
          const chunk=list.slice(offset,offset+100),signed=await api({action:'admin_reference_photo_export_urls',photo_ids:chunk.map(photo=>photo.id)});
          for(const item of signed.photos||[])signedById.set(item.id,item);
          if(chunk.some(photo=>!signedById.has(photo.id)))throw new Error('missing_signed_url');
        }
        const zip=new JSZip(),rows=new Array(list.length),errors=[];let next=0,done=0;
        const workers=Array.from({length:Math.min(6,list.length)},async()=>{
          while(true){const index=next++;if(index>=list.length)return;const photo=list[index],signed=signedById.get(photo.id);
            try{
              const response=await fetch(signed.url,{mode:'cors',credentials:'omit',cache:'no-store'});if(!response.ok)throw new Error('photo_download_failed');
              const blob=await response.blob();if(Number(photo.size_bytes)>0&&blob.size!==Number(photo.size_bytes))throw new Error('photo_size_mismatch');
              const departmentName=photo.department?.zh||t('photoBackupUnassigned'),folder=safeName(departmentName),filename=photo.id.slice(0,8)+'_'+safeName(photo.original_name);
              const relativePath=`TW/${folder}/${filename}`;zip.file(relativePath,blob);
              rows[index]=['TW',departmentName,photo.id,photo.original_name,photo.mime_type,photo.size_bytes,photo.created_at,relativePath.replaceAll('/','\\'),'照片本體已匯出'];
            }catch(error){errors.push({id:photo.id,error});}
            done++;if(panel.isConnected)status.textContent=replace('photoBackupProgress',{done,total:list.length});
          }
        });
        await Promise.all(workers);if(errors.length)throw new Error('photo_download_failed');
        const headers=['country_code','department','photo_id','original_name','mime_type','size_bytes','created_at_utc','local_path','status'];
        const indexCsv='\ufeff'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
        const stamp=dateStamp(),deptSuffix=chosen?safeName(list[0].department?.zh||'未歸屬部門'):'全部部門';
        zip.file(`索引/照片索引_${country}_${stamp}_${deptSuffix}.csv`,indexCsv);
        zip.file('備份說明.txt',`設備點檢參考照片備份\r\n國別：${country}\r\n匯出日期：${new Date().toISOString()}\r\n照片數：${list.length}\r\n\r\n解壓縮至「設備點檢照片備份」資料夾根目錄，照片將依 TW\\部門 分類；索引 CSV 位於「索引」資料夾。\r\n`);
        if(country!==activeCountry)throw new Error('country_changed');
        const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}}),fileName=`設備點檢參考照片_${country}_${stamp}_${deptSuffix}.zip`;
        const link=document.createElement('a');link.className='btn primary';link.href=URL.createObjectURL(blob);link.download=fileName;link.textContent=txt('photoBackupDownload');link.addEventListener('click',()=>setTimeout(()=>URL.revokeObjectURL(link.href),60000),{once:true});downloadBox.append(link);
        status.textContent=replace('photoBackupComplete',{count:list.length,size:(blob.size/1048576).toFixed(2)});
      }catch(error){status.textContent=txt('photoBackupFailed');downloadBox.replaceChildren();}
      finally{button.disabled=false;}
    };
  }
  const observer=new MutationObserver(mount);observer.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});mount();
})();
