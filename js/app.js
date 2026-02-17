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

const api = {
  async getNormes() {
    const res = await requestJson('api/get_normes.php', {
      defaultError: 'Chargement des normes impossible',
    });
    return res.data ?? [];
  },
  async getAllServices() {
    const res = await requestJson('api/get_services_all.php', {
      defaultError: 'Chargement des services impossible',
    });
    return res.data ?? [];
  },
  async getLignes({ normeId, serviceIds }) {
    const params = new URLSearchParams({ norme_id: String(normeId) });
    if (serviceIds && serviceIds.length) {
      params.set('service_ids', serviceIds.join(','));
    }
    const res = await requestJson(`api/get_lignes.php?${params.toString()}`, {
      defaultError: 'Chargement des criteres impossible',
    });
    return res.data ?? [];
  },
  async createAudit(payload) {
    return requestJson('api/create_audit.php', {
      method: 'POST',
      body: payload,
      defaultError: 'Creation de l audit impossible',
    });
  },
  async saveAuditResults(audit_id, resultats) {
    return requestJson('api/save_audit.php', {
      method: 'POST',
      body: { type: 'results', audit_id, resultats },
      defaultError: 'Sauvegarde impossible',
    });
  },
  async getUsers() {
    const res = await requestJson('api/get_users.php', {
      defaultError: 'Chargement des utilisateurs impossible',
    });
    return res.data ?? [];
  },
};

const state = {
  normeId: null,
  serviceIds: [],
  selectedLigneIds: new Set(),
  lastRows: [],
  auditId: null,
  users: [],
};

const normeSelect = $('#normeSelect');
const serviceSelect = $('#serviceSelect');
const auditeurSelect = $('#auditeurSelect');
const btnServicesSelectAll = $('#btnServicesSelectAll');
const btnServicesClear = $('#btnServicesClear');
const lignesContainer = $('#lignesContainer');

const btnSelectAllRows = $('#btnSelectAllRows');
const btnClearRows = $('#btnClearRows');
const btnGenerate = $('#btnGenerate');
const btnExportPdf = $('#btnExportPdf');

const auditSection = $('#auditSection');
const auditMeta = $('#auditMeta');
const auditTable = $('#auditTable');
const btnCancelAudit = $('#btnCancelAudit');
const btnSaveAudit = $('#btnSaveAudit');

init();

function bindEvents() {
  normeSelect.addEventListener('change', () => safeCall(onNormeChange));
  serviceSelect.addEventListener('change', () => safeCall(onServicesChange));
  btnServicesSelectAll.addEventListener('click', () => safeCall(() => setServiceSelection(true)));
  btnServicesClear.addEventListener('click', () => safeCall(() => setServiceSelection(false)));
  btnSelectAllRows.addEventListener('click', () => toggleAllRows(true));
  btnClearRows.addEventListener('click', () => toggleAllRows(false));
  btnGenerate.addEventListener('click', () => safeCall(generateAudit));
  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => safeCall(exportPdf));
  }
  btnCancelAudit.addEventListener('click', cancelAudit);
  btnSaveAudit.addEventListener('click', () => safeCall(saveAudit));
}

async function init() {
  bindEvents();
  await safeCall(loadInitialData);
}

async function loadInitialData() {
  const [normes, services, users] = await Promise.all([
    api.getNormes(),
    api.getAllServices(),
    api.getUsers(),
  ]);

  normeSelect.innerHTML = '<option value="">-- Selectionner une norme --</option>';
  normes.forEach((n) => {
    const option = document.createElement('option');
    const dateTxt = n.date_norme ? ` - ${n.date_norme}` : '';
    option.value = n.id;
    option.textContent = `${n.libelle} (${n.code})${dateTxt}`;
    normeSelect.appendChild(option);
  });

  serviceSelect.innerHTML = '';
  services.forEach((s) => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = s.nom;
    serviceSelect.appendChild(option);
  });
  setServiceControlsDisabled(true);

  state.users = users;
  populateAuditeurSelect(users);
}

