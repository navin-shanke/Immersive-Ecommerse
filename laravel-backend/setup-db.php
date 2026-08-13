<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306', 'root', 'Yukta@2006');
    echo "✅ Connected to MySQL as root\n";
    
    // Create database
    $pdo->exec("CREATE DATABASE IF NOT EXISTS immersive_ecommerce");
    echo "✅ Database 'immersive_ecommerce' created/verified\n";
    
    // Drop user if exists (to avoid conflicts)
    try {
        $pdo->exec("DROP USER IF EXISTS 'immersive_app'@'localhost'");
    } catch (Exception $e) {}
    
    // Create user and grant privileges
    $pdo->exec("CREATE USER 'immersive_app'@'localhost' IDENTIFIED BY 'Immersive_App_2026!'");
    echo "✅ User 'immersive_app' created\n";
    
    $pdo->exec("GRANT ALL PRIVILEGES ON immersive_ecommerce.* TO 'immersive_app'@'localhost'");
    echo "✅ Privileges granted\n";
    
    $pdo->exec("FLUSH PRIVILEGES");
    echo "✅ Privileges flushed\n";
    
    echo "\n🎉 Database setup complete!\n";
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
