#!/bin/bash

# Script to start services in mixed mode:
# - Database (MongoDB) and Redis in Docker
# - Frontend and Backend in development mode (local)

set -e

echo "🚀 Starting Hackathon App - Mixed Mode (DB/Cache in Docker, App in Dev)"
echo "======================================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Start only database and redis in Docker
echo "🐳 Starting database and cache services in Docker..."
docker-compose up -d mongodb redis

# Wait for database and redis to be ready
echo "⏳ Waiting for database and cache to be ready..."
sleep 8

# Check if MongoDB is ready
echo "🔍 Checking MongoDB connection..."
until docker exec hackathon-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    echo "   Waiting for MongoDB..."
    sleep 2
done
echo "   ✅ MongoDB is ready"

# Check if Redis is ready
echo "🔍 Checking Redis connection..."
until docker exec hackathon-redis redis-cli ping > /dev/null 2>&1; do
    echo "   Waiting for Redis..."
    sleep 2
done
echo "   ✅ Redis is ready"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Environment variables for backend
export MONGODB_URI=mongodb://localhost:27017/hackathon-platform
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=dev-secret-key-for-hackathon-platform
export JWT_REFRESH_SECRET=dev-refresh-secret-for-hackathon-platform
export FRONTEND_URL=http://localhost:3000
export BACKEND_PORT=3001
export NODE_ENV=development

# Environment variables for frontend
export NEXT_PUBLIC_API_URL=http://localhost:3001
export NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Run database seeding first
echo "🌱 Seeding database..."
cd backend && npm run seed && cd ..

# Start backend in development mode
echo "🔧 Starting backend in development mode..."
cd backend && \
    MONGODB_URI=$MONGODB_URI \
    REDIS_URL=$REDIS_URL \
    JWT_SECRET=$JWT_SECRET \
    JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET \
    FRONTEND_URL=$FRONTEND_URL \
    BACKEND_PORT=$BACKEND_PORT \
    NODE_ENV=$NODE_ENV \
    npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Check if backend is ready
echo "🔍 Checking backend health..."
until curl -s http://localhost:3001/health > /dev/null 2>&1; do
    echo "   Waiting for backend..."
    sleep 2
done
echo "   ✅ Backend is ready"

# Start frontend in development mode
echo "🎨 Starting frontend in development mode..."
cd frontend && \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 5

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📊 Services running:"
echo "   • Frontend:     http://localhost:3000 (dev mode)"
echo "   • Backend API:  http://localhost:3001 (dev mode)"
echo "   • MongoDB:      localhost:27017 (Docker)"
echo "   • Redis:        localhost:6379 (Docker)"
echo ""
echo "📝 Test accounts:"
echo "   • Admin:    admin@codearena.edu / Demo@123456"
echo "   • Fellow:   fellow@codearena.edu / Demo@123456"
echo "   • Judge:    judge@codearena.edu / Demo@123456"
echo ""
echo "🛑 To stop:"
echo "   • Press Ctrl+C to stop dev servers"
echo "   • Run: docker-compose down"

# Function to cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    docker-compose down --remove-orphans
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
echo ""
echo "Press Ctrl+C to stop all services..."
wait
