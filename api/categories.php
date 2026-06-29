<?php
// StockFlow - Categories API
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

if ($method === 'GET') {
    $stmt = $db->query("SELECT id, nom FROM categories ORDER BY id");
    sendJSON($stmt->fetchAll());
} else {
    sendError('Method not allowed', 405);
}
