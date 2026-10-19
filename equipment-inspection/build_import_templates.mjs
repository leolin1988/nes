import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const out='C:/Users/leo/Desktop/設備點檢系統開發/設備點檢系統原型/dist/downloads';
await fs.mkdir(out,{recursive:true});
const wb=Workbook.create();
const make=(name,title,headers,row)=>{const s=wb.worksheets.add(name);s.showGridLines=false;s.getRange('A1:N1').merge();s.getRange('A1').values=[[title]];s.getRange('A1:N1').format={fill:'#142B46',font:{bold:true,color:'#FFFFFF',size:14},horizontalAlignment:'left'};s.getRange('A3:N3').values=[headers];s.getRange('A3:N3').format={fill:'#1D5F94',font:{bold:true,color:'#FFFFFF'},horizontalAlignment:'center',wrapText:true};s.getRange('A4:N4').values=[row];s.getRange('A3:N4').format.borders={preset:'all',style:'thin',color:'#D8E2EA'};s.getRange('A:N').format.columnWidth=16;s.getRange('A3:N100').format.verticalAlignment='center';s.freezePanes.freezeRows(3)};
make('機器日常點檢表','設備數位點檢系統｜機器日常點檢表匯入標準格式',['equipment_code','item_order','item_name_zh','item_name_en','item_name_es','item_name_vi','method_zh','method_en','method_es','method_vi','standard_zh','standard_en','standard_es','standard_vi'],['TN001',1,'馬達檢查','Motor check','Inspección del motor','Kiểm tra động cơ','目視檢查','Visual inspection','Inspección visual','Kiểm tra trực quan','無異音','No abnormal noise','Sin ruido anormal','Không có tiếng ồn bất thường']);
make('預防保養紀錄表','設備數位點檢系統｜預防保養紀錄表匯入標準格式',['equipment_code','title_zh','title_en','title_es','title_vi','frequency_days','next_due_at','assigned_department','method_zh','method_en','standard_zh','standard_en','notes_zh','is_active'],['TN004','主軸潤滑與皮帶檢查','Spindle lubrication and belt check','Lubricación del husillo y revisión de la correa','Bôi trơn trục chính và kiểm tra dây đai',30,'2026-11-01','車床','依保養標準執行','Follow maintenance standard','無異常','No abnormality','填寫保養說明',true]);
wb.recalculate();const x=await SpreadsheetFile.exportXlsx(wb);await x.save(out+'/設備點檢與預保養匯入標準格式.xlsx');
