const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

async function requestJson(url, { method = 'GET', body, defaultError = 'Erreur serveur' } = {}) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    throw new Error('Serveur injoignable');
  }
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (response.status === 401) {
      window.location.href = 'login.php?expired=1';
    }
    throw new Error('Reponse JSON invalide');
  }
  if (response.status === 401) {
    window.location.href = 'login.php?expired=1';
    throw new Error('Authentification requise');
  }
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || defaultError);
  }
  return data;
}

let cachedServices = [];
let pendingLineFocus = null;

const api = {
  async getAudits() {
    const res = await requestJson('api/get_audits.php', {
      defaultError: 'Impossible de charger les audits',
    });
    return res.data ?? [];
  },
  async updateAuditStatus(id, statut) {
    return requestJson('api/update_audit_status.php', {
      method: 'POST',
      body: { id, statut },
      defaultError: 'Impossible de mettre a jour le statut',
    });
  },
  async getNormes() {
    const res = await requestJson('api/get_normes.php', {
      defaultError: 'Impossible de charger les normes',
    });
    return res.data ?? [];
  },
  async getServicesAll() {
    const res = await requestJson('api/get_services_all.php', {
      defaultError: 'Impossible de charger les services',
    });
    return res.data ?? [];
  },
  addNorme(payload) {
    return requestJson('api/add_norme.php', {
      method: 'POST',
      body: payload,
      defaultError: 'Impossible d ajouter la norme',
    });
  },
  addService(payload) {
    return requestJson('api/add_service.php', {
      method: 'POST',
      body: payload,
      defaultError: 'Impossible d ajouter le service',
    });
  },
  addLigneMulti(payload) {
    return requestJson('api/add_ligne_multi.php', {
      method: 'POST',
      body: payload,
      defaultError: 'Impossible d ajouter la ligne',
    });
  },
  async getLignesByNorme(normeId, serviceId) {
    const params = new URLSearchParams({ norme_id: String(normeId) });
    if (serviceId) params.set('service_ids', serviceId);
    const res = await requestJson(`api/get_lignes_grouped.php?${params.toString()}`, {
      defaultError: 'Impossible de charger les lignes',
    });
    return res.data ?? [];
  },
  async updateLigne(payload) {
    return requestJson('api/update_ligne.php', {
      method: 'POST',
      body: payload,
      defaultError: 'Impossible de mettre a jour la ligne',
    });
  },
  async getUsers() {
    const res = await requestJson('api/get_users.php', {
      defaultError: 'Impossible de charger les utilisateurs',
    });
    return res.data ?? [];
  },
  updateUserRole(payload) {
    return requestJson('api/update_user_role.php', {
      method: 'POST',
      body: payload,
      defaultError: 'Impossible de mettre a jour le role utilisateur',
    });
  },
};

init();

async function init() {
  setupTabs();
  setupSubtabs();
  bindEvents();
  await safeCall(loadAudits);
  await safeCall(populateRefs);
  await safeCall(loadUsers);
}

function setupTabs() {
  $$('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach((b) => b.classList.remove('active'));
      $$('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $('#' + btn.dataset.tab).classList.add('active');
    });
  });
}

function setupSubtabs() {
  $$('.subtab').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.subtab').forEach((b) => b.classList.remove('active'));
      $$('.subpanel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $('#' + btn.dataset.subtab).classList.add('active');
    });
  });
}

