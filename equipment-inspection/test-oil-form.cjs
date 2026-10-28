const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const oil={kind:'maintenance',form_name:'QR158-03',items:[{name:{zh:'柴油更換'},standard:{},method:{},cycle:{zh:'每季'},schedule:[3,6,9,12].map(month=>({month,cycle_code:'Q'}))},{name:{zh:'防銹油鹽霧測試<1小時無紅銹>'},standard:{},method:{},cycle:{zh:'每月'},schedule:Array.from({length:12},(_,i)=>({month:i+1,cycle_code:'M'}))}]};
const ctx=vm.createContext({primary:'zh',window:{},t:key=>({qr03:'QR18-03',qr04:'QR18-04'}[key]||key),multilingual:v=>v?.zh||'',localName:String,activeCountry:'TW',countryLabel:()=> 'TW',translations:Object.fromEntries(['cycleRule1','cycleRule2','cycleRule3','cycleRule4'].map(k=>[k,{zh:'QR18-04-B',en:'QR18-04-B',es:'QR18-04-B',vi:'QR18-04-B'}])),symbols:{M:['△','▲'],Q:['◇','◆']},cycleCode:v=>v==='每季'?'Q':'M'});
vm.runInContext(fs.readFileSync('dist/oil-form-labels.js','utf8'),ctx);
assert.equal(ctx.window.maintenanceFormCode(oil),'QR158-03');assert.equal(ctx.window.maintenanceFormCode({}),'QR18-04');assert.equal(ctx.window.inspectionFormTitle(oil),'QR158-03 油品更換記錄表');
const source=fs.readFileSync('dist/management.js','utf8');vm.runInContext(source.slice(source.indexOf('function exportMatrix('),source.indexOf('function previewExport(')),ctx);
const matrix=ctx.exportMatrix(oil,['2026-01','2026-12'],new Set([0,1]));assert.equal(matrix[0][0],'QR158-03 油品更換記錄表');assert(!JSON.stringify(matrix).includes('QR18-04-B'));assert(matrix.some(r=>r.includes('柴油更換')));
console.log('PASS oil title and export form number, quarterly/monthly schedules, standard maintenance fallback');
