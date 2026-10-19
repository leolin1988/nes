/* Original daily checklists: parse locally, preview first, write only on confirmation. */
(function (root) {
  'use strict';
  const languages = ['zh', 'en', 'es', 'vi'];
  const fields = ['name', 'standard', 'method', 'cycle'];
  const clean = value => String(value ?? '').replace(/\r/g, '').trim();
  const key = value => clean(value).replace(/\s+/g, '').toLowerCase();
  const empty = () => Object.fromEntries(languages.map(l => [l, '']));
  const daily = {zh: '每日', en: 'Daily', es: 'Diario', vi: 'Hằng ngày'};
  function glossaryFromForms(forms) {
    const glossary = Object.create(null);
    for (const f of forms || []) for (const item of f.items || []) for (const field of fields) {
      const value = item[field];
      if (!value?.zh) continue;
      const k=key(value.zh), previous=glossary[k] || empty();
      for(const l of languages) if(!previous[l] && clean(value[l])) previous[l]=clean(value[l]);
      glossary[k]=previous;
    }
    glossary[key(daily.zh)]={...daily};
    return glossary;
  }
  const footer = /填表說明|點檢人員|主管確認|主管簽|check personnel|supervisor signature|distinction symbol|QR18-03/i;
  const headers = {
    name: /^(?:點檢項目|檢查項目|項目|inspection item|check item)(?:\s|$|\/)/i,
    standard: /^(?:判定基準|驗收標準|acceptance standard|judging standard)(?:\s|$|\/)/i,
    method: /^(?:檢查方法|點檢方法|方法|inspection method|method)(?:\s|$|\/)/i,
    cycle: /^(?:保養週期|點檢週期|檢查週期|週期|maintenance cycle|frequency)(?:\s|$|\/)/i,
    order: /^(?:NO\.?|序號|順序|項次)$/i
  };
  function splitText(value) {
    const out = empty();
    for (let line of clean(value).split('\n').map(clean).filter(Boolean)) {
      if (/^[\s(（\d.+\-±~〜～–—<>≤≥=°℃℉%/㎠²³)）?？A-Za-z]+$/.test(line) && /\d/.test(line) && !/[A-Za-z]{4}/.test(line)) {
        for (const l of languages) out[l] = line;
        continue;
      }
      const mixed = line.match(/^(.+[\u3400-\u9fff，。？?！!）)])\s*([A-Z][a-z][\s\S]*)$/);
      if (mixed) {out.zh += (out.zh ? '\n' : '') + mixed[1]; line = mixed[2];}
      let lang = /[\u3400-\u9fff]/.test(line) ? 'zh'
        : /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉĩịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(line) ? 'vi'
        : /[¿¡ñ]|\b(?:inspecci[oó]n|visualizaci[oó]n|sin|comprobar|verificar|m[eé]todo|diario|semanal|mensual|del|los|las|est[aá]|ruido)\b/i.test(line) ? 'es' : 'en';
      if (lang === 'vi' && out.vi && out.vi === out.zh) out.vi = '';
      out[lang] += (out[lang] ? '\n' : '') + line;
    }
    return out;
  }
  function text(value, glossary) {
    const exact = typeof value === 'string' && glossary[key(value)];
    if (exact && languages.every(l=>exact[l])) return {...exact};
    if (typeof value === 'string') {
      const source=key(value);
      // Match the entire Chinese source, never a partial Chinese instruction.
      const matches=Object.entries(glossary).filter(([k,v])=>k && source.startsWith(k) && !/[\u3400-\u9fff]/.test(source.slice(k.length)) && languages.every(l=>v[l]));
      if(matches.length){matches.sort((a,b)=>b[0].length-a[0].length);return {...matches[0][1]};}
    }
    const out = value && typeof value === 'object' ? Object.fromEntries(languages.map(l => [l, clean(value[l])])) : splitText(value);
    const known = glossary[key(typeof value === 'string' ? value : out.zh)] || glossary[key(out.zh)];
    if (known) for (const l of languages) if (!out[l]) out[l] = clean(known[l]);
    return out;
  }
  function issue(form, code, row, field, extra = '') {form._issues.push({code, row, field, extra});}
  function baseForm(filename, sheet, type) {
    return {kind: type, form_name: '', department: '', equipment_group: '', equipment_name: '', machine_no: '', property_no: '',
      source_filename: filename, source_sheet: sheet, source_department: '', items: [], _issues: [], _notes: []};
  }
  function parseSheet(rows, filename, sheet, options = {}) {
    rows = rows.map(r=>r.slice());
    for (const merge of options.merges || []) {
      const value = rows[merge.s.r]?.[merge.s.c];
      if (merge.e.r > merge.s.r && clean(value)) for (let r=merge.s.r+1;r<=merge.e.r;r++) {
        rows[r] ||= [];
        rows[r][merge.s.c] ||= value;
      }
    }
    const glossary = options.glossary || {};
    if (!rows.some(r => r.some(v => clean(v)))) return {forms: [], skipped: 'empty'};
    const standardRow = rows.findIndex(r => r.includes('設備名稱') && r.some(c => c === '項目_zh' || c === '點檢項目_zh'));
    if (standardRow >= 0) {
      const names = rows[standardRow].map(clean), groups = new Map();
      rows.slice(standardRow + 1).forEach((row, n) => {
        if (!row.some(v => clean(v))) return;
        const r = Object.fromEntries(names.map((c, i) => [c, clean(row[i])])), rowNo = standardRow + n + 2;
        const identity = r['表單編號'] || JSON.stringify([r['檔名'], r['部門'], r['設備名稱'], r['機台編號'], r['財產編號']]);
        if (!groups.has(identity)) {
          const f = baseForm(filename, sheet, r['表單類型'] || options.kind || 'daily');
          Object.assign(f, {form_name:r['檔名'], department:r['部門'], source_department:r['部門'], equipment_name:r['設備名稱'], equipment_group:r['設備群組'] || '', machine_no:r['機台編號'] || '', property_no:r['財產編號'] || ''});
          groups.set(identity, f);
        }
        const f = groups.get(identity);
        if (f.department !== r['部門'] || f.equipment_name !== r['設備名稱'] || f.machine_no !== (r['機台編號'] || '') || f.property_no !== (r['財產編號'] || '') || (r['表單類型'] && f.kind !== r['表單類型'])) issue(f, 'inconsistent', rowNo);
        const item = {order: Number(r['順序']) || f.items.length + 1, _row: rowNo};
        for (const [field, column] of [['name', r['點檢項目_zh'] !== undefined ? '點檢項目' : '項目'], ['standard','判定基準'], ['method','檢查方法'], ['cycle','保養週期']]) item[field] = text(Object.fromEntries(languages.map(l => [l,r[column+'_'+l]])), glossary);
        f.items.push(item);
      });
      return {forms:[...groups.values()].map(f => {f.items.sort((a,b)=>a.order-b.order);return f;})};
    }
    let headerRow = -1, columns;
    for (let n = 0; n < rows.length; n++) {
      const c = {};
      rows[n].forEach((value, col) => {for (const [field, pattern] of Object.entries(headers)) if (pattern.test(clean(value))) c[field] = col;});
      if (c.name !== undefined && (c.standard !== undefined || c.method !== undefined)) {headerRow = n;columns = c;break;}
    }
    if (headerRow < 0) return {forms:[], error:'unrecognized'};
    const f = baseForm(filename, sheet, 'daily');
    function metadata(pattern) {
      for (const row of rows.slice(0, headerRow)) for (let c=0;c<row.length;c++) {
        const line = clean(row[c]).split('\n')[0];
        if (!pattern.test(line)) continue;
        const colon = line.search(/[:：]/);
        if (colon >= 0) return clean(line.slice(colon + 1));
        const adjacent = clean(row[c+1]);
        return adjacent && !/[:：\n]/.test(adjacent) ? adjacent : '';
      }
      return '';
    }
    f.equipment_name = metadata(/機器名稱|設備名稱|machine name/i);
    f.machine_no = metadata(/機器編號|機台編號|machine no/i);
    f.property_no = metadata(/財產編號|numbering of property/i);
    f.department = f.source_department = metadata(/使用單位|部門|depar[tm]*ent/i);
    if (columns.cycle === undefined) f._notes.push('dailyDefault');
    for (let n = headerRow + 1; n < rows.length; n++) {
      const r = rows[n];
      const values = fields.map(k => columns[k] === undefined ? '' : clean(r[columns[k]]));
      if (r.slice(0, Math.max(...Object.values(columns)) + 1).some(v => footer.test(clean(v)))) break;
      if (!values.some(Boolean)) continue;
      if (headers.name.test(values[0]) && headers.standard.test(values[1])) continue;
      const item = {order:f.items.length+1, _row:n+1};
      fields.forEach((k,i) => item[k] = k === 'cycle' && columns.cycle === undefined ? {...daily} : text(values[i],glossary));
      f.items.push(item);
    }
    return {forms:[f]};
  }
  function complete(form, options = {}) {
    const f = form, equipment = options.equipment || [], departments = options.departments || [];
    const exact = f.machine_no ? equipment.filter(e => e.equipment_code === f.machine_no || e.machine_no === f.machine_no) : [];
    if (exact.length > 1) issue(f,'ambiguousEquipment');
    if (exact.length === 1) {
      const e = exact[0], dept = departments.find(d => d.id === e.department_id)?.name_zh;
      if (dept && f.department && f.department !== dept) issue(f,'departmentConflict',null,null,dept);
      else if (dept) f.department = dept;
      f.equipment_group ||= e.equipment_groups?.name_zh || (options.groups || []).find(g=>g.id===e.equipment_group_id)?.name_zh || '';
    }
    if (!f.department && options.department) {f.department = options.department;f._notes.push('selectedDepartment');}
    if (!f.department || !departments.some(d => d.name_zh === f.department)) issue(f,'departmentMissing');
    if (!f.equipment_name) issue(f,'equipmentMissing');
    if (f.kind !== (options.kind || 'daily')) issue(f,'kindMismatch');
    if (!f.items.length || f.items.length > 200) issue(f,'itemLimit');
    for (const i of f.items) for (const k of fields) for (const l of languages) {
      if (!clean(i[k]?.[l])) issue(f,'missing',i._row,k,l);
      if (clean(i[k]?.[l]).length > 5000) issue(f,'tooLong',i._row,k,l);
    }
    f.form_name ||= `${f.department || '未指定部門'}_${f.equipment_name || f.source_filename}_${f.source_sheet}_日常點檢.csv`;
    f.form_name = f.form_name.replace(/[\\/:*?"<>|]/g,'_');
    if (f.form_name.length > 180 || f.source_filename.length > 200 || f.source_sheet.length > 100) issue(f,'tooLong');
    if (!/\.csv$/i.test(f.form_name)) f.form_name += '.csv';
    return f;
  }
  function payload(f) {
    return Object.fromEntries(Object.entries(f).filter(([k])=>!k.startsWith('_')).map(([k,v])=>[k,k==='items'?v.map((item,n)=>({order:n+1,...Object.fromEntries(fields.map(field=>[field,item[field]]))})):v]));
  }
  const content = f => JSON.stringify([f.kind,f.department,f.equipment_group,f.equipment_name,f.machine_no,f.property_no, f.items.map(i=>fields.map(k=>languages.map(l=>clean(i[k]?.[l]))))]);
  root.DailyChecklistImport = {parseSheet, complete, payload, content, key, fields, languages, splitText, glossaryFromForms};
  if (typeof module !== 'undefined') module.exports = root.DailyChecklistImport;
})(typeof globalThis !== 'undefined' ? globalThis : window);
