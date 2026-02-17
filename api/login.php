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

$username = isset($input['username']) ? trim($input['username']) : '';
$password = isset($input['password']) ? (string) $input['password'] : '';
if ($username === '' || $password === '') {
    echo json_encode(['ok' => false, 'error' => 'Identifiants requis']);
    return;
}

try {
    $stmt = $pdo->prepare('SELECT TOP 1 id, username, display_name, password_hash, role FROM utilisateur WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    if (!$user || !verify_password_hash($password, $user['password_hash'])) {
        echo json_encode(['ok' => false, 'error' => 'Identifiants incorrects']);
        return;
    }

    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['username'] = $user['username'];
$_SESSION['display_name'] = $user['display_name'];
$_SESSION['role'] = $user['role'];

    echo json_encode([
        'ok' => true,
        'user' => [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'display_name' => $user['display_name'],
            'role' => $user['role'],
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
