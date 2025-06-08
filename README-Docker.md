# Docker Configuration

## Quick Start

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration

### Development Mode
- Hot reloading enabled
- Volume mounts for source code
- Debug-friendly setup

### Production Mode
- Optimized builds
- Health checks enabled
- Environment variable management
- SSL-ready configuration

## Health Checks

All services include health checks:
- Web: `curl -f http://localhost:3000/api/health`
- API: `curl -f http://localhost:4000/health`  
- Database: `pg_isready -U postgres`

## Environment Variables

Copy `.env.example` to `.env.local` and configure:
- Database credentials
- Application secrets
- Digital Ocean tokens (for production)

## Scripts

- `scripts/test-docker.sh` - Full Docker test suite
- `docker-compose build` - Build all services
- `docker-compose logs` - View service logs

## Troubleshooting

- Ensure pnpm lockfile is up to date: `pnpm install`
- Check health status: `docker-compose ps`
- View logs: `docker-compose logs [service]`
