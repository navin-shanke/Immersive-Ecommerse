# Setup Instructions for Immersive Ecommerce

## Current Status

✅ Laravel backend set up (PHP 8.3, Composer, Laravel 10.48.0)  
✅ Node.js frontend set up  
❌ MySQL not running on local machine  

## To Run Both Frontend and Backend

### Option 1: Install MySQL on Windows (Recommended)

1. **Download MySQL Server** from: https://dev.mysql.com/downloads/installer/
2. **Install** MySQL Server (select "Developer Default" configuration)
3. **Start MySQL** service after installation
4. **Create database**:
   ```sql
   CREATE DATABASE immersive_ecommerce;
   CREATE USER 'immersive_app'@'localhost' IDENTIFIED BY 'Immersive_App_2026!';
   GRANT ALL PRIVILEGES ON immersive_ecommerce.* TO 'immersive_app'@'localhost';
   FLUSH PRIVILEGES;
   ```
5. **Run Laravel migrations**:
   ```powershell
   cd "c:\Users\yukta\Immersive Ecommerce\Immersive-Ecommerse\laravel-backend"
   php artisan migrate
   php artisan db:seed --class=AdminUserSeeder
   php artisan serve
   ```

### Option 2: Use Free MySQL Cloud Service

**Use PlanetScale** (free MySQL):

1. Sign up at https://planetscale.com/
2. Create a new database
3. Copy the connection string
4. Update `laravel-backend/.env`:
   ```
   DB_CONNECTION=mysql
   DB_HOST=your-database-host
   DB_PORT=3306
   DB_DATABASE=your_database
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```
5. Run migrations as above

### Option 3: Use XAMPP

1. Download XAMPP from https://www.apachefriends.org/
2. Install and start Apache + MySQL
3. The database credentials should work as configured

## Running Both Services

### Laravel Backend (Terminal 1)
```powershell
cd "c:\Users\yukta\Immersive Ecommerce\Immersive-Ecommerse\laravel-backend"
php artisan serve --host=0.0.0.0 --port=8000
```
Backend will be available at: http://localhost:8000/api

### Next.js Frontend (Terminal 2)
```powershell
cd "c:\Users\yukta\Immersive Ecommerce\Immersive-Ecommerse\frontend"
npm run dev
```
Frontend will be available at: http://localhost:3000

## Default Admin Login

After running the seeder:
- Email: `admin@immersive.test`
- Password: `ChangeMe123!`
