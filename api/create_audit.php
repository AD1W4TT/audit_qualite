<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['ok' => false, 'error' => 'Payload invalide']);
    return;
}

$norme_id = isset($input['norme_id']) ? (int)$input['norme_id'] : 0;
$date_audit = isset($input['date_audit']) ? trim((string)$input['date_audit']) : '';
$auditeur = isset($input['auditeur']) ? trim((string)$input['auditeur']) : '';
$ligne_ids = isset($input['ligne_ids']) ? $input['ligne_ids'] : [];

if ($norme_id <= 0) {
    echo json_encode(['ok' => false, 'error' => 'Norme requise']);
    return;
}

$ligne_ids = array_values(array_unique(array_filter(
    array_map('intval', is_array($ligne_ids) ? $ligne_ids : []),
    function ($v) {
        return $v > 0;
    }
)));
if (!$ligne_ids) {
    echo json_encode(['ok' => false, 'error' => 'Aucune ligne selectionnee']);
    return;
}

if ($date_audit === '') {
    $date_audit = date('Y-m-d');
} elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_audit)) {
    echo json_encode(['ok' => false, 'error' => 'Format de date invalide']);
    return;
}

try {
    $placeholders = implode(',', array_fill(0, count($ligne_ids), '?'));
    $check = $pdo->prepare(
        "SELECT id FROM lignes WHERE norme_id = ? AND id IN ($placeholders)"
    );
    $check->execute(array_merge([$norme_id], $ligne_ids));
    $validIds = array_map('intval', $check->fetchAll(PDO::FETCH_COLUMN));
    if (count($validIds) !== count($ligne_ids)) {
        echo json_encode(['ok' => false, 'error' => 'Lignes invalides pour cette norme']);
        return;
    }

    $pdo->beginTransaction();
    $stmt = $pdo->prepare(
        "INSERT INTO audit (norme_id, date_audit, auditeur, statut)
         VALUES (?, ?, ?, 'EN_COURS')"
    );
    $stmt->execute([$norme_id, $date_audit, $auditeur !== '' ? $auditeur : null]);
    $audit_id = (int) $pdo->lastInsertId();

    $insert = $pdo->prepare(
        "INSERT INTO audit_resultat (audit_id, ligne_id, statut, score, commentaire, preuve)
         VALUES (?, ?, 'NA', NULL, NULL, NULL)"
    );
    foreach ($validIds as $lid) {
        $insert->execute([$audit_id, $lid]);
    }

    $pdo->commit();
    echo json_encode(['ok' => true, 'id' => $audit_id]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
