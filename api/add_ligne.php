<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
  echo json_encode(['ok' => false, 'error' => 'Payload invalide']); exit;
}

$norme_id   = isset($input['norme_id']) ? (int)$input['norme_id'] : 0;
$service_id = isset($input['service_id']) ? (int)$input['service_id'] : 0;
$code       = isset($input['code']) ? trim($input['code']) : '';
$intitule   = isset($input['intitule']) ? trim($input['intitule']) : '';
$obligatoire= isset($input['obligatoire']) ? (int)$input['obligatoire'] : 1;
$poids      = (isset($input['poids']) && $input['poids'] !== '') ? $input['poids'] : null;
$ordre      = (isset($input['ordre']) && $input['ordre'] !== '') ? (int)$input['ordre'] : null;

if ($norme_id <= 0 || $service_id <= 0 || $intitule === '') {
  echo json_encode(['ok'=>false, 'error'=>'Norme, Service et Intitulé sont requis']); exit;
}

try {
  $stmt = $pdo->prepare("INSERT INTO lignes (norme_id, service_id, code, intitule, obligatoire, poids, ordre)
                         VALUES (?, ?, ?, ?, ?, ?, ?)");
  $stmt->execute([$norme_id, $service_id, ($code ?: null), $intitule, $obligatoire ? 1 : 0, $poids, $ordre]);
  echo json_encode(['ok'=>true, 'id'=>$pdo->lastInsertId()]);
} catch (Exception $e) {
  echo json_encode(['ok'=>false, 'error'=>'Erreur SQL: '.$e->getMessage()]);
}
