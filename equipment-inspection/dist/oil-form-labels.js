/* Oil replacement uses the existing maintenance workflow and permissions. */
window.isOilReplacementForm=f=>/QR158[-_]03/i.test(String(f?.source_filename||'')+' '+String(f?.form_name||''));
window.maintenanceFormCode=f=>window.isOilReplacementForm(f)?'QR158-03':'QR18-04';
window.inspectionFormTitle=f=>f?.kind==='daily'?t('qr03'):window.isOilReplacementForm(f)?multilingual({zh:'QR158-03 油品更換記錄表',en:'QR158-03 Oil replacement record',es:'QR158-03 Registro de cambio de aceite',vi:'QR158-03 Hồ sơ thay dầu'}):t('qr04');