async function onNormeChange() {
  state.normeId = normeSelect.value ? Number(normeSelect.value) : null;
  state.selectedLigneIds.clear();
  state.serviceIds = [];
  $$('#serviceSelect option').forEach((opt) => {
    opt.selected = false;
  });
  setServiceControlsDisabled(!state.normeId);
  await refreshLignes();
}

async function onServicesChange() {
  state.serviceIds = $$('#serviceSelect option:checked').map((opt) => Number(opt.value));
  state.selectedLigneIds.clear();
  await refreshLignes();
}

async function refreshLignes() {
  if (!state.normeId) {
    lignesContainer.innerHTML = '<div class="empty">En attente de selection...</div>';
    toggleActionButtons(false);
    return;
  }
  try {
    const rows = await api.getLignes({
      normeId: state.normeId,
      serviceIds: state.serviceIds,
    });
    const normalized = rows.map((row) => ({
      ...row,
      id: Number(row.id),
    }));
    const allowedIds = new Set(normalized.map((r) => r.id));
    Array.from(state.selectedLigneIds).forEach((id) => {
      if (!allowedIds.has(id)) {
        state.selectedLigneIds.delete(id);
      }
    });
    state.lastRows = normalized;
    renderLignesTable(normalized);
    if (btnExportPdf) {
      btnExportPdf.disabled = normalized.length === 0;
    }
  } catch (err) {
    notifyError(err, 'Impossible de charger les criteres');
    lignesContainer.innerHTML = '<div class="empty">Erreur lors du chargement.</div>';
    state.lastRows = [];
    state.selectedLigneIds.clear();
    toggleActionButtons(false);
    if (btnExportPdf) btnExportPdf.disabled = true;
  }
}

function renderLignesTable(rows) {
  if (!rows.length) {
    lignesContainer.innerHTML = '<div class="empty">Aucune ligne pour ce filtre.</div>';
    toggleActionButtons(false);
    return;
  }
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th style="width:40px"><input type="checkbox" id="chkHeader" /></th>
        <th style="width:120px">Code</th>
        <th>Intitule</th>
        <th style="width:180px">Service</th>
        <th style="width:100px">Obligatoire</th>
        <th style="width:90px">Poids</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  rows.forEach((l) => {
    const tr = document.createElement('tr');
    const id = Number(l.id);
    tr.innerHTML = `
      <td><input class="rowChk" type="checkbox" data-id="${id}" ${state.selectedLigneIds.has(id) ? 'checked' : ''}></td>
      <td>${l.code ?? ''}</td>
      <td>${escapeHtml(l.intitule ?? '')}</td>
      <td>${escapeHtml(l.service_nom ?? '')}</td>
      <td>${Number(l.obligatoire) ? 'Oui' : 'Non'}</td>
      <td>${l.poids ?? ''}</td>
    `;
    tbody.appendChild(tr);
  });

  lignesContainer.innerHTML = '';
  lignesContainer.appendChild(table);
  table.addEventListener('change', onRowCheckboxChange);

  const header = $('#chkHeader', table);
  header.addEventListener('change', () => {
    toggleAllRows(header.checked);
  });

  toggleActionButtons(true);
  setHeaderCheckboxState(table);
}

function onRowCheckboxChange(event) {
  const target = event.target;
  if (!target.classList.contains('rowChk')) return;
  const id = Number(target.dataset.id);
  if (target.checked) {
    state.selectedLigneIds.add(id);
  } else {
    state.selectedLigneIds.delete(id);
  }
  btnGenerate.disabled = !state.selectedLigneIds.size;
  setHeaderCheckboxState(target.closest('table'));
}

function toggleActionButtons(enable) {
  btnSelectAllRows.disabled = !enable;
  btnClearRows.disabled = !enable;
  btnGenerate.disabled = !enable || state.selectedLigneIds.size === 0;
  if (btnExportPdf) {
    btnExportPdf.disabled = !enable || !state.lastRows.length;
  }
}

