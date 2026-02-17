<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['ok' => false, 'error' => 'Payload invalide']);
    return;
}

$code = isset($input['code']) ? trim($input['code']) : '';
$libelle = isset($input['libelle']) ? trim($input['libelle']) : '';
$date_norme = isset($input['date_norme']) ? trim((string)$input['date_norme']) : null;
if ($date_norme === '') {
    $date_norme = null;
}
if ($date_norme !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_norme)) {
    echo json_encode(['ok' => false, 'error' => 'Format de date invalide']);
    return;
}

if ($code === '' || $libelle === '') {
    echo json_encode(['ok' => false, 'error' => 'Code et libelle requis']);
    return;
}

try {
    $stmt = $pdo->prepare("INSERT INTO norme (code, libelle, date_norme) VALUES (?, ?, ?)");
    $stmt->execute([$code, $libelle, $date_norme]);
    echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
