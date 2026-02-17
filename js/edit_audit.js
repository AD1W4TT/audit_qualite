const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

const qs = new URLSearchParams(location.search);
const auditId = Number(qs.get('id') || 0);
const auditeurSelect = $('#auditeurSelect');
const btnAuditPdf = $('#btnAuditPdf');
let cachedUsers = [];
let currentAuditHeader = null;
let currentAuditResults = [];

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
  getAudit(id) {
    return requestJson(`api/get_audit.php?id=${encodeURIComponent(id)}`, {
      defaultError: 'Impossible de charger l audit',
    });
  },
  saveHeader(payload) {
    return requestJson('api/save_audit.php', {
      method: 'POST',
      body: payload,
      defaultError: 'Impossible d enregistrer l en-tete',
    });
  },
  saveResults(payload) {
    return requestJson('api/save_audit.php', {
      method: 'POST',
      body: payload,
      defaultError: 'Impossible d enregistrer les resultats',
    });
  },
  async getUsers() {
    const res = await requestJson('api/get_users.php', {
      defaultError: 'Impossible de charger les utilisateurs',
    });
    return res.data ?? [];
  },
};

init();

async function init() {
  if (!auditId) {
    notify.error('Audit inconnu');
    location.href = 'admin.php';
    return;
  }
  bindActions();
  try {
    await fetchAuditData();
  } catch (err) {
    notifyError(err);
    location.href = 'admin.php';
  }
}

async function fetchAuditData() {
  const [users, data] = await Promise.all([api.getUsers(), api.getAudit(auditId)]);
  cachedUsers = users;
  currentAuditHeader = data.header;
  currentAuditResults = data.results || [];
  populateAuditeurSelect(users, currentAuditHeader.auditeur || '');
  renderHeader(currentAuditHeader);
  renderResults(currentAuditResults);
  setPdfButtonEnabled(currentAuditResults.length > 0);
  setLocked(data.header.statut === 'CLOTURE');
}

function bindActions() {
  $('#btnSaveHeader').addEventListener('click', () => safeCall(saveHeader));
  $('#btnSaveResults').addEventListener('click', () => safeCall(saveResults));
  $('#btnFinalize').addEventListener('click', () => safeCall(finalizeAudit));
  if (btnAuditPdf) {
    btnAuditPdf.addEventListener('click', () => safeCall(exportAuditPdf));
  }
}

async function saveHeader() {
  if (isLocked()) return;
  const payload = {
    type: 'header',
    audit_id: auditId,
    date_audit: $('#dateAudit').value || null,
    auditeur: auditeurSelect.value || null,
    statut: $('#statut').value,
  };
  await api.saveHeader(payload);
  notify.success('En-tête enregistré');
  await fetchAuditData();
}

async function finalizeAudit() {
  if (isLocked()) return;
  await api.saveHeader({ type: 'header', audit_id: auditId, statut: 'CLOTURE' });
  notify.success('Audit finalisé');
  await fetchAuditData();
}

async function saveResults() {
  if (isLocked()) return;
  const rows = collectResults();
  if (!rows.length) {
    throw new Error('Aucune ligne a enregistrer');
  }
  await api.saveResults({ type: 'results', audit_id: auditId, resultats: rows });
  notify.success('Résultats enregistrés');
  await fetchAuditData();
}

async function exportAuditPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF || typeof buildAuditSheet !== 'function') {
    throw new Error('Module PDF introuvable');
  }
  if (!currentAuditHeader) {
    throw new Error('Audit introuvable');
  }
  if (!currentAuditResults.length) {
    throw new Error('Aucune ligne a imprimer');
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const header = currentAuditHeader;
  const normeLabel = `${header.norme_libelle || ''} (${header.norme_code || ''})`.trim();
  const servicesLabel =
    Array.from(new Set(currentAuditResults.map((r) => r.service_nom).filter(Boolean))).join(', ') ||
    'Tous';
  const headerInfo = {
    auditLabel: `Audit #${header.id}`,
    norme: normeLabel,
    service: servicesLabel,
    date: header.date_audit || '-',
    statut: header.statut,
    auditeur: header.auditeur || '-',
  };
  const pdfRows = currentAuditResults.map((row) => {
    const parts = [];
    if (row.commentaire) parts.push(row.commentaire);
    if (row.preuve) parts.push(`Preuve : ${row.preuve}`);
    return {
      code: row.ligne_code || '',
      critere: row.ligne_intitule || '',
      service: row.service_nom || '',
      statut: row.statut || '',
      commentaire: parts.join('\n'),
    };
  });
  buildAuditSheet(doc, { header: headerInfo, rows: pdfRows, showStatusMarks: true });
  const fileName = `audit_${header.id}_${Date.now()}.pdf`;
  doc.save(fileName);
}

