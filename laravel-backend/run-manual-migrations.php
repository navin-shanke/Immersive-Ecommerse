<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1', 'immersive_app', 'Immersive_App_2026!');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Connected to MySQL\n";
    
    // Read SQL file
    $sql = file_get_contents(__DIR__ . '/manual-migrations.sql');
    
    // Execute SQL
    $pdo->exec($sql);
    
    echo "✅ All tables created successfully!\n";
    
    // Show tables
    $pdo->exec("USE immersive_ecommerce");
    echo "\nTables created:\n";
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        echo "  ✓ $table\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
