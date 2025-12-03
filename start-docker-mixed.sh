#!/bin/bash

# Script to start services in mixed mode:
# - Database (MongoDB) and Redis in Docker
# - Frontend and Backend in development mode (local)
# - Code Runner in Docker

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

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans

# Start only database and redis in Docker
echo "🐳 Starting database and cache services in Docker..."
docker-compose up -d mongodb redis

# Wait for database and redis to be ready
echo "⏳ Waiting for database and cache to be ready..."
sleep 5

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Start backend in development mode
echo "🔧 Starting backend in development mode..."
JWT_SECRET=dev-secret-key JWT_REFRESH_SECRET=dev-refresh-secret FRONTEND_URL=http://localhost:3000 npm run dev --workspace=backend &
BACKEND_PID=$!

# Start frontend in development mode
echo "🎨 Starting frontend in development mode..."
NEXT_PUBLIC_API_URL=http://localhost:3001 NEXT_PUBLIC_WS_URL=ws://localhost:3001 npm run dev --workspace=frontend &
FRONTEND_PID=$!

# Start code runner in Docker
echo "⚙️  Starting code runner in Docker..."
docker-compose up -d code-runner

# Wait a bit for services to start
sleep 5

# Run database seeding
echo "🌱 Seeding database..."
npm run seed --workspace=backend

echo ""
echo "✅ Services started successfully!"
echo ""
echo "📊 Services running:"
echo "   • Frontend:     http://localhost:3000 (dev mode)"
echo "   • Backend API:  http://localhost:3001 (dev mode)"
echo "   • MongoDB:      localhost:27017 (Docker)"
echo "   • Redis:        localhost:6379 (Docker)"
echo "   • Code Runner:  (Docker)"
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