function setHeaderCheckboxState(table) {
  if (!table) return;
  const total = $$('.rowChk', table).length;
  const checked = $$('.rowChk:checked', table).length;
  const header = $('#chkHeader', table);
  if (!header) return;
  header.indeterminate = checked > 0 && checked < total;
  header.checked = total > 0 && checked === total;
}

function toggleAllRows(on) {
  const table = $('table', lignesContainer);
  if (!table) return;
  $$('.rowChk', table).forEach((chk) => {
    chk.checked = on;
    const id = Number(chk.dataset.id);
    if (on) {
      state.selectedLigneIds.add(id);
    } else {
      state.selectedLigneIds.delete(id);
    }
  });
  btnGenerate.disabled = state.selectedLigneIds.size === 0;
  setHeaderCheckboxState(table);
}

function metaText() {
  const parts = [];
  const norme = $('#normeSelect option:checked')?.textContent?.trim();
  if (norme) parts.push(norme);
  const services = $$('#serviceSelect option:checked').map((opt) => opt.textContent.trim());
  if (services.length) parts.push(`Services: ${services.join(', ')}`);
  const auditeur = auditeurSelect ? auditeurSelect.value.trim() : '';
  if (auditeur) parts.push(`Auditeur: ${auditeur}`);
  const date = $('#dateAudit').value;
  if (date) parts.push(`Date: ${date}`);
  return parts.join(' - ');
}

