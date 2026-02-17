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
$code = isset($input['code']) ? trim($input['code']) : '';
$intitule = isset($input['intitule']) ? trim($input['intitule']) : '';
$obligatoire = !empty($input['obligatoire']) ? 1 : 0;
$poids = (isset($input['poids']) && $input['poids'] !== '') ? (float)$input['poids'] : null;
$ordre = (isset($input['ordre']) && $input['ordre'] !== '') ? (int)$input['ordre'] : null;

if ($norme_id <= 0 || $intitule === '') {
    echo json_encode(['ok' => false, 'error' => 'Norme et intitule requis']);
    return;
}

$service_ids = isset($input['service_ids']) ? $input['service_ids'] : [];
if (!is_array($service_ids)) {
    $service_ids = [];
}
$service_ids = array_values(array_unique(array_filter(
    array_map('intval', $service_ids),
    function ($v) {
        return $v > 0;
    }
)));

try {
    if (!$service_ids) {
        $rows = $pdo->query("SELECT id FROM service ORDER BY id")->fetchAll();
        $service_ids = [];
        foreach ($rows as $row) {
            if (isset($row['id'])) {
                $service_ids[] = (int)$row['id'];
            }
        }
    }
    if (!$service_ids) {
        echo json_encode(['ok' => false, 'error' => 'Aucun service disponible']);
        return;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO lignes (norme_id, service_id, code, intitule, obligatoire, poids, ordre)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    $created = 0;
    foreach ($service_ids as $sid) {
        $stmt->execute([
            $norme_id,
            (int) $sid,
            $code !== '' ? $code : null,
            $intitule,
            $obligatoire,
            $poids,
            $ordre,
        ]);
        $created++;
    }

    echo json_encode(['ok' => true, 'created' => $created]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
