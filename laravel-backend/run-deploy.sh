#!/bin/bash

# Run migrations
php artisan migrate --force

# Idempotent seeders (admin user + store settings)
php artisan db:seed --class=AdminUserSeeder --force
php artisan db:seed --class=StoreSettingsSeeder --force

# Cache config & routes
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start the main container process
exec /entrypoint supervisord
