<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $stmt = $pdo->query("SELECT id, code, libelle, date_norme FROM norme ORDER BY libelle");
    echo json_encode(['ok' => true, 'data' => $stmt->fetchAll()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Impossible de recuperer les normes',
        'detail' => $e->getMessage(),
    ]);
}