function bindEvents() {
  $('#btnRefreshAudits').addEventListener('click', () => safeCall(loadAudits));
  $('#btnAddNorme').addEventListener('click', () => safeCall(handleAddNorme));
  $('#btnAddService').addEventListener('click', () => safeCall(handleAddService));
  $('#btnAddLigne').addEventListener('click', () => safeCall(handleAddLigne));
  const normeCreate = $('#l_norme');
  if (normeCreate) normeCreate.addEventListener('change', () => safeCall(refreshLignesPreview));
  const editNorme = $('#edit_norme');
  if (editNorme) editNorme.addEventListener('change', () => safeCall(loadEditableLignes));
  const editService = $('#edit_service');
  if (editService) editService.addEventListener('change', () => safeCall(loadEditableLignes));
  const btnReloadEdit = $('#btnReloadEdit');
  if (btnReloadEdit) btnReloadEdit.addEventListener('click', (e) => {
    e.preventDefault();
    safeCall(loadEditableLignes);
  });
  const editTable = $('#lignesEditTable');
  if (editTable) {
    editTable.addEventListener('click', (event) => {
      const btn = event.target.closest('.btn-update-line');
      if (!btn) return;
      const row = btn.closest('tr');
      if (!row) return;
      safeCall(() => updateLigneFromRow(row));
    });
  }
  const btnRefreshUsers = $('#btnRefreshUsers');
  if (btnRefreshUsers) {
    btnRefreshUsers.addEventListener('click', () => safeCall(loadUsers));
  }
  const usersTable = $('#usersTable');
  if (usersTable) {
    usersTable.addEventListener('click', (event) => {
      const btn = event.target.closest('.btn-role-toggle');
      if (!btn) return;
      safeCall(() => handleRoleToggle(btn));
    });
  }
}

