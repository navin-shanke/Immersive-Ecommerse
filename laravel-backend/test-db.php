<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306', 'immersive_app', 'Immersive_App_2026!');
    echo "Connected successfully\n";
    
    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS immersive_ecommerce");
    echo "Database created/verified\n";
    
    // List databases
    $databases = $pdo->query("SHOW DATABASES")->fetchAll(PDO::FETCH_COLUMN);
    echo "Available databases: " . implode(", ", $databases) . "\n";
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
