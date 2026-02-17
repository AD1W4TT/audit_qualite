<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth_guard.php';
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['ok' => false, 'error' => 'Payload invalide']);
    return;
}

$type = isset($input['type']) ? $input['type'] : '';
$audit_id = isset($input['audit_id']) ? (int)$input['audit_id'] : 0;
if ($audit_id <= 0) {
    echo json_encode(['ok' => false, 'error' => 'Audit inconnu']);
    return;
}

if (!in_array($type, ['header', 'results'], true)) {
    echo json_encode(['ok' => false, 'error' => 'Type invalide']);
    return;
}

$cur = $pdo->prepare("SELECT id, statut FROM audit WHERE id = ?");
$cur->execute([$audit_id]);
$audit = $cur->fetch();
if (!$audit) {
    echo json_encode(['ok' => false, 'error' => 'Audit introuvable']);
    return;
}

try {
    if ($type === 'header') {
        if ($audit['statut'] === 'CLOTURE') {
            echo json_encode(['ok' => false, 'error' => 'Audit finalise']);
            return;
        }

        $allowedStatus = ['BROUILLON', 'EN_COURS', 'CLOTURE'];
        $updates = [];
        $params = [];

        if (array_key_exists('statut', $input)) {
            $statut = (string) $input['statut'];
            if (!in_array($statut, $allowedStatus, true)) {
                echo json_encode(['ok' => false, 'error' => 'Statut invalide']);
                return;
            }
            $updates[] = 'statut = ?';
            $params[] = $statut;
        }

        if (array_key_exists('date_audit', $input)) {
            $date = trim((string) $input['date_audit']);
            if ($date === '') {
                // ignorer champ vide pour ne pas invalider la contrainte NOT NULL
            } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                echo json_encode(['ok' => false, 'error' => 'Format de date invalide']);
                return;
            } else {
                $updates[] = 'date_audit = ?';
                $params[] = $date;
            }
        }

        if (array_key_exists('auditeur', $input)) {
            $auditeur = trim((string) $input['auditeur']);
            $updates[] = 'auditeur = ?';
            $params[] = $auditeur !== '' ? $auditeur : null;
        }

        if (!$updates) {
            echo json_encode(['ok' => true]);
            return;
        }

        $params[] = $audit_id;
        $sql = 'UPDATE audit SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['ok' => true]);
        return;
    }

    if ($audit['statut'] === 'CLOTURE') {
        echo json_encode(['ok' => false, 'error' => 'Audit finalise']);
        return;
    }

    $rows = isset($input['resultats']) ? $input['resultats'] : [];
    if (!is_array($rows) || !$rows) {
        echo json_encode(['ok' => false, 'error' => 'Aucun resultat fourni']);
        return;
    }

    $allowedResultStatus = ['CONFORME', 'NON_CONFORME', 'NA', 'OBS'];
    $upd = $pdo->prepare(
        "UPDATE audit_resultat
         SET statut = ?, score = ?, commentaire = ?, preuve = ?
         WHERE audit_id = ? AND ligne_id = ?"
    );

    $pdo->beginTransaction();
    $updated = 0;

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $ligne_id = isset($row['ligne_id']) ? (int)$row['ligne_id'] : 0;
        if ($ligne_id <= 0) {
            continue;
        }
        $statut = isset($row['statut']) ? (string) $row['statut'] : 'CONFORME';
        if (!in_array($statut, $allowedResultStatus, true)) {
            $pdo->rollBack();
            echo json_encode(['ok' => false, 'error' => 'Statut de resultat invalide']);
            return;
        }

        $score = isset($row['score']) && $row['score'] !== '' ? (float) $row['score'] : null;
        $commentaire = isset($row['commentaire']) ? trim((string) $row['commentaire']) : null;
        $preuve = isset($row['preuve']) ? trim((string) $row['preuve']) : null;

        $upd->execute([
            $statut,
            $score,
            $commentaire !== '' ? $commentaire : null,
            $preuve !== '' ? $preuve : null,
            $audit_id,
            $ligne_id,
        ]);

        $updated++;
    }

    $pdo->commit();

    if ($updated === 0) {
        echo json_encode(['ok' => false, 'error' => 'Aucun resultat mis a jour']);
        return;
    }

    echo json_encode(['ok' => true, 'updated' => $updated]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
