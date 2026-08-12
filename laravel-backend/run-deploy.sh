#!/bin/bash

# Run migrations
php artisan migrate --force

# Cache config & routes
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start the main container process
exec /entrypoint.sh
