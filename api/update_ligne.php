<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['ok' => false, 'error' => 'Payload invalide']);
    return;
}

$line_ids = isset($input['line_ids']) && is_array($input['line_ids']) ? array_filter(array_map('intval', $input['line_ids'])) : [];
$service_ids_new = isset($input['service_ids']) && is_array($input['service_ids'])
    ? array_values(array_unique(array_filter(array_map('intval', $input['service_ids']))))
    : [];

if (!$line_ids) {
    echo json_encode(['ok' => false, 'error' => 'Lignes manquantes']);
    return;
}
if (!$service_ids_new) {
    echo json_encode(['ok' => false, 'error' => 'Sélectionnez au moins un service']);
    return;
}

$code = array_key_exists('code', $input) ? trim((string)$input['code']) : null;
$intitule = array_key_exists('intitule', $input) ? trim((string)$input['intitule']) : null;
$obligatoire = !empty($input['obligatoire']) ? 1 : 0;
$poids = array_key_exists('poids', $input) && $input['poids'] !== '' ? (float)$input['poids'] : null;
$ordre = array_key_exists('ordre', $input) && $input['ordre'] !== '' ? (int)$input['ordre'] : null;

if ($intitule === null || $intitule === '') {
    echo json_encode(['ok' => false, 'error' => 'Intitulé requis']);
    return;
}

$placeholders = implode(',', array_fill(0, count($line_ids), '?'));
$stmt = $pdo->prepare("SELECT id, service_id, norme_id FROM lignes WHERE id IN ($placeholders)");
$stmt->execute($line_ids);
$existingRows = $stmt->fetchAll();

if (!$existingRows) {
    echo json_encode(['ok' => false, 'error' => 'Lignes introuvables']);
    return;
}
$norme_id = (int)$existingRows[0]['norme_id'];
$serviceMap = [];
foreach ($existingRows as $row) {
    $serviceMap[(int)$row['service_id']] = (int)$row['id'];
}

$updateSql = "UPDATE lignes SET code = ?, intitule = ?, obligatoire = ?, poids = ?, ordre = ? WHERE id = ?";
$updateStmt = $pdo->prepare($updateSql);
try {
    $pdo->beginTransaction();
    $codeValue = ($code === null || $code === '') ? null : $code;

    foreach ($serviceMap as $lineId) {
        $updateStmt->execute([
            $codeValue,
            $intitule,
            $obligatoire,
            $poids,
            $ordre,
            $lineId,
        ]);
    }

    $toRemove = array_diff(array_keys($serviceMap), $service_ids_new);
    if ($toRemove) {
        $removeIds = [];
        foreach ($toRemove as $sid) {
            if (isset($serviceMap[$sid])) {
                $removeIds[] = $serviceMap[$sid];
            }
        }
        if ($removeIds) {
            $placeholdersDel = implode(',', array_fill(0, count($removeIds), '?'));
            $delStmt = $pdo->prepare("DELETE FROM lignes WHERE id IN ($placeholdersDel)");
            $delStmt->execute($removeIds);
        }
    }

    $toAdd = array_diff($service_ids_new, array_keys($serviceMap));
    if ($toAdd) {
        $insStmt = $pdo->prepare(
            "INSERT INTO lignes (norme_id, service_id, code, intitule, obligatoire, poids, ordre)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($toAdd as $sid) {
            $insStmt->execute([
                $norme_id,
                (int)$sid,
                $codeValue,
                $intitule,
                $obligatoire,
                $poids,
                $ordre,
            ]);
        }
    }

    $pdo->commit();
    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
