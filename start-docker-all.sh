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

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans

# Build and start all services
echo "🔨 Building and starting all services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database seeding
echo "🌱 Seeding database..."
docker-compose exec backend npm run seed

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
