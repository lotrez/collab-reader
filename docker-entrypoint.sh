#!/bin/sh

# Start backend
echo "Starting backend server on port ${PORT:-3000}"
node /app/dist/index.js &

# Start nginx
echo "Starting nginx on port 80"
nginx -g 'daemon off;'
