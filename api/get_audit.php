<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    echo json_encode(['ok' => false, 'error' => 'Audit inconnu']);
    return;
}

try {
    $h = $pdo->prepare(
        "SELECT a.id, a.date_audit, a.auditeur, a.statut,
                n.code AS norme_code, n.libelle AS norme_libelle, n.date_norme
         FROM audit a
         JOIN norme n ON n.id = a.norme_id
         WHERE a.id = ?"
    );
    $h->execute([$id]);
    $header = $h->fetch();
    if (!$header) {
        echo json_encode(['ok' => false, 'error' => 'Audit introuvable']);
        return;
    }

    $sql = "SELECT ar.ligne_id, ar.statut, ar.score, ar.commentaire, ar.preuve,
                   l.code AS ligne_code, l.intitule AS ligne_intitule, s.nom AS service_nom
            FROM audit_resultat ar
            JOIN lignes l ON l.id = ar.ligne_id
            JOIN service s ON s.id = l.service_id
            WHERE ar.audit_id = ?
            ORDER BY CASE WHEN l.ordre IS NULL THEN 1 ELSE 0 END, l.ordre, l.id";
    $r = $pdo->prepare($sql);
    $r->execute([$id]);

    echo json_encode(['ok' => true, 'header' => $header, 'results' => $r->fetchAll()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Impossible de recuperer l audit',
        'detail' => $e->getMessage(),
    ]);
}
