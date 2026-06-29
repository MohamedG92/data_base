<?php
// StockFlow - Dashboard Stats API
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') sendError('Method not allowed', 405);

$db = getDB();

// Total products
$totalProduits = (int)$db->query("SELECT COUNT(*) FROM produits")->fetchColumn();

// Products with stock + alert classification
$produitsStmt = $db->query("
    SELECT 
        p.id, p.seuil_alerte,
        COALESCE(SUM(CASE WHEN m.type_mouvement = 'entree' THEN m.quantite WHEN m.type_mouvement = 'sortie' THEN -m.quantite ELSE 0 END), 0) AS stock_actuel
    FROM produits p
    LEFT JOIN mouvements m ON m.produit_id = p.id
    GROUP BY p.id, p.seuil_alerte
");
$produits = $produitsStmt->fetchAll();

$alertes = 0; $ok = 0; $low = 0; $critical = 0;
foreach ($produits as $p) {
    $stock = (int)$p['stock_actuel'];
    $seuil = (int)$p['seuil_alerte'];
    if ($stock <= 0) { $critical++; $alertes++; }
    elseif ($stock <= $seuil) { $low++; $alertes++; }
    else { $ok++; }
}

// Entries/exits last 30 days
$limit30 = date('Y-m-d H:i:s', strtotime('-30 days'));

$stmt = $db->prepare("SELECT COALESCE(SUM(quantite), 0) FROM mouvements WHERE type_mouvement = 'entree' AND date_mouvement >= :lim");
$stmt->execute([':lim' => $limit30]);
$entrees30 = (int)$stmt->fetchColumn();

$stmt = $db->prepare("SELECT COALESCE(SUM(quantite), 0) FROM mouvements WHERE type_mouvement = 'sortie' AND date_mouvement >= :lim");
$stmt->execute([':lim' => $limit30]);
$sorties30 = (int)$stmt->fetchColumn();

$totalMouvements = (int)$db->query("SELECT COUNT(*) FROM mouvements")->fetchColumn();

// Stock per category
$catStockStmt = $db->query("
    SELECT c.nom AS label,
           COALESCE(SUM(CASE WHEN m.type_mouvement = 'entree' THEN m.quantite WHEN m.type_mouvement = 'sortie' THEN -m.quantite ELSE 0 END), 0) AS stock
    FROM categories c
    LEFT JOIN produits p ON p.categorie_id = c.id
    LEFT JOIN mouvements m ON m.produit_id = p.id
    GROUP BY c.id, c.nom
    ORDER BY c.id
");
$stockParCategorie = $catStockStmt->fetchAll();
foreach ($stockParCategorie as &$cat) {
    $cat['stock'] = (int)$cat['stock'];
}

// Movements per day (last 7 days)
$mouvementsParJour = [];
for ($i = 6; $i >= 0; $i--) {
    $dayStart = date('Y-m-d 00:00:00', strtotime("-{$i} days"));
    $dayEnd = date('Y-m-d 23:59:59', strtotime("-{$i} days"));
    $dayNames = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    $dt = new DateTime($dayStart);
    $label = $dayNames[(int)$dt->format('w')] . ' ' . $dt->format('j');

    $stmt = $db->prepare("SELECT COALESCE(SUM(quantite), 0) FROM mouvements WHERE type_mouvement = 'entree' AND date_mouvement BETWEEN :s AND :e");
    $stmt->execute([':s' => $dayStart, ':e' => $dayEnd]);
    $ent = (int)$stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COALESCE(SUM(quantite), 0) FROM mouvements WHERE type_mouvement = 'sortie' AND date_mouvement BETWEEN :s AND :e");
    $stmt->execute([':s' => $dayStart, ':e' => $dayEnd]);
    $sor = (int)$stmt->fetchColumn();

    $mouvementsParJour[] = ['label' => $label, 'entrees' => $ent, 'sorties' => $sor];
}

sendJSON([
    'totalProduits' => $totalProduits,
    'alertes' => $alertes,
    'entrees30' => $entrees30,
    'sorties30' => $sorties30,
    'ok' => $ok,
    'low' => $low,
    'critical' => $critical,
    'totalMouvements' => $totalMouvements,
    'stockParCategorie' => $stockParCategorie,
    'mouvementsParJour' => $mouvementsParJour
]);
