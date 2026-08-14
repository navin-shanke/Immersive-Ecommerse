#!/bin/bash

# Ensure the runtime user has write access to Laravel's writable paths.
# In the webdevops image the php-fpm process runs as the "application"
# user, but files copied during the build are owned by root.
if [ "$(id -u)" = "0" ]; then
    mkdir -p /app/storage/logs \
             /app/storage/framework/cache/data \
             /app/storage/framework/sessions \
             /app/storage/framework/views \
             /app/storage/app/public/uploads \
             /app/bootstrap/cache
    chown -R application:application /app/storage /app/bootstrap/cache
fi

# Create the public/storage symlink if it is missing.
if [ ! -e /app/public/storage ] || [ ! -L /app/public/storage ]; then
    php artisan storage:link
fi

# Run migrations
php artisan migrate --force

# Idempotent seeders (categories + admin user + store settings)
php artisan db:seed --class=CategorySeeder --force
php artisan db:seed --class=AdminUserSeeder --force
php artisan db:seed --class=StoreSettingsSeeder --force

# Cache config & routes
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start the main container process
exec /entrypoint supervisord
