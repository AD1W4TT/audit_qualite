<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['ok' => false, 'error' => 'Payload invalide']);
    return;
}

$nom = isset($input['nom']) ? trim($input['nom']) : '';
if ($nom === '') {
    echo json_encode(['ok' => false, 'error' => 'Nom requis']);
    return;
}

try {
    $stmt = $pdo->prepare("INSERT INTO service (nom) VALUES (?)");
    $stmt->execute([$nom]);
    echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
