<?php
// StockFlow - Products API
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {

    case 'GET':
        // Get all products with computed stock_actuel
        $stmt = $db->query("
            SELECT 
                p.*,
                c.nom AS categorie_nom,
                COALESCE(
                    (SELECT SUM(CASE WHEN m.type_mouvement = 'entree' THEN m.quantite ELSE -m.quantite END)
                     FROM mouvements m WHERE m.produit_id = p.id), 0
                ) AS stock_actuel
            FROM produits p
            LEFT JOIN categories c ON c.id = p.categorie_id
            ORDER BY p.nom
        ");
        sendJSON($stmt->fetchAll());
        break;

    case 'POST':
        $data = getInput();
        $required = ['reference', 'nom', 'categorie_id', 'prix_unitaire', 'seuil_alerte'];
        foreach ($required as $field) {
            if (empty($data[$field]) && $data[$field] !== 0) {
                sendError("Missing required field: $field");
            }
        }

        $stmt = $db->prepare("
            INSERT INTO produits (reference, nom, description, categorie_id, prix_unitaire, seuil_alerte)
            VALUES (:reference, :nom, :description, :categorie_id, :prix_unitaire, :seuil_alerte)
        ");
        $stmt->execute([
            ':reference' => $data['reference'],
            ':nom' => $data['nom'],
            ':description' => $data['description'] ?? '',
            ':categorie_id' => (int)$data['categorie_id'],
            ':prix_unitaire' => (float)$data['prix_unitaire'],
            ':seuil_alerte' => (int)$data['seuil_alerte']
        ]);

        $id = (int)$db->lastInsertId();
        // Return the full product with stock
        $stmt = $db->prepare("
            SELECT p.*, c.nom AS categorie_nom, 0 AS stock_actuel
            FROM produits p
            LEFT JOIN categories c ON c.id = p.categorie_id
            WHERE p.id = :id
        ");
        $stmt->execute([':id' => $id]);
        sendJSON($stmt->fetch(), 201);
        break;

    case 'PUT':
        $data = getInput();
        if (empty($data['id'])) sendError('Missing product id');

        $stmt = $db->prepare("
            UPDATE produits 
            SET reference = :reference, nom = :nom, description = :description,
                categorie_id = :categorie_id, prix_unitaire = :prix_unitaire, seuil_alerte = :seuil_alerte
            WHERE id = :id
        ");
        $stmt->execute([
            ':id' => (int)$data['id'],
            ':reference' => $data['reference'],
            ':nom' => $data['nom'],
            ':description' => $data['description'] ?? '',
            ':categorie_id' => (int)$data['categorie_id'],
            ':prix_unitaire' => (float)$data['prix_unitaire'],
            ':seuil_alerte' => (int)$data['seuil_alerte']
        ]);
        sendJSON(['success' => true]);
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) sendError('Missing product id');

        // Delete movements first (FK), then product
        $db->prepare("DELETE FROM mouvements WHERE produit_id = :id")->execute([':id' => $id]);
        $db->prepare("DELETE FROM produits WHERE id = :id")->execute([':id' => $id]);
        sendJSON(['success' => true]);
        break;

    default:
        sendError('Method not allowed', 405);
}
