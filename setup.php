<?php
// StockFlow - Database Setup Script
// Run this ONCE to create the database, tables, and seed data.
// Access via: http://localhost/stockflow/setup.php

$host = 'localhost';
$user = 'root';
$pass = '';
$dbname = 'stockflow_db';

$messages = [];

try {
    // Connect without database
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    $messages[] = "✅ Connected to MySQL server.";

    // Create database
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbname`");
    $messages[] = "✅ Database '$dbname' ready.";

    // Create categories table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nom VARCHAR(100) NOT NULL
        ) ENGINE=InnoDB
    ");
    $messages[] = "✅ Table 'categories' created.";

    // Create produits table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS produits (
            id INT AUTO_INCREMENT PRIMARY KEY,
            categorie_id INT NOT NULL,
            reference VARCHAR(50) NOT NULL UNIQUE,
            nom VARCHAR(200) NOT NULL,
            description TEXT DEFAULT '',
            prix_unitaire DECIMAL(10, 2) NOT NULL DEFAULT 0,
            seuil_alerte INT NOT NULL DEFAULT 10,
            FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    ");
    $messages[] = "✅ Table 'produits' created.";

    // Create mouvements table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS mouvements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            produit_id INT NOT NULL,
            type_mouvement ENUM('entree', 'sortie') NOT NULL,
            quantite INT NOT NULL,
            date_mouvement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            commentaire VARCHAR(255) DEFAULT '',
            utilisateur VARCHAR(100) DEFAULT 'Inconnu',
            FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    ");
    $messages[] = "✅ Table 'mouvements' created.";

    // Check if data already exists
    $count = (int)$pdo->query("SELECT COUNT(*) FROM categories")->fetchColumn();
    if ($count > 0) {
        $messages[] = "ℹ️ Data already exists — skipping seed. (Drop tables first to re-seed)";
    } else {
        // Seed categories
        $categories = [
            [1, 'Alimentation'],
            [2, 'Boissons'],
            [3, 'Hygiène'],
            [4, 'Papeterie'],
            [5, 'Électronique']
        ];
        $stmt = $pdo->prepare("INSERT INTO categories (id, nom) VALUES (?, ?)");
        foreach ($categories as $c) {
            $stmt->execute($c);
        }
        $messages[] = "✅ Seeded 5 categories.";
        $messages[] = "ℹ️ No products seeded — add them yourself via the app!";
    }

    $messages[] = "";
    $messages[] = "🎉 Setup complete! You can now access StockFlow at:";
    $messages[] = "   http://localhost/stockflow/";

} catch (PDOException $e) {
    $messages[] = "❌ Error: " . $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>StockFlow — Setup</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f1114; color: #e8ecf0; padding: 40px; max-width: 700px; margin: 0 auto; }
        h1 { color: #00d4aa; letter-spacing: 3px; }
        .msg { padding: 8px 0; font-size: 15px; line-height: 1.6; }
        a { color: #00d4aa; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
        .box { background: #14171c; border: 1px solid #1e2530; border-radius: 8px; padding: 24px; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>STOCKFLOW SETUP</h1>
    <div class="box">
        <?php foreach ($messages as $msg): ?>
            <div class="msg"><?= htmlspecialchars($msg) ?></div>
        <?php endforeach; ?>
    </div>
    <p style="margin-top: 20px;">
        <a href="/stockflow/">→ Open StockFlow</a>
    </p>
</body>
</html>
