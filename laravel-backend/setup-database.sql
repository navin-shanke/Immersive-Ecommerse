-- Run this script in MySQL Workbench
-- 1. Open MySQL Workbench
-- 2. Connect to your MySQL server (username: root, password: Laravel@123)
-- 3. Go to File > Open SQL Script
-- 4. Select this file
-- 5. Click Execute (lightning bolt icon)

-- Create database
CREATE DATABASE IF NOT EXISTS immersive_ecommerce;

-- Drop user if exists
DROP USER IF EXISTS 'immersive_app'@'localhost';

-- Create user with password
CREATE USER 'immersive_app'@'localhost' IDENTIFIED BY 'Immersive_App_2026!';

-- Grant all privileges
GRANT ALL PRIVILEGES ON immersive_ecommerce.* TO 'immersive_app'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify user was created
SELECT User, Host FROM mysql.user WHERE User = 'immersive_app';
