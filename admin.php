<?php
require __DIR__ . '/api/session.php';
if (empty($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}
$userRole = isset($_SESSION['role']) ? strtoupper((string)$_SESSION['role']) : '';
if ($userRole !== 'ADMIN') {
    header('Location: index.php');
    exit;
}
$currentUser = !empty($_SESSION['display_name'])
    ? $_SESSION['display_name']
    : (!empty($_SESSION['username']) ? $_SESSION['username'] : 'Utilisateur');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AdiWatt - Administration</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <div class="wrap">
    <header>
      <div class="header-info">
        <h1>Console d'administration</h1>
        <p class="header-subtitle">Pilotage des audits et r&eacute;f&eacute;rentiels</p>
      </div>
      <span class="chip user-chip"><span class="chip-icon">&#128100;</span> <?php echo htmlspecialchars($currentUser, ENT_QUOTES, 'UTF-8'); ?></span>
      <div class="header-actions">
        <a class="btn btn-ghost" href="index.php">&larr; Retour</a>
        <a class="btn btn-ghost" href="logout.php">D&eacute;connexion</a>
      </div>
    </header>

    <nav class="tabs">
      <button class="tab active" data-tab="tab-audits">Audits</button>
      <button class="tab" data-tab="tab-ref">Référentiels</button>
      <button class="tab" data-tab="tab-users">Utilisateurs</button>
    </nav>

    <section id="tab-audits" class="panel tab-panel active">
      <div class="row-between">
        <h2>Audits</h2>
        <div class="toolbar">
          <button id="btnRefreshAudits" class="btn">Rafraîchir</button>
        </div>
      </div>
      <div id="auditList" class="table-wrap">
        <div class="empty">Aucun audit à afficher.</div>
      </div>
      <div class="hint">Un audit <b>CLOTURÉ</b> est verrouillé (lecture seule).</div>
    </section>

    <section id="tab-ref" class="panel tab-panel">
      <nav class="subtabs">
        <button class="subtab active" data-subtab="sub-normes">Normes</button>
        <button class="subtab" data-subtab="sub-services">Services</button>
        <button class="subtab" data-subtab="sub-lignes">Lignes</button>
        <button class="subtab" data-subtab="sub-edit-lignes">Modifier</button>
      </nav>

      <div id="sub-normes" class="subpanel active">
        <h3>Nouvelle norme</h3>
        <div class="grid-3 ref-form">
          <div>
            <label>Code</label>
            <input id="n_code" type="text" placeholder="ISO9001" />
          </div>
          <div>
            <label>Libellé</label>
            <input id="n_libelle" type="text" placeholder="ISO 9001:2015" />
          </div>
          <div>
            <label>Date d'entrée en vigueur</label>
            <input id="n_date" type="date" />
          </div>
        </div>
        <button id="btnAddNorme" class="btn btn-accent" style="margin-top:10px">Ajouter la norme</button>
      </div>

      <div id="sub-services" class="subpanel">
        <h3>Nouveau service</h3>
        <div class="grid-3 ref-form tight" style="grid-template-columns: 1fr 240px 1fr;">
          <div>
            <label>Nom</label>
            <input id="s_nom" type="text" placeholder="Qualité" />
          </div>
          <div style="display:flex;align-items:flex-end">
            <button id="btnAddService" class="btn btn-accent" style="width:100%">Ajouter</button>
          </div>
          <div class="info-card">Ex. : RH, QSE, Production...</div>
        </div>
      </div>

      <div id="sub-lignes" class="subpanel">
        <h3>Nouvelle ligne (critère)</h3>
        <div class="grid-3 ref-form tight">
          <div>
            <label>Norme</label>
            <select id="l_norme"></select>
          </div>
          <div>
            <label>Services concernés</label>
            <div id="servicesChecklist" class="checklist"></div>
            <div class="hint">Laisser vide → la ligne sera créée pour <b>tous</b> les services.</div>
          </div>
          <div>
            <label>Code</label>
            <input id="l_code" type="text" placeholder="8.5.1" />
          </div>
        </div>

        <div class="grid-3 ref-form tight">
          <div>
            <label>Intitulé</label>
            <input id="l_intitule" type="text" placeholder="Maîtrise de la production" />
          </div>
          <div>
            <label>Obligatoire</label>
            <select id="l_obl">
              <option value="1" selected>Oui</option>
              <option value="0">Non</option>
            </select>
          </div>
          <div>
            <label>Poids</label>
            <input id="l_poids" type="number" step="0.01" placeholder="1.00" />
          </div>
        </div>

        <div class="grid-3 ref-form tight ref-actions" style="grid-template-columns: 1fr 1fr;">
          <div>
            <label>Ordre</label>
            <input id="l_ordre" type="number" placeholder="1" />
          </div>
          <div class="form-action">
            <button id="btnAddLigne" class="btn btn-accent">Ajouter la ligne</button>
          </div>
        </div>

        <div id="lignesPreview" class="line-preview">
          <div class="empty">Sélectionnez une norme pour visualiser les lignes existantes.</div>
        </div>
      </div>

      <div id="sub-edit-lignes" class="subpanel">
        <h3>Modifier les lignes</h3>
        <div class="grid-3 ref-form">
          <div>
            <label>Norme</label>
            <select id="edit_norme"></select>
          </div>
          <div>
            <label>Service</label>
            <select id="edit_service">
              <option value="">Tous</option>
            </select>
          </div>
          <div style="display:flex;align-items:flex-end">
            <button id="btnReloadEdit" class="btn" style="width:100%">Actualiser</button>
          </div>
        </div>

        <div id="lignesEditTable" class="table-wrap" style="margin-top:18px;">
          <div class="empty">Choisissez une norme pour commencer.</div>
        </div>
      </div>
    </section>

    <section id="tab-users" class="panel tab-panel">
      <div class="row-between">
        <h2>Utilisateurs</h2>
        <div class="toolbar">
          <button id="btnRefreshUsers" class="btn">Rafraichir</button>
        </div>
      </div>
      <div id="usersTable" class="table-wrap">
        <div class="empty">Chargement des utilisateurs...</div>
      </div>
      <div class="hint">Utilisez les actions pour donner ou retirer le role administrateur.</div>
    </section>
  </div>

  <script src="js/feedback.js"></script>
  <script src="js/admin.js"></script>
</body>
</html>


