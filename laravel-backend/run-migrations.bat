@echo off
cd /d "%~dp0"

echo Running database migrations...
php artisan migrate

echo.
echo Seeding admin user...
php artisan db:seed --class=AdminUserSeeder

echo.
echo Starting Laravel server...
php artisan serve --host=0.0.0.0 --port=8000

pause
