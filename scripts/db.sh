#!/bin/bash

# Traffboard Database Management Script

set -e

case "$1" in
  "start")
    echo "🚀 Starting Traffboard Database..."
    docker-compose -f docker-compose.db.yml up -d
    echo "⏳ Waiting for database to be ready..."
    sleep 10
    echo "✅ Database is ready!"
    echo "📊 Adminer available at: http://localhost:8080"
    echo "🔑 Database credentials:"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo "   Database: traffboard"
    echo "   Username: traffboard_user"
    echo "   Password: traffboard_password"
    ;;
  "stop")
    echo "🛑 Stopping Traffboard Database..."
    docker-compose -f docker-compose.db.yml down
    echo "✅ Database stopped"
    ;;
  "restart")
    echo "🔄 Restarting Traffboard Database..."
    docker-compose -f docker-compose.db.yml down
    docker-compose -f docker-compose.db.yml up -d
    sleep 10
    echo "✅ Database restarted"
    ;;
  "reset")
    echo "⚠️  DANGER: This will destroy ALL data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo "🗑️  Removing database..."
      docker-compose -f docker-compose.db.yml down -v
      docker-compose -f docker-compose.db.yml up -d
      sleep 10
      echo "✅ Database reset complete"
    else
      echo "❌ Reset cancelled"
    fi
    ;;
  "logs")
    echo "📋 Database logs..."
    docker-compose -f docker-compose.db.yml logs -f postgres
    ;;
  "backup")
    echo "💾 Creating database backup..."
    docker exec traffboard-db pg_dump -U traffboard_user traffboard > "backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "✅ Backup created"
    ;;
  *)
    echo "Traffboard Database Management"
    echo ""
    echo "Usage: $0 {start|stop|restart|reset|logs|backup}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the database"
    echo "  stop    - Stop the database"
    echo "  restart - Restart the database"
    echo "  reset   - Reset database (destroys all data)"
    echo "  logs    - Show database logs"
    echo "  backup  - Create database backup"
    exit 1
    ;;
esac
