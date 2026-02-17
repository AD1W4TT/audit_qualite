<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$norme_id = isset($_GET['norme_id']) ? (int)$_GET['norme_id'] : 0;
$service_ids_raw = isset($_GET['service_ids']) ? trim($_GET['service_ids']) : '';
if ($norme_id <= 0) {
    echo json_encode(['ok' => true, 'data' => []]);
    return;
}

$params = [$norme_id];
$where = " WHERE l.norme_id = ? ";
if ($service_ids_raw !== '') {
    $service_ids = [];
    foreach (explode(',', $service_ids_raw) as $tok) {
        $v = (int) trim($tok);
        if ($v > 0) {
            $service_ids[] = $v;
        }
    }
    if ($service_ids) {
        $in = implode(',', array_fill(0, count($service_ids), '?'));
        $where .= " AND l.service_id IN ($in) ";
        $params = array_merge($params, $service_ids);
    }
}

try {
    $sql = "SELECT l.id, l.code, l.intitule, l.obligatoire, l.poids, l.ordre,
                   l.norme_id, l.service_id, s.nom AS service_nom
            FROM lignes l
            JOIN service s ON s.id = l.service_id
            $where
            ORDER BY CASE WHEN l.ordre IS NULL THEN 1 ELSE 0 END, l.ordre, l.id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode(['ok' => true, 'data' => $stmt->fetchAll()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Impossible de recuperer les lignes',
        'detail' => $e->getMessage(),
    ]);
}
