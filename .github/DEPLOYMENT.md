# Production Deployment Configuration (Private Repository)

This document outlines the CI/CD pipeline configuration and deployment requirements for a **private repository**.

## 🔒 Private Repository Considerations

### Key Differences from Public Repositories:
- ✅ **GitHub Actions**: Works identically in private repos (2,000 free minutes/month)
- ✅ **Container Registry**: Images are private by default in GHCR
- ✅ **Secrets Management**: Enhanced security for sensitive data
- ✅ **Deployment Process**: Same workflow, improved security
- ⚠️ **Access Control**: Only invited collaborators can view/clone repository

## GitHub Secrets Required

### For Docker Registry (GitHub Container Registry)
- `GITHUB_TOKEN` (automatically provided by GitHub)
- **Note**: Private images require authentication for pulling

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
```

### 2. GitHub Repository Secrets (Private Repository)
1. Go to your **private** repository Settings → Secrets and variables → Actions
2. Add the required secrets listed above
3. Ensure the deployment workflow has access to these secrets
4. **Note**: All secrets are automatically encrypted and hidden in private repos

### 3. Private Container Registry Setup
```bash
# On your Digital Ocean droplet, authenticate with GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Verify access to private images
docker pull ghcr.io/alextsimba/traffboard-analytics-dashboard:latest
```

### 4. Environment Setup
Create a `.env` file on your droplet with production values:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-domain.com
POSTGRES_USER=your-postgres-user
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=traffboard
```

## Pipeline Overview (Private Repository)

### CI Pipeline (Triggered on push/PR to private repo)
1. **Quality Checks**: ESLint, TypeScript type checking
2. **Unit Tests**: Vitest with PostgreSQL service (71 tests)
3. **Build Verification**: Ensure production build succeeds
4. **Security**: All logs and artifacts remain private

### CD Pipeline (Triggered after successful CI on main/master)
1. **Docker Build**: Multi-platform image build and push to private GHCR
2. **Deployment**: SSH to Digital Ocean droplet and deploy
3. **Health Checks**: Verify deployment success
4. **Rollback**: Automatic rollback on failure

## Security Enhancements (Private Repository)

### Enhanced Privacy
- All workflow logs are private and encrypted
- Source code access restricted to invited collaborators
- Container images are private by default
- No public exposure of build artifacts or logs

### Access Control
- Repository access controlled via GitHub permissions
- Container registry requires authentication
- SSH keys should be dedicated deployment keys
- Environment variables encrypted in GitHub Secrets

## Monitoring and Rollback

- Health checks are performed after deployment
- Failed deployments will stop the pipeline
- Manual rollback can be performed by redeploying a previous image tag
- All monitoring data remains private to repository collaborators

## Troubleshooting Private Repository Issues

### Common Issues:
1. **Container Pull Fails**: Ensure GITHUB_TOKEN has proper permissions
2. **Workflow Access**: Verify collaborator has necessary repository permissions
3. **Image Registry**: Confirm authentication to private GHCR
4. **Secrets Access**: Check that secrets are properly configured

> **🔒 Note**: This deployment configuration is optimized for private repositories with enhanced security and access control.
