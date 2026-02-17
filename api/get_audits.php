<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

try {
    $sql = "SELECT a.id, a.date_audit, a.statut, a.auditeur,
                   n.code AS norme_code, n.libelle AS norme_libelle,
                   (SELECT COUNT(*) FROM audit_resultat ar WHERE ar.audit_id = a.id) AS nb_resultats
            FROM audit a
            JOIN norme n ON n.id = a.norme_id
            ORDER BY a.id DESC";
    $stmt = $pdo->query($sql);
    echo json_encode(['ok' => true, 'data' => $stmt->fetchAll()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Impossible de recuperer les audits',
        'detail' => $e->getMessage(),
    ]);
}
