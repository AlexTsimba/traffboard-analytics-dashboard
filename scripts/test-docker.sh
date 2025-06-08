#!/bin/bash

# Docker Test Script for Traffboard
echo "Testing Docker configuration..."

# Test 1: Build containers
echo "Building containers..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Test 2: Start services and check health
echo "Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be healthy..."
sleep 30

# Test 3: Check container health
echo "Checking container health..."
docker-compose ps

# Test 4: Verify API endpoints
echo "Testing API endpoints..."
curl -f http://localhost:4000/health || echo "❌ API health check failed"
curl -f http://localhost:3000/api/health || echo "❌ Web health check failed"

# Test 5: Database connectivity
echo "Testing database connectivity..."
docker-compose exec -T db pg_isready -U postgres || echo "❌ Database not ready"

# Cleanup
echo "Cleaning up..."
docker-compose down

echo "Docker tests completed"
