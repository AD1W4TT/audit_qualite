<?php
require __DIR__ . '/auth_guard.php';

$role = isset($_SESSION['role']) ? strtoupper((string)$_SESSION['role']) : '';
if ($role !== 'ADMIN') {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Acces administrateur requis']);
    exit;
}
