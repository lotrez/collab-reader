#!/bin/sh

# Replace environment variables in nginx.conf
export BACKEND_PORT=${PORT:-3000}
envsubst '$BACKEND_PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start backend
echo "Starting backend server on port $BACKEND_PORT"
node /app/dist/index.js &

# Start nginx
echo "Starting nginx on port 80"
nginx -g 'daemon off;'
