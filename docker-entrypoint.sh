#!/bin/sh

set -e

# Start backend
echo "Starting backend server on port ${PORT:-3000}"
bun run /app/dist/index.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend is still running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "ERROR: Backend server failed to start!"
    exit 1
fi

echo "Backend server started successfully (PID: $BACKEND_PID)"

# Start nginx
echo "Starting nginx on port 8078"
nginx -g 'daemon off;'

# If nginx exits, kill the backend
kill $BACKEND_PID 2>/dev/null || true
