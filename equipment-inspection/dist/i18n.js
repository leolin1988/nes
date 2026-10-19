const localeNames={zh:'中文',en:'English',es:'Español',vi:'Tiếng Việt'};
const translations={};
const words=`brand|設備數位點檢系統|Digital Equipment Inspection|Inspección digital de equipos|Hệ thống kiểm tra thiết bị
primary|主語言|Primary language|Idioma principal|Ngôn ngữ chính
secondary|副語言|Secondary language|Idioma secundario|Ngôn ngữ phụ
none|不選擇|None|Ninguno|Không chọn
size|字體大小|Text size|Tamaño de texto|Cỡ chữ
field|現場作業|Field Operations|Operaciones de campo|Vận hành hiện trường
fireDaily|日常火源自行檢查表|Daily Fire Source Self-Inspection Form|Formulario diario de autoinspección de fuentes de ignición|Biểu tự kiểm tra nguồn lửa hằng ngày
fireMonth|檢查年月|Inspection month|Mes de inspección|Tháng kiểm tra
fireArea|負責區域|Responsible area|Área responsable|Khu vực phụ trách
fireImplementer|實施人員|Inspector|Responsable|Nhân viên thực hiện
supervisor|主管功能|Supervisor|Supervisor|Quản lý
backoffice|後台管理|Back Office|Administración|Quản trị
board|設備點檢看板|Equipment Inspection Board|Tablero de inspección de equipos|Bảng kiểm tra thiết bị
history|點檢歷史紀錄|Inspection history|Historial de inspección|Lịch sử kiểm tra
visual|目視化管理|Visual management|Gestión visual|Quản lý trực quan
approval|主管簽核|Supervisor approval|Aprobación del supervisor|Phê duyệt của quản lý
daily|機器日常點檢表|Machine daily checklist|Lista diaria de inspección|Bảng kiểm tra máy hằng ngày
maintenance|預防保養記錄表|Preventive maintenance record|Registro de mantenimiento preventivo|Bảng bảo dưỡng phòng ngừa
items|部門主管點檢項目管理|Department inspection item management|Gestión de ítems por departamento|Quản lý hạng mục theo bộ phận
mapping|設備對照表匯入|Equipment mapping import|Importar catálogo de equipos|Nhập danh mục thiết bị
settings|系統設定|System settings|Configuración del sistema|Cài đặt hệ thống
login|帳號登入|Account login|Iniciar sesión|Đăng nhập
logout|登出|Sign out|Cerrar sesión|Đăng xuất
account|帳號|Account|Cuenta|Tài khoản
password|密碼|Password|Contraseña|Mật khẩu
credentials|請輸入帳號與密碼|Enter your account and password|Introduzca su cuenta y contraseña|Nhập tài khoản và mật khẩu
invalidLogin|帳號或密碼錯誤|Invalid account or password|Cuenta o contraseña incorrecta|Sai tài khoản hoặc mật khẩu
loginFirst|請先登入以讀取資料|Sign in to load data|Inicie sesión para cargar datos|Đăng nhập để tải dữ liệu
loading|讀取中|Loading|Cargando|Đang tải
error|操作失敗，請確認權限與資料後重試|Operation failed. Check permissions and data, then retry.|Error. Revise los permisos y los datos e inténtelo de nuevo.|Thao tác thất bại. Kiểm tra quyền và dữ liệu rồi thử lại.
saved|已儲存|Saved|Guardado|Đã lưu
deleted|已刪除|Deleted|Eliminado|Đã xóa
save|儲存|Save|Guardar|Lưu
cancel|取消|Cancel|Cancelar|Hủy
close|關閉|Close|Cerrar|Đóng
edit|修改|Edit|Editar|Sửa
delete|刪除|Delete|Eliminar|Xóa
deleteConfirm|確定刪除此表單？|Delete this form?|¿Eliminar este formulario?|Xóa biểu mẫu này?
department|部門|Department|Departamento|Bộ phận
group|設備群組|Equipment group|Grupo de equipos|Nhóm thiết bị
equipmentCode|設備編號|Equipment code|Código de equipo|Mã thiết bị
equipmentName|設備名稱|Equipment name|Nombre del equipo|Tên thiết bị
machineNo|機台編號|Machine number|Número de máquina|Mã máy
propertyNo|財產編號|Property number|Número de propiedad|Mã tài sản
all|全部|All|Todos|Tất cả
unassigned|未分類|Unassigned|Sin clasificar|Chưa phân loại
search|搜尋設備編號或名稱|Search equipment code or name|Buscar código o nombre de equipo|Tìm mã hoặc tên thiết bị
inspector|點檢人|Inspector|Inspector|Người kiểm tra
day|早班|Day shift|Turno de día|Ca ngày
night|晚班|Night shift|Turno de noche|Ca đêm
scheduled|應點檢設備|Scheduled equipment|Equipos programados|Thiết bị cần kiểm tra
completed|已完成|Completed|Completado|Đã hoàn thành
pending|待點檢|Pending inspection|Pendiente de inspección|Chờ kiểm tra
draft|草稿|Draft|Borrador|Bản nháp
normal|合格|Pass|Conforme|Đạt
abnormal|異常|Abnormal|Anormal|Bất thường
rejected|退回重測|Returned for reinspection|Devuelto para reinspección|Trả lại để kiểm tra
approved|已簽核|Approved|Aprobado|Đã duyệt
awaiting|待簽核|Awaiting approval|Pendiente de aprobación|Chờ phê duyệt
completion|本班完成率|Shift completion rate|Tasa de finalización del turno|Tỷ lệ hoàn thành ca
start|開始點檢|Start inspection|Iniciar inspección|Bắt đầu kiểm tra
details|檢視明細|View details|Ver detalles|Xem chi tiết
noData|尚無資料|No data|Sin datos|Chưa có dữ liệu
date|日期／時間|Date / time|Fecha / hora|Ngày / giờ
result|結果|Result|Resultado|Kết quả
actions|操作|Actions|Acciones|Thao tác
year|年份|Year|Año|Năm
year2|比較年份|Comparison year|Año de comparación|Năm so sánh
month|月份|Month|Mes|Tháng
noRecord|未有紀錄|No record|Sin registro|Chưa có bản ghi
add|新增|Add|Añadir|Thêm
import|匯入|Import|Importar|Nhập
download|下載匯入格式|Download import format|Descargar formato de importación|Tải mẫu nhập
export|依部門下載資料|Download department data|Descargar datos por departamento|Tải dữ liệu theo bộ phận
selectFile|選擇檔案|Select file|Seleccionar archivo|Chọn tệp
importHelp|每列一個項目；相同內容更新同一筆表單並保留最新來源檔名。|One item per row. Identical forms are updated with the latest source filename.|Un ítem por fila. Los formularios idénticos se actualizan con el último nombre de archivo.|Mỗi dòng một hạng mục. Biểu mẫu trùng nội dung được cập nhật với tên tệp mới nhất.
mappingHelp|依設備編號比對設備群組清單；空白群組保留為未分類。|Match the group list by equipment code; blank groups remain unassigned.|Compare la lista por código de equipo; los grupos vacíos quedan sin clasificar.|Đối chiếu nhóm theo mã thiết bị; nhóm trống giữ nguyên chưa phân loại.
imported|匯入完成|Import completed|Importación completada|Đã nhập xong
invalidFile|檔案內容或必要欄位不正確|Invalid file or required fields|Archivo o campos obligatorios incorrectos|Tệp hoặc trường bắt buộc không hợp lệ
source|最新來源檔案|Latest source file|Último archivo de origen|Tệp nguồn mới nhất
updated|最後更新|Last updated|Última actualización|Cập nhật gần nhất
item|點檢項目|Inspection item|Ítem de inspección|Hạng mục kiểm tra
method|檢查方法|Inspection method|Método de inspección|Phương pháp kiểm tra
standard|判定基準|Acceptance standard|Criterio de aceptación|Tiêu chí đánh giá
cycle|保養週期|Maintenance cycle|Frecuencia de mantenimiento|Chu kỳ bảo dưỡng
order|順序|Order|Orden|Thứ tự
addItem|新增項目|Add item|Añadir ítem|Thêm hạng mục
removeItem|移除項目|Remove item|Quitar ítem|Xóa hạng mục
required|請填寫部門、設備名稱及中文項目|Enter department, equipment name and Chinese item text|Introduzca departamento, equipo y texto del ítem en chino|Nhập bộ phận, tên thiết bị và nội dung hạng mục tiếng Trung
translations|四語內容|Content in four languages|Contenido en cuatro idiomas|Nội dung bốn ngôn ngữ
missingTranslation|尚未提供此語言翻譯|Translation not provided|Traducción no disponible|Chưa có bản dịch
noForm|尚無適用表單，請先由主管設定|No matching form. Ask a supervisor to configure one.|No hay formulario aplicable. Solicite su configuración al supervisor.|Chưa có biểu mẫu phù hợp. Yêu cầu quản lý thiết lập.
chooseForm|選擇表單|Select form|Seleccionar formulario|Chọn biểu mẫu
saveDraft|儲存草稿|Save draft|Guardar borrador|Lưu nháp
submit|提交點檢|Submit inspection|Enviar inspección|Gửi kiểm tra
quickPass|一鍵全數正常|Mark all normal|Marcar todo normal|Đánh dấu tất cả bình thường
craneQuickComplete|一鍵完成（全部先標記正常）|Complete checklist|Completar lista|Hoàn tất danh sách
craneQuickCompleteHelp|按下後會將檢查項目標記為正常並勾選完成；鋼索量測值仍須依現場實測填寫。|All items will be marked as passing and completion selected. Enter the actual wire-rope measurement from the equipment.|Todos los ítems se marcarán como conformes y se seleccionará «Completo». Introduzca la medición real del cable.|Tất cả hạng mục sẽ được đánh dấu đạt và chọn hoàn tất. Hãy nhập số đo cáp thép thực tế.
craneRope10|10 mm 公稱直徑（容許值 9.3 mm）實測值|10 mm nominal diameter (permissible value 9.3 mm), measured value|Diámetro nominal de 10 mm (valor permitido 9,3 mm), medida|Đường kính danh nghĩa 10 mm (giá trị cho phép 9,3 mm), số đo thực tế
craneRope12|12 mm 公稱直徑（容許值 11.16 mm）實測值|12 mm nominal diameter (permissible value 11.16 mm), measured value|Diámetro nominal de 12 mm (valor permitido 11,16 mm), medida|Đường kính danh nghĩa 12 mm (giá trị cho phép 11,16 mm), số đo thực tế
craneRopeMeasured|實測直徑|Measured diameter|Diámetro medido|Đường kính đo được
craneRopeMeasurementRequired|完成月檢前，請至少填寫一項適用鋼索直徑的實測值。|Enter at least one applicable wire-rope diameter measurement before completing the monthly inspection.|Introduzca al menos una medida aplicable del cable antes de completar la inspección mensual.|Nhập ít nhất một số đo đường kính cáp phù hợp trước khi hoàn tất kiểm tra tháng.
maintenanceResult|維修|Repair required|Requiere reparación|Cần sửa chữa
disable|停用|Out of service|Fuera de servicio|Ngưng sử dụng
reason|異常原因|Abnormality details|Detalles de anomalía|Lý do bất thường
photo|現場照片|Site photo|Foto del lugar|Ảnh hiện trường
incomplete|請完成所有項目並填寫異常原因|Complete all items and provide abnormality details|Complete todos los ítems y los detalles de anomalía|Hoàn thành mọi hạng mục và nhập lý do bất thường
nameRequired|請輸入點檢姓名|Enter the inspector name|Introduzca el nombre del inspector|Nhập tên người kiểm tra
approve|簽核|Approve|Aprobar|Phê duyệt
reject|退回|Return|Devolver|Trả lại
role|角色|Role|Rol|Vai trò
operator|作業員|Operator|Operador|Nhân viên
admin|管理員|Administrator|Administrador|Quản trị viên
fullName|姓名|Name|Nombre|Họ tên
active|啟用|Active|Activo|Hoạt động
inactive|已停用|Inactive|Inactivo|Đã ngừng
status|狀態|Status|Estado|Trạng thái
newAccount|新增帳號|Add account|Añadir cuenta|Thêm tài khoản
refresh|重新整理|Refresh|Actualizar|Làm mới
disableConfirm|確定停用此帳號？|Disable this account?|¿Desactivar esta cuenta?|Ngừng tài khoản này?
passwordHint|密碼至少六個字元|At least six password characters|Contraseña de al menos seis caracteres|Mật khẩu ít nhất sáu ký tự
formType|表單類型|Form type|Tipo de formulario|Loại biểu mẫu
readOnly|此角色僅可檢視|This role has read-only access|Este rol solo puede consultar|Vai trò này chỉ có quyền xem
latest|最新點檢|Latest inspection|Última inspección|Kiểm tra gần nhất
changedPassword|密碼已更新|Password updated|Contraseña actualizada|Đã đổi mật khẩu
newPassword|新密碼|New password|Nueva contraseña|Mật khẩu mới
changePassword|變更密碼|Change password|Cambiar contraseña|Đổi mật khẩu
monthlyView|每月已完成筆數|Completed records per month|Registros completados por mes|Số bản ghi hoàn thành theo tháng`;
words.split('\n').forEach(line=>{const [key,...v]=line.split('|');translations[key]=Object.fromEntries(['zh','en','es','vi'].map((l,i)=>[l,v[i]]));});
let primary=localStorage.getItem('primary_language')||'zh', secondary=localStorage.getItem('secondary_language')??'en';
if(!localeNames[primary])primary='zh';if(secondary&&!localeNames[secondary])secondary='en';
function translated(v,lang){return v?.[lang]||translations.missingTranslation[lang];}
function t(key){const v=translations[key];if(!v)throw Error('Missing UI translation: '+key);const a=translated(v,primary),b=secondary&&secondary!==primary?translated(v,secondary):'';return b&&a!==b?a+' / '+b:a;}
function multilingual(v){if(!v || (typeof v==='object' && !Object.values(v).some(Boolean)))return '—';if(typeof v==='string')return v;const a=translated(v,primary),b=secondary&&secondary!==primary?translated(v,secondary):'';return b&&a!==b?a+' / '+b:a;}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function txt(key){return esc(t(key));}