async function generateAudit() {
  if (!state.normeId || state.selectedLigneIds.size === 0) {
    return;
  }
  const auditeurValue = auditeurSelect ? auditeurSelect.value || null : null;
  const payload = {
    norme_id: state.normeId,
    date_audit: $('#dateAudit').value || null,
    auditeur: auditeurValue,
    ligne_ids: Array.from(state.selectedLigneIds),
  };
  const res = await api.createAudit(payload);
  state.auditId = res.id;

  const rows = state.lastRows.filter((r) => state.selectedLigneIds.has(r.id));
  if (!rows.length) {
    notifyError(new Error('Aucune ligne a editer'), 'Aucune ligne a editer');
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th style="width:120px">Code</th>
        <th>Intitule</th>
        <th style="width:160px">Service</th>
        <th style="width:140px">Statut</th>
        <th style="width:90px">Score</th>
        <th style="width:260px">Commentaire</th>
        <th style="width:220px">Preuve</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  rows.forEach((l) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.code ?? ''}</td>
      <td>${escapeHtml(l.intitule ?? '')}</td>
      <td>${escapeHtml(l.service_nom ?? '')}</td>
      <td>
        <select data-k="statut" data-id="${l.id}">
          <option value="CONFORME">CONFORME</option>
          <option value="NON_CONFORME">NON_CONFORME</option>
          <option value="NA">NA</option>
          <option value="OBS">OBS</option>
        </select>
      </td>
      <td><input type="number" step="0.01" data-k="score" data-id="${l.id}" /></td>
      <td><input type="text" data-k="commentaire" data-id="${l.id}" /></td>
      <td><input type="text" placeholder="Lien / ref" data-k="preuve" data-id="${l.id}" /></td>
    `;
    tbody.appendChild(tr);
  });

  auditMeta.textContent = metaText();
  auditTable.innerHTML = '';
  auditTable.appendChild(table);
  auditSection.style.display = 'block';
  window.scrollTo({ top: auditSection.offsetTop - 10, behavior: 'smooth' });
}

async function saveAudit() {
  if (!state.auditId) return;
  const inputs = $$('#auditTable [data-k]');
  if (!inputs.length) {
    notifyError(new Error('Aucune ligne a sauvegarder'), 'Aucune ligne a sauvegarder');
    return;
  }
  const byId = {};
  inputs.forEach((el) => {
    const id = Number(el.dataset.id);
    const key = el.dataset.k;
    const value =
      el.tagName === 'SELECT'
        ? el.value
        : el.type === 'number'
        ? el.value !== ''
          ? Number(el.value)
          : null
        : el.value.trim();
    if (!byId[id]) {
      byId[id] = { ligne_id: id, statut: 'CONFORME', score: null, commentaire: '', preuve: '' };
    }
  byId[id][key] = value;
});
await api.saveAuditResults(state.auditId, Object.values(byId));
notify.success('Audit enregistré');
}

function cancelAudit() {
  state.auditId = null;
  auditSection.style.display = 'none';
  auditMeta.textContent = '';
  auditTable.innerHTML = '';
}

function notifyError(err, fallback) {
  console.error(err);
  notify.error(err?.message || fallback || 'Erreur inattendue');
}

async function safeCall(fn) {
  try {
    await fn();
  } catch (err) {
    notifyError(err);
  }
}

async function setServiceSelection(selectAll) {
  const options = $$('#serviceSelect option');
  if (!options.length) return;
  options.forEach((opt) => {
    opt.selected = selectAll;
  });
  state.serviceIds = selectAll ? options.map((opt) => Number(opt.value)) : [];
  state.selectedLigneIds.clear();
  await refreshLignes();
}

function setServiceControlsDisabled(disabled) {
  serviceSelect.disabled = disabled;
  btnServicesSelectAll.disabled = disabled;
  btnServicesClear.disabled = disabled;
  if (btnExportPdf) btnExportPdf.disabled = true;
}

function populateAuditeurSelect(users = []) {
  if (!auditeurSelect) return;
  auditeurSelect.innerHTML = '<option value="">— Choisir un utilisateur —</option>';
  users.forEach((user) => {
    const option = document.createElement('option');
    option.value = user.display_name;
    option.dataset.username = user.username;
    option.textContent = `${user.display_name} (${user.username})`;
    auditeurSelect.appendChild(option);
  });
}

async function exportPdf() {
  if (!state.normeId) {
    throw new Error('S\u00E9lectionnez une norme avant d\'exporter.');
  }
  if (!state.lastRows.length) {
    throw new Error('Aucun crit\u00E8re \u00E0 exporter.');
  }
  if (!window.jspdf || !window.jspdf.jsPDF || typeof buildAuditSheet !== 'function') {
    throw new Error('Module PDF introuvable.');
  }
  const rowsForPdf =
    state.selectedLigneIds.size > 0
      ? state.lastRows.filter((row) => state.selectedLigneIds.has(row.id))
      : state.lastRows.slice();
  if (!rowsForPdf.length) {
    throw new Error('Aucune ligne s\u00E9lectionn\u00E9e pour le PDF.');
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const normeLabel = $('#normeSelect option:checked')?.textContent?.trim() || `Norme ${state.normeId}`;
  const servicesLabel = selectedServicesText();
  const auditDate = $('#dateAudit').value || '____/____/______';
  const headerInfo = {
    auditLabel: 'Audit preparatoire',
    norme: normeLabel,
    service: servicesLabel || 'Tous',
    date: auditDate,
    statut: 'EN COURS',
    auditeur: auditeurSelect?.value || '____________',
  };
  const pdfRows = rowsForPdf.map((row) => ({
    code: row.code || '',
    critere: row.intitule || '',
    service: row.service_nom || '',
  }));
  buildAuditSheet(doc, { header: headerInfo, rows: pdfRows, showStatusMarks: false });
  const fileName = `audit_norme_${state.normeId}_${Date.now()}.pdf`;
  doc.save(fileName);
}

function selectedServicesText() {
  const labels = $$('#serviceSelect option:checked').map((opt) => opt.textContent.trim());
  if (labels.length) return labels.join(', ');
  const unique = Array.from(
    new Set(state.lastRows.map((r) => r.service_nom).filter(Boolean))
  );
  return unique.length ? unique.join(', ') : 'Tous';
}

function escapeHtml(s = '') {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}


