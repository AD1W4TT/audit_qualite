<?php
require __DIR__ . '/session.php';
require __DIR__ . '/db.php';
require __DIR__ . '/password_helper.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['ok' => false, 'error' => 'Payload invalide']);
    return;
}

$username = isset($input['username']) ? strtolower(trim($input['username'])) : '';
$displayName = isset($input['display_name']) ? trim($input['display_name']) : '';
$password = isset($input['password']) ? (string)$input['password'] : '';

if ($username === '' || $displayName === '' || $password === '') {
    echo json_encode(['ok' => false, 'error' => 'Tous les champs sont requis']);
    return;
}
if (!preg_match('/^[a-z0-9_.-]{3,}$/', $username)) {
    echo json_encode(['ok' => false, 'error' => 'Nom d utilisateur invalide']);
    return;
}
if (strlen($password) < 6) {
    echo json_encode(['ok' => false, 'error' => 'Mot de passe trop court (6 caracteres minimum)']);
    return;
}

try {
    $stmt = $pdo->prepare('SELECT TOP 1 id FROM utilisateur WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        echo json_encode(['ok' => false, 'error' => 'Nom d utilisateur deja utilise']);
        return;
    }

    $hash = make_password_hash($password);
    $insert = $pdo->prepare("INSERT INTO utilisateur (username, display_name, password_hash, role) VALUES (?, ?, ?, 'USER')");
    $insert->execute([$username, $displayName, $hash]);
    $userId = (int)$pdo->lastInsertId();

    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $username;
    $_SESSION['display_name'] = $displayName;
    $_SESSION['role'] = 'USER';

    echo json_encode([
        'ok' => true,
        'user' => [
            'id' => $userId,
            'username' => $username,
            'display_name' => $displayName,
            'role' => 'USER',
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
