<?php
require __DIR__ . '/db.php';
require __DIR__ . '/admin_guard.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Payload invalide']);
    exit;
}

$userId = isset($input['user_id']) ? (int)$input['user_id'] : 0;
$role = isset($input['role']) ? strtoupper(trim((string)$input['role'])) : '';
$allowedRoles = ['ADMIN', 'USER'];
if ($userId <= 0 || !in_array($role, $allowedRoles, true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Parametres invalides']);
    exit;
}

try {
    $stmt = $pdo->prepare('UPDATE utilisateur SET role = ? WHERE id = ?');
    $stmt->execute([$role, $userId]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Utilisateur introuvable']);
        exit;
    }

    if (!empty($_SESSION['user_id']) && (int)$_SESSION['user_id'] === $userId) {
        $_SESSION['role'] = $role;
    }

    echo json_encode([
        'ok' => true,
        'user' => [
            'id' => $userId,
            'role' => $role,
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
