#!/bin/sh
set -e

# Move into the backend folder so Prisma finds the prisma.config.ts and schema
cd /app/backend

# Run migrations using the binary already sitting in the node_modules
node ./node_modules/prisma/build/index.js migrate deploy

# Start the application
node ./dist/server.js