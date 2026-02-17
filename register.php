<?php
require __DIR__ . '/api/session.php';
if (!empty($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Créer un compte — Audits internes</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body class="login-body">
  <div class="login-wrap">
    <div class="login-card">
      <h1>Créer un compte</h1>
      <p class="login-subtitle">Enregistrez-vous pour accéder à l’espace audits.</p>
      <form id="registerForm">
        <label>Nom complet</label>
        <input type="text" id="displayName" required />
        <label>Nom d’utilisateur</label>
        <input type="text" id="regUsername" autocomplete="username" required />
        <label>Mot de passe</label>
        <input type="password" id="regPassword" autocomplete="new-password" required />
        <button class="btn btn-accent login-btn" type="submit">S’inscrire</button>
      </form>
      <div id="registerError" class="login-error" style="display:none;"></div>
      <p class="auth-switch">Déjà un compte ? <a href="login.php">Se connecter</a>.</p>
    </div>
  </div>
  <script src="js/register.js"></script>
</body>
</html>
