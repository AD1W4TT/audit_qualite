<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$norme_id = isset($_GET['norme_id']) ? (int)$_GET['norme_id'] : 0;
if ($norme_id <= 0) {
    echo json_encode(['ok' => true, 'data' => []]);
    return;
}

$service_ids_raw = isset($_GET['service_ids']) ? trim($_GET['service_ids']) : '';
$service_filter = [];
if ($service_ids_raw !== '') {
    foreach (explode(',', $service_ids_raw) as $token) {
        $val = (int)trim($token);
        if ($val > 0) {
            $service_filter[] = $val;
        }
    }
}

$params = [$norme_id];
$where = 'WHERE l.norme_id = ?';
if ($service_filter) {
    $placeholders = implode(',', array_fill(0, count($service_filter), '?'));
    $where .= " AND l.service_id IN ($placeholders)";
    $params = array_merge($params, $service_filter);
}

$sql = "SELECT l.id, l.norme_id, l.code, l.intitule, l.obligatoire, l.poids, l.ordre,
               l.service_id, s.nom AS service_nom
        FROM lignes l
        JOIN service s ON s.id = l.service_id
        $where
        ORDER BY COALESCE(l.ordre, 9999), l.id";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $groups = [];
    foreach ($rows as $row) {
        $key = md5(
            $row['code'].'|'.$row['intitule'].'|'.$row['obligatoire'].'|'.
            (string)$row['poids'].'|'.(string)$row['ordre']
        );
        if (!isset($groups[$key])) {
            $groups[$key] = [
                'norme_id' => (int)$row['norme_id'],
                'code' => $row['code'],
                'intitule' => $row['intitule'],
                'obligatoire' => (int)$row['obligatoire'],
                'poids' => $row['poids'],
                'ordre' => $row['ordre'],
                'line_ids' => [],
                'service_ids' => [],
                'services' => [],
            ];
        }
        $groups[$key]['line_ids'][] = (int)$row['id'];
        $serviceId = (int)$row['service_id'];
        $groups[$key]['service_ids'][] = $serviceId;
        $groups[$key]['services'][] = [
            'id' => $serviceId,
            'nom' => $row['service_nom'],
        ];
    }

    foreach ($groups as &$group) {
        $seen = [];
        $uniqueServices = [];
        foreach ($group['services'] as $srv) {
            $sid = (int)$srv['id'];
            if (!isset($seen[$sid])) {
                $uniqueServices[] = [
                    'id' => $sid,
                    'nom' => $srv['nom'],
                ];
                $seen[$sid] = true;
            }
        }
        $group['services'] = $uniqueServices;
        $group['service_ids'] = array_values(array_unique($group['service_ids']));
    }
    unset($group);

    $data = array_values($groups);
    usort($data, function ($a, $b) {
        $ordA = $a['ordre'] === null ? 9999 : (int)$a['ordre'];
        $ordB = $b['ordre'] === null ? 9999 : (int)$b['ordre'];
        if ($ordA === $ordB) {
            return strcmp((string)$a['code'], (string)$b['code']);
        }
        return $ordA - $ordB;
    });

    echo json_encode(['ok' => true, 'data' => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
