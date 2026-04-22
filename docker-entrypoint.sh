#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. The app cannot start without a database connection."
  echo "Set DATABASE_URL in your Coolify environment variables (or .env file for local runs)."
  exit 1
fi

echo "Running database migrations..."
npx --no-install prisma migrate deploy

echo "Starting Next.js server..."
exec node server.js
