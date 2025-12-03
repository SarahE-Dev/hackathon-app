#!/bin/bash

# Script to start all services in Docker containers
# This runs the full production-like environment

set -e

echo "🚀 Starting Hackathon App - All Services in Docker"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes on ports 3000 and 3001..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Set environment variables for Docker
export JWT_SECRET=dev-secret-key-for-hackathon-platform
export JWT_REFRESH_SECRET=dev-refresh-secret-for-hackathon-platform

# Build and start all services
echo "🔨 Building and starting all services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."

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

# Check if Backend is ready
echo "🔍 Checking backend health..."
until curl -s http://localhost:3001/health > /dev/null 2>&1; do
    echo "   Waiting for backend..."
    sleep 2
done
echo "   ✅ Backend is ready"

# Run database seeding
echo "🌱 Seeding database..."
docker exec hackathon-backend npm run seed

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📊 Services running:"
echo "   • Frontend:     http://localhost:3000"
echo "   • Backend API:  http://localhost:3001"
echo "   • MongoDB:      localhost:27017"
echo "   • Redis:        localhost:6379"
echo ""
echo "📝 Test accounts:"
echo "   • Admin:    admin@codearena.edu / Demo@123456"
echo "   • Fellow:   fellow@codearena.edu / Demo@123456"
echo "   • Judge:    judge@codearena.edu / Demo@123456"
echo ""
echo "🛑 To stop: docker-compose down"
echo ""
echo "📋 To view logs: docker-compose logs -f"
