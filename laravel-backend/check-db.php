<?php
// Try connecting as root with the password you provided
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306', 'root', 'Yukta@2006');
    echo "✅ Connected to MySQL as root\n\n";
    
    // List all databases
    echo "Available databases:\n";
    $databases = $pdo->query("SHOW DATABASES")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($databases as $db) {
        echo "  - $db\n";
    }
    
    // Check if immersive_ecommerce exists
    if (in_array('immersive_ecommerce', $databases)) {
        echo "\n✅ Database 'immersive_ecommerce' exists!\n";
    } else {
        echo "\n❌ Database 'immersive_ecommerce' does NOT exist\n";
    }
    
    // List users
    echo "\nMySQL users:\n";
    $users = $pdo->query("SELECT User, Host FROM mysql.user")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($users as $user) {
        echo "  - {$user['User']}@{$user['Host']}\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Connection failed: " . $e->getMessage() . "\n";
    echo "\nPlease verify:\n";
    echo "1. MySQL is running\n";
    echo "2. Root password is correct: Laravel@123\n";
    echo "3. MySQL is listening on port 3306\n";
}
