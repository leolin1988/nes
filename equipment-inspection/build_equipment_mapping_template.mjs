import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const outDir = new URL('./dist/downloads/', import.meta.url);
const outDirPath = fileURLToPath(outDir);
await fs.mkdir(outDirPath, { recursive: true });
const workbook = Workbook.create();
const sheet = workbook.worksheets.add('設備對照表');
sheet.showGridLines = false;
sheet.getRange('A1:D1').merge();
sheet.getRange('A1').values = [['設備對照表匯入標準格式']];
sheet.getRange('A2:D2').merge();
sheet.getRange('A2').values = [['請填寫部門、設備群組、設備編號、設備名稱；設備編號重複時將更新該設備。']];
sheet.getRange('A4:D4').values = [['部門', '設備群組', '設備編號', '設備名稱']];
sheet.getRange('A5:D7').values = [
  ['範例：車床', '範例：CNC 車床群組', 'TN001', '範例：CNC 車床 01'],
  ['', '', '', ''],
  ['', '', '', ''],
];
sheet.getRange('A1:D1').format = { fill: '#142B46', font: { name: 'Arial', size: 14, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'left', verticalAlignment: 'center' };
sheet.getRange('A2:D2').format = { font: { name: 'Arial', size: 10, italic: true, color: '#526779' }, wrapText: false };
sheet.getRange('A4:D4').format = { fill: '#1D5F94', font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', borders: { preset: 'all', style: 'thin', color: '#D8E2EA' } };
sheet.getRange('A5:D104').format = { font: { name: 'Arial', size: 10, color: '#15263A' }, borders: { preset: 'inside', style: 'thin', color: '#E5EDF2' }, verticalAlignment: 'center' };
sheet.getRange('A5:D5').format.fill = '#FFF8E8';
sheet.getRange('A1:D1').format.rowHeight = 28;
sheet.getRange('A2:D2').format.rowHeight = 22;
sheet.getRange('A4:D4').format.rowHeight = 22;
sheet.getRange('A:A').format.columnWidth = 18;
sheet.getRange('B:B').format.columnWidth = 25;
sheet.getRange('C:C').format.columnWidth = 18;
sheet.getRange('D:D').format.columnWidth = 28;
sheet.freezePanes.freezeRows(4);
sheet.tables.add('A4:D104', true, 'EquipmentMappingTable').style = 'TableStyleMedium2';
workbook.recalculate();
const check = await workbook.inspect({ kind: 'table', range: '設備對照表!A1:D7', include: 'values,formulas', tableMaxRows: 8, tableMaxCols: 4 });
console.log(check.ndjson);
const preview = await workbook.render({ sheetName: '設備對照表', range: 'A1:D12', scale: 1.5, format: 'png' });
await fs.writeFile(fileURLToPath(new URL('./equipment_mapping_preview.png', outDir)), new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(fileURLToPath(new URL('./設備對照表匯入標準格式.xlsx', outDir)));
