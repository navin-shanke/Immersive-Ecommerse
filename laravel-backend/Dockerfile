FROM webdevops/php-nginx:8.4-alpine

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Run composer install during build
RUN composer install --no-dev --optimize-autoloader

# Configure Document Root & Laravel Environment Defaults
ENV WEB_DOCUMENT_ROOT /app/public
ENV APP_ENV production
ENV APP_DEBUG false
ENV LOG_CHANNEL stderr
ENV COMPOSER_ALLOW_SUPERUSER 1

# Run deploy script
RUN chmod +x /app/run-deploy.sh

ENTRYPOINT ["/app/run-deploy.sh"]