Object.assign(translations,{backfill:{zh:'補設備點檢',en:'Backfill equipment inspection',es:'Registrar inspección atrasada',vi:'Bổ sung kiểm tra thiết bị'},shift:{zh:'班別',en:'Shift',es:'Turno',vi:'Ca'}});

Object.assign(translations,{
 primaryFontSize:{zh:'主語言字級 (px)',en:'Primary text size (px)',es:'Tamaño principal (px)',vi:'Cỡ chữ chính (px)'},
 secondaryFontSize:{zh:'副語言字級 (px)',en:'Secondary text size (px)',es:'Tamaño secundario (px)',vi:'Cỡ chữ phụ (px)'},
 fontSizeHelp:{zh:'可自行輸入 6–72 px；即時套用並儲存於此瀏覽器。',en:'Enter 6–72 px; applied immediately and saved in this browser.',es:'Introduzca 6–72 px; se aplica y guarda en este navegador.',vi:'Nhập 6–72 px; áp dụng ngay và lưu trong trình duyệt.'}
});
// Unconfigured sizes follow the browser's base size, not a fixed language ratio.
const browserFontSize=parseFloat(getComputedStyle(document.documentElement).fontSize);
function languageFontSize(key){const value=Number(localStorage.getItem(key));return Number.isFinite(value)&&value>=6&&value<=72?value:browserFontSize;}
function fontSizeControls(){return [['fontSize','primaryFontSize','inspection_font_size'],['secondaryFontSize','secondaryFontSize','inspection_secondary_font_size']].map(([id,key,storage])=>`<label class="font-size-control">${txt(key)}<input id="${id}" class="select" type="number" min="6" max="72" step="1" value="${languageFontSize(storage)}" title="${esc(t('fontSizeHelp'))}"></label>`).join('');}
function bindFontSizes(){for(const[id,key]of [['fontSize','inspection_font_size'],['secondaryFontSize','inspection_secondary_font_size']]){const input=document.getElementById(id);input.oninput=()=>{if(!input.value||!input.validity.valid)return;localStorage.setItem(key,input.value);applySize();};input.onchange=()=>{if(!input.value||!input.validity.valid)input.value=languageFontSize(key);};}}
