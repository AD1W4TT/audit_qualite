<?php
// db.php - connexion PDO SQL Server Express
// Copier ce fichier en db.php et renseigner les valeurs
$DB_HOST = 'HOSTNAME\SQLEXPRESS'; // Nom de l'instance SQL Server Express
$DB_NAME = 'Audit';
$DB_USER = 'user';
$DB_PASS = 'password';

$dsn = "sqlsrv:Server=$DB_HOST;Database=$DB_NAME;TrustServerCertificate=true";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'DB connection failed', 'detail' => $e->getMessage()]);
    exit;
}
