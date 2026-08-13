# Laravel Backend Installation Guide

## Prerequisites

Before running this Laravel backend, you need to install:

1. **PHP 8.2 or 8.3** - Download from: https://windows.php.net/download/
2. **Composer** - Download from: https://getcomposer.org/download/

## Installation Steps

### Option 1: Using XAMPP (Recommended for Windows)

1. Download XAMPP from: https://www.apachefriends.org/download.html
2. Install XAMPP (includes PHP, MySQL, and phpMyAdmin)
3. Start Apache and MySQL from XAMPP Control Panel
4. Copy this project to `C:\xampp\htdocs\immersive-ecommerce\laravel-backend`
5. Run these commands in Command Prompt:
   ```
   cd C:\xampp\htdocs\immersive-ecommerce\laravel-backend
   composer install
   php artisan key:generate
   php artisan migrate
   php artisan db:seed --class=AdminUserSeeder
   php artisan serve
   ```

### Option 2: Manual Installation

1. Install PHP 8.2+ from https://windows.php.net/download/
2. Install Composer from https://getcomposer.org/download/
3. Make sure both `php` and `composer` are in your system PATH
4. Run these commands:
   ```
   cd "c:\Users\yukta\Immersive Ecommerce\Immersive-Ecommerse\laravel-backend"
   composer install
   php artisan key:generate
   php artisan migrate
   php artisan db:seed --class=AdminUserSeeder
   php artisan serve
   ```

## Database Setup

The `.env` file is already configured with:
- Database: `immersive_ecommerce`
- Username: `immersive_app`
- Password: `Immersive_App_2026!`

Make sure MySQL is running and these credentials are valid.

## Default Admin Credentials

After running the seeder, you can login with:
- Email: `admin@immersive.test`
- Password: `ChangeMe123!`

## API Endpoints

Once running, the API will be available at: `http://localhost:8000/api`

- `POST /api/auth/register` - User signup
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout (requires auth)
- `GET /api/products` - List products
- `POST /api/cart` - Add to cart (requires auth)
- `POST /api/checkout/create-order` - Create order (requires auth)
