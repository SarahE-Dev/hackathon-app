#!/bin/sh
# Check if database is seeded by looking for an admin user
# If no admin exists, run the seed script

echo "Checking if database needs seeding..."

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
sleep 10

# Simple check: try to run seed if no users exist
# Using Node.js directly to check database state
echo "Checking user count..."
USER_COUNT=$(cd /app/backend && node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/hackathon-platform')
  .then(() => mongoose.connection.db.collection('users').countDocuments())
  .then(count => { console.log(count); process.exit(0); })
  .catch(() => { console.log(0); process.exit(0); });
" 2>/dev/null || echo "0")

echo "Found $USER_COUNT users in database"

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo "No users found. Running database seed..."
  cd /app && npm run seed --workspace=backend
  echo "Database seeding completed!"
else
  echo "Database already seeded. Skipping seed."
fi

# Start the backend application
echo "Starting backend server..."
cd /app && exec npm run dev --workspace=backend
