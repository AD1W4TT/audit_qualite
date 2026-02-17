<?php
require __DIR__ . '/api/session.php';
if (!empty($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}
$expired = isset($_GET['expired']);
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connexion — Audits internes</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body class="login-body">
  <div class="login-wrap">
    <div class="login-card">
      <h1>Connexion</h1>
      <p class="login-subtitle">Identifiez-vous pour accéder aux audits.</p>
      <?php if ($expired): ?>
        <div class="login-alert">Session expirée. Merci de vous reconnecter.</div>
      <?php endif; ?>
      <form id="loginForm">
        <label>Nom d’utilisateur</label>
        <input type="text" id="username" autocomplete="username" required />
        <label>Mot de passe</label>
        <input type="password" id="password" autocomplete="current-password" required />
        <button class="btn btn-accent login-btn" type="submit">Se connecter</button>
      </form>
      <div id="loginError" class="login-error" style="display:none;"></div>
      <p class="auth-switch">Pas encore de compte ? <a href="register.php">Créer un compte utilisateur</a>.</p>
    </div>
  </div>
  <script src="js/login.js"></script>
</body>
</html>
