#!/bin/bash
# Docker build test script

set -e

echo "🧪 Testing Docker build locally..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t traffboard-test:latest -f ./apps/web/Dockerfile .

# Test the built image
echo "🚀 Testing built image..."
docker run --rm --name traffboard-test-container -d -p 3001:3000 traffboard-test:latest

# Wait for startup
echo "⏳ Waiting for application startup..."
sleep 10

# Health check
echo "🏥 Running health check..."
if curl -f http://localhost:3001/api/health; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    docker logs traffboard-test-container
    docker stop traffboard-test-container
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up..."
docker stop traffboard-test-container
docker rmi traffboard-test:latest

echo "✅ Docker build test completed successfully!"
