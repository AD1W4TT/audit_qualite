<?php
require __DIR__ . '/api/session.php';
if (empty($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}
$isAdmin = isset($_SESSION['role']) && strtoupper((string)$_SESSION['role']) === 'ADMIN';
$currentUser = !empty($_SESSION['display_name'])
    ? $_SESSION['display_name']
    : (!empty($_SESSION['username']) ? $_SESSION['username'] : 'Utilisateur');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AdiWatt Audit</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <div class="wrap">
    <header>
      <div class="header-info">
        <h1>AdiWatt Audit</h1>
        <p class="header-subtitle">Plateforme d'audit interne</p>
      </div>
      <span class="chip user-chip"><span class="chip-icon">&#128100;</span> <?php echo htmlspecialchars($currentUser, ENT_QUOTES, 'UTF-8'); ?></span>
      <div class="header-actions">
        <?php if ($isAdmin): ?>
        <a class="btn btn-ghost" href="admin.php">Espace admin</a>
        <?php endif; ?>
        <a class="btn btn-ghost" href="logout.php">D&eacute;connexion</a>
      </div>
    </header>

    <section class="panel">
      <h2>Lancer un audit</h2>
      <div class="grid-3">
        <div>
          <label>Norme</label>
          <select id="normeSelect">
            <option value="">- Sélectionner une norme -</option>
          </select>
          <div class="hint">Inclut la date d'entrée en vigueur.</div>
        </div>
        <div>
          <label>Services (multi)</label>
          <select id="serviceSelect" class="compact-select" multiple size="4" disabled></select>
          <div class="hint">Ctrl/Cmd + clic pour multi-sélection</div>
          <div class="mini-actions">
            <button type="button" class="btn btn-ghost btn-xs" id="btnServicesSelectAll" disabled>Tout sélectionner</button>
            <button type="button" class="btn btn-ghost btn-xs" id="btnServicesClear" disabled>Tout désélectionner</button>
          </div>
        </div>
        <div>
          <label>Auditeur</label>
          <select id="auditeurSelect">
            <option value="">- Choisir un utilisateur -</option>
          </select>
          <label style="margin-top:8px">Date d'audit</label>
          <input id="dateAudit" type="date" />
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="row-between">
        <h2>Critères de la norme</h2>
        <div class="toolbar">
          <button id="btnSelectAllRows" class="btn" disabled>Tout cocher</button>
          <button id="btnClearRows" class="btn" disabled>Tout décocher</button>
          <button id="btnGenerate" class="btn btn-accent" disabled>Générer l'audit</button>
          <button id="btnExportPdf" class="btn btn-ghost" disabled>PDF papier</button>
        </div>
      </div>
      <div id="lignesContainer" class="table-wrap">
        <div class="empty">En attente de sélection.</div>
      </div>
    </section>

    <section id="auditSection" class="panel" style="display:none;">
      <div class="row-between">
        <h2>Audit en cours</h2>
        <div class="toolbar">
          <button id="btnCancelAudit" class="btn">Annuler</button>
          <button id="btnSaveAudit" class="btn btn-accent">Enregistrer</button>
        </div>
      </div>
      <div id="auditMeta" class="badge"></div>
      <div id="auditTable" class="table-wrap"></div>
      <div class="footer">L'enregistrement écrit en base : <code>audit</code> + <code>audit_resultat</code>.</div>
    </section>
  </div>

  <script src="js/jspdf.umd.min.js"></script>
  <script src="js/pdf_template.js"></script>
  <script src="js/feedback.js"></script>
  <script src="js/app.js"></script>
</body>
</html>