async function loadAudits() {
  const audits = await api.getAudits();
  const container = $('#auditList');
  if (!audits.length) {
    container.innerHTML = '<div class="empty">Aucun audit a afficher.</div>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Date</th>
        <th>Norme</th>
        <th>Statut</th>
        <th>Resultats</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  audits.forEach((a) => {
    const tr = document.createElement('tr');
    const normeLabel = `${escapeHtml(a.norme_libelle || '')} (${escapeHtml(a.norme_code || '')})`;
    const statutCell =
      a.statut === 'CLOTURE'
        ? '<span class="badge badge-lock">CLOTURE</span>'
        : `
          <select data-id="${a.id}" class="adm-status">
            <option value="BROUILLON" ${a.statut === 'BROUILLON' ? 'selected' : ''}>BROUILLON</option>
            <option value="EN_COURS" ${a.statut === 'EN_COURS' ? 'selected' : ''}>EN_COURS</option>
            <option value="CLOTURE" ${a.statut === 'CLOTURE' ? 'selected' : ''}>CLOTURE</option>
          </select>
        `;
    const actionLabel = a.statut === 'CLOTURE' ? 'Consulter' : 'Modifier';
    tr.innerHTML = `
      <td>${a.id}</td>
      <td>${a.date_audit ?? '-'}</td>
      <td>${normeLabel}</td>
      <td>${statutCell}</td>
      <td>${a.nb_resultats ?? 0}</td>
      <td><a class="btn" href="edit_audit.php?id=${a.id}">${actionLabel}</a></td>
    `;
    tbody.appendChild(tr);
  });

  container.innerHTML = '';
  container.appendChild(table);

  $$('.adm-status', table).forEach((select) => {
    select.addEventListener('change', async (event) => {
      const id = Number(event.target.dataset.id);
      const statut = event.target.value;
      await safeCall(async () => {
        await api.updateAuditStatus(id, statut);
        await loadAudits();
      });
    });
  });
}

async function populateRefs() {
  const [normes, services] = await Promise.all([api.getNormes(), api.getServicesAll()]);
  cachedServices = services;

  const normeSelect = $('#l_norme');
  if (!normes.length) {
    normeSelect.innerHTML = '<option value="">Aucune norme</option>';
  } else {
    normeSelect.innerHTML = normes
      .map((n) => {
        const dateTxt = n.date_norme ? ` - ${n.date_norme}` : '';
        return `<option value="${n.id}">${escapeHtml(n.libelle)} (${escapeHtml(n.code)})${dateTxt}</option>`;
      })
      .join('');
  }

  const checklist = $('#servicesChecklist');
  if (!services.length) {
    checklist.innerHTML = '<div class="empty">Aucun service.</div>';
  } else {
    checklist.innerHTML = services
      .map(
        (s) =>
          `<label><input type="checkbox" value="${s.id}"> ${escapeHtml(s.nom)}</label>`
      )
      .join('');
  }
  const editNorme = $('#edit_norme');
  if (editNorme) {
    editNorme.innerHTML = normeSelect.innerHTML;
  }
  const editService = $('#edit_service');
  if (editService) {
    editService.innerHTML =
      '<option value="">Tous</option>' +
      services.map((s) => `<option value="${s.id}">${escapeHtml(s.nom)}</option>`).join('');
  }

  await refreshLignesPreview();
  await loadEditableLignes();
}

async function refreshLignesPreview() {
  const normeSelect = $('#l_norme');
  const container = $('#lignesPreview');
  if (!container || !normeSelect) return;
  const normeId = Number(normeSelect.value || 0);
  if (!normeId) {
    container.innerHTML = '<div class="empty">Selectionnez une norme pour voir ses lignes.</div>';
    return;
  }
  const lignes = await api.getLignesByNorme(normeId);
  if (!lignes.length) {
    container.innerHTML = '<div class="empty">Aucune ligne enregistree pour cette norme.</div>';
    return;
  }
  container.innerHTML = lignes
    .map((l) => {
      const titleParts = [];
      if (l.code) titleParts.push(escapeHtml(l.code));
      if (l.intitule) titleParts.push(escapeHtml(l.intitule));
      const title = titleParts.join(' - ') || 'Intitule indisponible';
      const servicesTxt =
        l.services && l.services.length
          ? l.services.map((s) => escapeHtml(s.nom)).join(', ')
          : 'Tous les services';
      const metaBits = [];
      if (Number(l.obligatoire)) metaBits.push('Obligatoire');
      if (l.poids !== null && l.poids !== undefined) metaBits.push(`Poids ${l.poids}`);
      if (l.ordre !== null && l.ordre !== undefined) metaBits.push(`Ordre ${l.ordre}`);
      const meta =
        metaBits.length > 0 ? `<p class="hint">${metaBits.join(' | ')}</p>` : '';
      const lineIds = (l.line_ids || []).join(',');
      return `
        <div class="preview-item preview-link"
             data-norme-id="${l.norme_id}"
             data-line-ids="${lineIds}">
          <h4>${title}</h4>
          <p>Services : ${servicesTxt}</p>
          ${meta}
          <span class="preview-tip">Cliquer pour modifier</span>
        </div>
      `;
    })
    .join('');
  container.querySelectorAll('.preview-link').forEach((card) => {
    card.addEventListener('click', () => handlePreviewClick(card));
  });
}

function handlePreviewClick(card) {
  const normeId = Number(card.dataset.normeId || 0);
  const lineIds = (card.dataset.lineIds || '')
    .split(',')
    .map((n) => Number(n))
    .filter(Boolean);
  if (!normeId || !lineIds.length) return;
  focusEditableLigne(normeId, lineIds);
}

async function handleAddNorme() {
  const code = $('#n_code').value.trim();
  const libelle = $('#n_libelle').value.trim();
  const date_norme = $('#n_date').value || null;
  if (!code || !libelle) {
    throw new Error('Code et libelle requis');
  }
  await api.addNorme({ code, libelle, date_norme });
  notify.success('Norme ajoutée');
  $('#n_code').value = '';
  $('#n_libelle').value = '';
  $('#n_date').value = '';
  await populateRefs();
}

async function handleAddService() {
  const nom = $('#s_nom').value.trim();
  if (!nom) throw new Error('Nom requis');
  await api.addService({ nom });
  notify.success('Service ajouté');
  $('#s_nom').value = '';
  await populateRefs();
}

async function handleAddLigne() {
  const norme_id = Number($('#l_norme').value || 0);
  const code = $('#l_code').value.trim() || null;
  const intitule = $('#l_intitule').value.trim();
  const obligatoire = $('#l_obl').value === '1';
  const poids = $('#l_poids').value ? Number($('#l_poids').value) : null;
  const ordre = $('#l_ordre').value ? Number($('#l_ordre').value) : null;
  if (!norme_id || !intitule) {
    throw new Error('Norme et intitule requis');
  }
  const services = $$('#servicesChecklist input[type=checkbox]:checked').map((c) =>
    Number(c.value)
  );
  const res = await api.addLigneMulti({
    norme_id,
    code,
    intitule,
    obligatoire,
    poids,
    ordre,
    service_ids: services,
  });
  notify.success(`Ligne créée pour ${res.created} service(s)`);
  $('#l_code').value = '';
  $('#l_intitule').value = '';
  $('#l_poids').value = '';
  $('#l_ordre').value = '';
  $$('#servicesChecklist input[type=checkbox]').forEach((c) => (c.checked = false));
  await refreshLignesPreview();
  await loadEditableLignes();
}

function focusEditableLigne(normeId, lineIds) {
  pendingLineFocus = { normeId, lineIds };
  const refTabBtn = document.querySelector('.tab[data-tab="tab-ref"]');
  if (refTabBtn && !refTabBtn.classList.contains('active')) {
    refTabBtn.click();
  }
  const editSubtabBtn = document.querySelector('.subtab[data-subtab="sub-edit-lignes"]');
  if (editSubtabBtn && !editSubtabBtn.classList.contains('active')) {
    editSubtabBtn.click();
  }
  const editNorme = $('#edit_norme');
  if (editNorme) {
    editNorme.value = String(normeId);
  }
  safeCall(loadEditableLignes);
}

async function loadEditableLignes() {
  const tableContainer = $('#lignesEditTable');
  const normeSelect = $('#edit_norme');
  const serviceSelect = $('#edit_service');
  if (!tableContainer || !normeSelect) return;
  const normeId = Number(normeSelect.value || 0);
  const serviceId = serviceSelect ? serviceSelect.value : '';
  if (!normeId) {
    tableContainer.innerHTML = '<div class="empty">Selectionnez une norme.</div>';
    pendingLineFocus = null;
    return;
  }
  const lignes = await api.getLignesByNorme(normeId, serviceId || null);
  if (!lignes.length) {
    tableContainer.innerHTML = '<div class="empty">Aucune ligne trouvee.</div>';
    pendingLineFocus = null;
    return;
  }
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Code</th>
        <th>Intitule</th>
        <th>Services concernes</th>
        <th>Obligatoire</th>
        <th>Poids</th>
        <th>Ordre</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  lignes.forEach((l) => {
    const tr = document.createElement('tr');
    tr.dataset.lineIds = (l.line_ids || []).join(',');
    const serviceIds = new Set((l.service_ids || []).map((id) => Number(id)));
    const serviceTags = cachedServices.length
      ? cachedServices
          .map((srv) => {
            const checked = serviceIds.has(Number(srv.id));
            const idValue = escapeAttr(String(srv.id));
            return `<label><input type="checkbox" class="service-toggle" value="${idValue}" ${checked ? 'checked' : ''}> ${escapeHtml(srv.nom)}</label>`;
          })
          .join('')
      : '<span class="hint">Aucun service</span>';
    tr.innerHTML = `
      <td><input type="text" name="code" value="${escapeAttr(String(l.code ?? ''))}" /></td>
      <td><input type="text" name="intitule" value="${escapeAttr(String(l.intitule ?? ''))}" /></td>
      <td>
        <div class="service-tags">
          ${serviceTags}
        </div>
      </td>
      <td>
        <select name="obligatoire">
          <option value="1" ${Number(l.obligatoire) ? 'selected' : ''}>Oui</option>
          <option value="0" ${Number(l.obligatoire) ? '' : 'selected'}>Non</option>
        </select>
      </td>
      <td><input type="number" step="0.01" name="poids" value="${escapeAttr(String(l.poids ?? ''))}" /></td>
      <td><input type="number" name="ordre" value="${escapeAttr(String(l.ordre ?? ''))}" /></td>
      <td><button type="button" class="btn btn-inline btn-accent btn-update-line">Mettre a jour</button></td>
    `;
    tbody.appendChild(tr);
  });
  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);

  if (pendingLineFocus && pendingLineFocus.normeId === normeId) {
    highlightFocusedRow(pendingLineFocus.lineIds, table);
    pendingLineFocus = null;
  }
}

