<?php
require __DIR__ . '/api/session.php';
if (empty($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}
$currentUser = 'Utilisateur';
if (!empty($_SESSION['display_name'])) {
    $currentUser = $_SESSION['display_name'];
} elseif (!empty($_SESSION['username'])) {
    $currentUser = $_SESSION['username'];
}
$isAdmin = !empty($_SESSION['role']) && $_SESSION['role'] === 'ADMIN';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AdiWatt - &Eacute;dition de l'audit</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <div class="wrap">
    <header>
      <div class="header-info">
        <h1>&Eacute;dition de l'audit</h1>
        <p class="header-subtitle">Mise &agrave; jour du dossier de contr&ocirc;le</p>
      </div>
      <span class="chip user-chip"><span class="chip-icon">&#128100;</span> <?php echo htmlspecialchars($currentUser, ENT_QUOTES, 'UTF-8'); ?></span>
      <div class="header-actions">
        <?php if ($isAdmin): ?>
        <a class="btn btn-ghost" href="admin.php">&larr; Admin</a>
        <?php endif; ?>
        <a class="btn btn-ghost" href="logout.php">D&eacute;connexion</a>
      </div>
    </header>

    <section class="panel">
      <h2 id="auditTitle">Audit #</h2>
      <div class="grid-3">
        <div>
          <label>Norme</label>
          <input id="normeInfo" type="text" disabled />
        </div>
        <div>
          <label>Date d'audit</label>
          <input id="dateAudit" type="date" />
        </div>
        <div>
          <label>Auditeur</label>
          <select id="auditeurSelect">
            <option value="">-- Choisir --</option>
          </select>
        </div>
      </div>
      <div style="margin-top:10px">
        <label>Statut</label>
        <select id="statut">
          <option value="BROUILLON">BROUILLON</option>
          <option value="EN_COURS">EN_COURS</option>
          <option value="CLOTURE">CLOTURE</option>
        </select>
      </div>
      <div class="toolbar" style="margin-top:10px">
        <button type="button" id="btnSaveHeader" class="btn btn-accent">Enregistrer l'ent&ecirc;te</button>
        <button type="button" id="btnFinalize" class="btn">Finaliser</button>
        <button type="button" id="btnAuditPdf" class="btn btn-ghost">Exporter PDF</button>
      </div>
    </section>

    <section class="panel">
      <h2>R&eacute;sultats</h2>
      <div id="resultsTable" class="table-wrap">
        <div class="empty">Chargement...</div>
      </div>
      <div class="toolbar" style="margin-top:10px">
        <button type="button" id="btnSaveResults" class="btn btn-accent">Enregistrer les r&eacute;sultats</button>
      </div>
    </section>
  </div>

  <script src="js/jspdf.umd.min.js"></script>
  <script src="js/pdf_template.js"></script>
  <script src="js/feedback.js"></script>
  <script src="js/edit_audit.js"></script>
</body>
</html>