function renderHeader(h) {
  $('#auditTitle').textContent = `Audit #${h.id}`;
  const normeLabel = `${h.norme_libelle || ''} (${h.norme_code || ''})${
    h.date_norme ? ` - ${h.date_norme}` : ''
  }`.trim();
  $('#normeInfo').value = normeLabel;
  $('#dateAudit').value = h.date_audit || '';
  auditeurSelect.value = h.auditeur || '';
  $('#statut').value = h.statut;
}

function renderResults(rows) {
  const wrapper = $('#resultsTable');
  if (!rows.length) {
    wrapper.innerHTML = '<div class="empty">Aucune ligne.</div>';
    setPdfButtonEnabled(false);
    return;
  }
  setPdfButtonEnabled(true);
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
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.ligne_code ?? ''}</td>
      <td>${escapeHtml(row.ligne_intitule ?? '')}</td>
      <td>${escapeHtml(row.service_nom ?? '')}</td>
      <td>
        <select data-k="statut" data-id="${row.ligne_id}">
          <option value="CONFORME" ${row.statut === 'CONFORME' ? 'selected' : ''}>CONFORME</option>
          <option value="NON_CONFORME" ${row.statut === 'NON_CONFORME' ? 'selected' : ''}>NON_CONFORME</option>
          <option value="NA" ${row.statut === 'NA' ? 'selected' : ''}>NA</option>
          <option value="OBS" ${row.statut === 'OBS' ? 'selected' : ''}>OBS</option>
        </select>
      </td>
      <td><input type="number" step="0.01" data-k="score" data-id="${row.ligne_id}" value="${row.score ?? ''}"></td>
      <td><input type="text" data-k="commentaire" data-id="${row.ligne_id}" value="${escapeAttr(row.commentaire ?? '')}"></td>
      <td><input type="text" data-k="preuve" data-id="${row.ligne_id}" value="${escapeAttr(row.preuve ?? '')}" placeholder="Lien / ref"></td>
    `;
    tbody.appendChild(tr);
  });
  wrapper.innerHTML = '';
  wrapper.appendChild(table);
}

function collectResults() {
  const inputs = $$('#resultsTable [data-k]');
  const byId = {};
  inputs.forEach((el) => {
    const id = Number(el.dataset.id);
    if (!byId[id]) {
      byId[id] = { ligne_id: id, statut: 'CONFORME', score: null, commentaire: '', preuve: '' };
    }
    const key = el.dataset.k;
    let value;
    if (el.tagName === 'SELECT') {
      value = el.value;
    } else if (el.type === 'number') {
      value = el.value !== '' ? Number(el.value) : null;
    } else {
      value = el.value.trim();
    }
    byId[id][key] = value;
  });
  return Object.values(byId);
}

function populateAuditeurSelect(users, selected = '') {
  if (!auditeurSelect) return;
  auditeurSelect.innerHTML = '<option value="">— Choisir —</option>';
  users.forEach((user) => {
    const option = document.createElement('option');
    option.value = user.display_name;
    option.dataset.username = user.username;
    option.textContent = `${user.display_name} (${user.username})`;
    auditeurSelect.appendChild(option);
  });
  auditeurSelect.value = selected || '';
}

function setLocked(on) {
  $('#dateAudit').disabled = on;
  auditeurSelect.disabled = on;
  $('#statut').disabled = on;
  $$('#resultsTable select, #resultsTable input').forEach((el) => {
    el.disabled = on;
  });
  $('#btnSaveHeader').disabled = on;
  $('#btnSaveResults').disabled = on;
  $('#btnFinalize').disabled = on;
}

function setPdfButtonEnabled(enabled) {
  if (!btnAuditPdf) return;
  btnAuditPdf.disabled = !enabled;
}

function isLocked() {
  return $('#statut').value === 'CLOTURE';
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
  return str.replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
