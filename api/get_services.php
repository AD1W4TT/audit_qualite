<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$norme_id = isset($_GET['norme_id']) ? (int)$_GET['norme_id'] : 0;
if ($norme_id <= 0) {
    echo json_encode(['ok' => true, 'data' => []]);
    return;
}

try {
    $sql = "SELECT DISTINCT s.id, s.nom
            FROM service s
            JOIN lignes l ON l.service_id = s.id
            WHERE l.norme_id = ?
            ORDER BY s.nom";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$norme_id]);
    echo json_encode(['ok' => true, 'data' => $stmt->fetchAll()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Impossible de recuperer les services',
        'detail' => $e->getMessage(),
    ]);
}
