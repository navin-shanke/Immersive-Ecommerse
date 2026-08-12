@echo off
cd /d "%~dp0"

echo Installing PHP dependencies...
composer install

echo Generating application key...
php artisan key:generate

echo Running database migrations...
php artisan migrate

echo Seeding admin user...
php artisan db:seed --class=AdminUserSeeder

echo Starting development server...
php artisan serve --host=0.0.0.0 --port=8000

pause
