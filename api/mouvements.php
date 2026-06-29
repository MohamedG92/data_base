<?php
// StockFlow - Mouvements API
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {

    case 'GET':
        $where = [];
        $params = [];

        if (!empty($_GET['produit_id'])) {
            $where[] = "m.produit_id = :produit_id";
            $params[':produit_id'] = (int)$_GET['produit_id'];
        }
        if (!empty($_GET['type'])) {
            $where[] = "m.type_mouvement = :type";
            $params[':type'] = $_GET['type'];
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $db->prepare("
            SELECT m.*, p.nom AS produit_nom, p.reference AS produit_reference
            FROM mouvements m
            LEFT JOIN produits p ON p.id = m.produit_id
            $whereClause
            ORDER BY m.date_mouvement DESC
            LIMIT 200
        ");
        $stmt->execute($params);
        sendJSON($stmt->fetchAll());
        break;

    case 'POST':
        $data = getInput();
        if (empty($data['produit_id']) || empty($data['type_mouvement']) || empty($data['quantite'])) {
            sendError('Missing required fields: produit_id, type_mouvement, quantite');
        }

        $stmt = $db->prepare("
            INSERT INTO mouvements (produit_id, type_mouvement, quantite, date_mouvement, commentaire, utilisateur)
            VALUES (:produit_id, :type_mouvement, :quantite, NOW(), :commentaire, :utilisateur)
        ");
        $stmt->execute([
            ':produit_id' => (int)$data['produit_id'],
            ':type_mouvement' => $data['type_mouvement'],
            ':quantite' => (int)$data['quantite'],
            ':commentaire' => $data['commentaire'] ?? '',
            ':utilisateur' => $data['utilisateur'] ?? 'Inconnu'
        ]);

        $id = (int)$db->lastInsertId();
        $stmt = $db->prepare("
            SELECT m.*, p.nom AS produit_nom, p.reference AS produit_reference
            FROM mouvements m
            LEFT JOIN produits p ON p.id = m.produit_id
            WHERE m.id = :id
        ");
        $stmt->execute([':id' => $id]);
        sendJSON($stmt->fetch(), 201);
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) sendError('Missing movement id');

        $db->prepare("DELETE FROM mouvements WHERE id = :id")->execute([':id' => $id]);
        sendJSON(['success' => true]);
        break;

    default:
        sendError('Method not allowed', 405);
}
