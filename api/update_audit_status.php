<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['ok' => false, 'error' => 'Payload invalide']);
    return;
}

$id = isset($input['id']) ? (int)$input['id'] : 0;
$statut = isset($input['statut']) ? (string)$input['statut'] : '';
$allowed = ['BROUILLON', 'EN_COURS', 'CLOTURE'];

if ($id <= 0 || !in_array($statut, $allowed, true)) {
    echo json_encode(['ok' => false, 'error' => 'Parametres invalides']);
    return;
}

try {
    $cur = $pdo->prepare("SELECT statut FROM audit WHERE id = ?");
    $cur->execute([$id]);
    $row = $cur->fetch();
    if (!$row) {
        echo json_encode(['ok' => false, 'error' => 'Audit introuvable']);
        return;
    }
    if ($row['statut'] === 'CLOTURE') {
        echo json_encode(['ok' => false, 'error' => 'Audit finalise, modification interdite']);
        return;
    }

    $upd = $pdo->prepare("UPDATE audit SET statut = ? WHERE id = ?");
    $upd->execute([$statut, $id]);
    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
