# Production Deployment Configuration

This document outlines the CI/CD pipeline configuration and deployment requirements.

## GitHub Secrets Required

### For Docker Registry (GitHub Container Registry)
- `GITHUB_TOKEN` (automatically provided by GitHub)

### For Digital Ocean Deployment
- `DO_HOST`: IP address or domain of your Digital Ocean droplet
- `DO_USERNAME`: SSH username (usually 'root' or 'deploy')
- `DO_SSH_KEY`: Private SSH key for server access

### For Application Environment
- `DATABASE_URL`: Production PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth.js authentication
- `NEXTAUTH_URL`: Production URL of your application

## Setup Instructions

### 1. Digital Ocean Droplet Setup
```bash
# On your droplet, install Docker and Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Create deployment directory
mkdir -p /opt/traffboard
cd /opt/traffboard

# Copy docker-compose.prod.yml to the server
# Set up environment variables in .env file
```

### 2. GitHub Repository Secrets
1. Go to your repository Settings → Secrets and variables → Actions
2. Add the required secrets listed above
3. Ensure the deployment workflow has access to these secrets

### 3. Environment Setup
Create a `.env` file on your droplet with production values:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-domain.com
POSTGRES_USER=your-postgres-user
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=traffboard
```

## Pipeline Overview

### CI Pipeline (Triggered on push/PR)
1. **Quality Checks**: ESLint, TypeScript type checking
2. **Unit Tests**: Vitest with PostgreSQL service
3. **Build Verification**: Ensure production build succeeds

### CD Pipeline (Triggered after successful CI on main/master)
1. **Docker Build**: Multi-platform image build and push to GHCR
2. **Deployment**: SSH to Digital Ocean droplet and deploy

## Monitoring and Rollback

- Health checks are performed after deployment
- Failed deployments will stop the pipeline
- Manual rollback can be performed by redeploying a previous image tag

## Security Considerations

- All secrets are managed through GitHub Secrets
- SSH keys should be dedicated deployment keys with minimal permissions
- Docker images are scanned for vulnerabilities
- Production environment uses encrypted connections