function highlightFocusedRow(lineIds, table) {
  if (!Array.isArray(lineIds) || !lineIds.length) return;
  const targetSet = new Set(lineIds.map((id) => String(id)));
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const match = rows.find((row) => {
    const ids = (row.dataset.lineIds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return ids.some((id) => targetSet.has(id));
  });
  if (match) {
    match.classList.add('line-focus');
    match.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => match.classList.remove('line-focus'), 2200);
  }
}

async function updateLigneFromRow(row) {
  const ids = (row.dataset.lineIds || '')
    .split(',')
    .map((n) => Number(n))
    .filter(Boolean);
  if (!ids.length) throw new Error('Ligne inconnue');
  const code = $('input[name=code]', row).value.trim();
  const intitule = $('input[name=intitule]', row).value.trim();
  const obligatoire = $('select[name=obligatoire]', row).value === '1';
  const poidsVal = $('input[name=poids]', row).value;
  const ordreVal = $('input[name=ordre]', row).value;
  const serviceIds = $$('.service-toggle', row)
    .filter((cb) => cb.checked)
    .map((cb) => Number(cb.value));
  if (!intitule) throw new Error('Intitule requis');
  if (!serviceIds.length) throw new Error('Selectionnez au moins un service');
  await api.updateLigne({
    line_ids: ids,
    code: code || null,
    intitule,
    obligatoire,
    poids: poidsVal === '' ? null : Number(poidsVal),
    ordre: ordreVal === '' ? null : Number(ordreVal),
    service_ids: serviceIds,
  });
  notify.success('Ligne mise à jour');
  await refreshLignesPreview();
  await loadEditableLignes();
}

