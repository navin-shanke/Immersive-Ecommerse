<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;dbname=immersive_ecommerce', 'immersive_app', 'Immersive_App_2026!');
    echo "✅ Connected to database\n";
    
    // Create migrations table
    $sql = "CREATE TABLE IF NOT EXISTS migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL,
        batch INT NOT NULL
    )";
    
    $pdo->exec($sql);
    echo "✅ Migrations table created\n";
    
    // List tables
    echo "\nTables in database:\n";
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        echo "  - $table\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
