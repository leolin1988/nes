(function () {
  const names = {
    zh: '日常火源表單新增／修改',
    en: 'Daily Fire Form: Add / Edit',
    es: 'Formulario diario contra incendios: alta / edición',
    vi: 'Biểu mẫu nguồn lửa hằng ngày: thêm / sửa'
  };
  const oldRender = render;
  render = function () {
    oldRender();
    if (!profile || !['admin', 'supervisor'].includes(profile.role)) return;
    const side = document.querySelector('.side');
    if (!side || side.querySelector('[data-fire-manager-menu]')) return;

    const section = data.navigationSettings?.config?.sections?.find(item => item.id === 'supervisor');
    const label = section?.label || {};
    const expected = multilingual({
      zh: label.zh || txt('supervisor'),
      en: label.en || txt('supervisor'),
      es: label.es || txt('supervisor'),
      vi: label.vi || txt('supervisor')
    });
    let heading = [...side.querySelectorAll('.side-label')]
      .find(item => item.textContent.replace(/^●\s*/, '').trim() === expected);

    if (!heading) {
      const anchor = side.querySelector('[data-view="approval"], [data-view="cadreManage"], [data-view="items"]');
      if (anchor) {
        heading = [...side.querySelectorAll('.side-label')]
          .filter(item => item.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING)
          .at(-1);
      }
    }
    if (!heading) {
      heading = document.createElement('div');
      heading.className = 'side-label';
      heading.textContent = '● ' + (primary === 'en' ? 'Supervisor management' : primary === 'es' ? 'Gestión de supervisión' : primary === 'vi' ? 'Quản lý giám sát' : '主管管理');
      side.append(heading);
    }

    const button = document.createElement('button');
    button.className = 'nav' + (view === 'fireDaily' ? ' active' : '');
    button.dataset.view = 'fireDaily';
    button.dataset.fireManagerMenu = 'true';
    button.innerHTML = `<span class="menu-symbol" aria-hidden="true">▶</span><span class="menu-text">${esc(names[primary] || names.zh)}</span>`;
    button.onclick = () => { view = 'fireDaily'; render(); };
    heading.insertAdjacentElement('afterend', button);
  };
})();