async function loadUsers() {
  const container = $('#usersTable');
  if (!container) return;
  container.innerHTML = '<div class="empty">Chargement...</div>';
  const users = await api.getUsers();
  if (!users.length) {
    container.innerHTML = '<div class="empty">Aucun utilisateur.</div>';
    return;
  }
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Nom complet</th>
        <th>Nom utilisateur</th>
        <th>Role</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  users.forEach((user) => {
    const userId = Number(user.id) || 0;
    const displayName = user.display_name ? String(user.display_name) : '';
    const username = user.username ? String(user.username) : '';
    const label = displayName || username || 'cet utilisateur';
    const roleLabel = (user.role || 'USER').toUpperCase();
    const isAdmin = roleLabel === 'ADMIN';
    const nextRole = isAdmin ? 'USER' : 'ADMIN';
    const actionLabel = isAdmin ? 'Retirer admin' : 'Donner admin';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(displayName || '-')}</td>
      <td>${escapeHtml(username || '-')}</td>
      <td><span class="chip">${escapeHtml(roleLabel)}</span></td>
      <td>
        <button type="button"
          class="btn btn-inline btn-role-toggle"
          data-user-id="${userId}"
          data-next-role="${nextRole}"
          data-username="${escapeAttr(label)}">
          ${actionLabel}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  container.innerHTML = '';
  container.appendChild(table);
}

async function handleRoleToggle(button) {
  const userId = Number(button.dataset.userId || 0);
  const nextRole = button.dataset.nextRole;
  if (!userId || !nextRole) {
    throw new Error('Action utilisateur invalide');
  }
  const label = button.dataset.username ? button.dataset.username : 'cet utilisateur';
  const confirmMessage =
    nextRole === 'ADMIN'
      ? `Donner le role admin a ${label} ?`
      : `Retirer le role admin a ${label} ?`;
  const confirmed = await notify.confirm({
    title: 'Confirmation',
    message: confirmMessage,
    confirmText: 'Oui',
    cancelText: 'Non',
  });
  if (!confirmed) return;
  const initialText = button.textContent;
  button.disabled = true;
  button.textContent = 'Mise a jour...';
  try {
    await api.updateUserRole({ user_id: userId, role: nextRole });
    await loadUsers();
  } finally {
    button.disabled = false;
    button.textContent = initialText;
  }
}

async function safeCall(fn) {
  try {
    await fn();
  } catch (err) {
    notifyError(err);
  }
}

function notifyError(err, fallback) {
  console.error(err);
  notify.error(err?.message || fallback || 'Erreur inattendue');
}

function escapeHtml(str = '') {
  return str.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function escapeAttr(str = '') {
  return str.replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));
}



