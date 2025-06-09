# Traffboard Analytics Dashboard 🔒 PRIVATE

A comprehensive analytics dashboard for affiliate marketing and player conversion tracking, built with Next.js 15 App Router and PostgreSQL.

> **⚠️ Private Repository**: This repository is private. All CI/CD workflows, Docker builds, and deployment processes are fully functional with private repositories.

## 🚀 Architecture

- **Full Stack**: Next.js 15 App Router (single container deployment)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom 2FA with JWT tokens and TOTP
- **UI**: shadcn/ui components with Tailwind CSS
- **Deployment**: Docker container on Digital Ocean
- **CI/CD**: GitHub Actions with private repository support

## 🏗️ Project Structure

```
apps/
└── web/                    # Next.js App Router (full stack)
    ├── src/app/           # App Router pages & API routes
    ├── src/components/    # React components
    └── src/lib/          # Utilities and configurations

packages/
├── database/             # Drizzle schema & migrations
├── auth/                # Authentication utilities
├── partners/            # Partner data normalization
├── ui/                  # shadcn component library
└── types/               # Shared TypeScript definitions
```

## 🔐 Private Repository Setup

### Access Requirements
- Repository collaborators must be explicitly invited
- GitHub Container Registry images are private by default
- CI/CD workflows use `GITHUB_TOKEN` for authentication
- All secrets and environment variables are secure

### Team Access
```bash
# Invite collaborators (repository owner only)
# 1. Go to repository Settings → Manage access
# 2. Click "Invite a collaborator"
# 3. Enter GitHub username or email
# 4. Select permission level (Read, Write, Admin)
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Docker (optional)
- **Repository access** (must be invited as collaborator)

### Quick Start

1. **Clone repository (requires access):**
   ```bash
   # For collaborators with access
   git clone https://github.com/AlexTsimba/traffboard-analytics-dashboard.git
   cd traffboard-analytics-dashboard
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp apps/web/.env.example apps/web/.env
   # Edit apps/web/.env with your database credentials
   ```

3. **Start development:**
   ```bash
   # Start with Docker (includes PostgreSQL)
   docker-compose up
   
   # Or start locally (requires running PostgreSQL)
   pnpm dev
   ```

4. **Access the application:**
   - Web: http://localhost:3000
   - Health check: http://localhost:3000/api/health

## 📦 Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Quality Assurance  
pnpm lint             # Run ESLint
pnpm test             # Run tests
pnpm type-check       # TypeScript validation

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Drizzle Studio
```

## 🔒 CI/CD with Private Repository

### GitHub Actions Benefits
- **Free CI/CD minutes**: 2,000 minutes/month on private repos
- **Secure by default**: All workflow logs are private
- **Secret management**: Enhanced security for sensitive data
- **Container registry**: Private Docker images in GHCR

### Workflow Features
- ✅ **Quality Gates**: ESLint, TypeScript, tests (71 tests passing)
- ✅ **Docker Builds**: Multi-platform images (amd64/arm64)
- ✅ **Deployment**: Automated Digital Ocean deployment
- ✅ **Security**: Private image registry, encrypted secrets
- ✅ **Monitoring**: Health checks and deployment validation

## 🔐 Authentication

The application uses custom authentication with:
- **Registration/Login**: Email + password
- **2FA**: TOTP (compatible with Google Authenticator, Authy)
- **Sessions**: JWT tokens with refresh rotation
- **Security**: Rate limiting, input validation, secure headers

### API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (with 2FA support)
- `POST /api/auth/setup-2fa` - Generate QR code for 2FA setup
- `POST /api/auth/verify-2fa` - Verify and enable 2FA
- `GET /api/health` - Application health check

## 📊 Analytics Features

### Dashboard Components
- **Conversions**: Clicks, registrations, FTD tracking
- **Cohorts**: Retention analysis and user behavior
- **Quality Reports**: Revenue metrics and player quality indicators
- **Partner Management**: Data normalization for different affiliate partners

### Data Pipeline
1. **Raw Data Ingestion**: Google Sheets → PostgreSQL
2. **Partner Normalization**: Field mapping and validation
3. **Analytics Processing**: Server Components with ISR caching
4. **Visualization**: Interactive charts with shadcn/ui

## 🐳 Docker Deployment (Private Repository)

### Private Container Registry
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull private image (requires authentication)
docker pull ghcr.io/alextsimba/traffboard-analytics-dashboard:latest
```

### Production with docker-compose
```bash
# Production deployment with private images
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Security Features

- **Private Repository**: Source code access restricted to collaborators
- **Environment Variables**: Secure secret management
- **Database**: Encrypted connections with SSL
- **API Security**: Rate limiting and CORS configuration
- **Authentication**: 2FA, session management, secure cookies
- **Input Validation**: Zod schemas for all API inputs
- **Container Security**: Private image registry, vulnerability scanning

## 🤝 Contributing (Private Repository)

### For Repository Collaborators:

1. **Get Repository Access**: Must be invited by repository owner
2. **Create Feature Branch**: `git checkout -b feature/new-feature`
3. **Develop and Test**: Ensure all tests pass (`pnpm test`)
4. **Submit Pull Request**: Private PRs with automated CI/CD validation
5. **Code Review**: Team review process with private discussions

### Development Workflow:
```bash
# Clone (requires access)
git clone https://github.com/AlexTsimba/traffboard-analytics-dashboard.git

# Create feature branch
git checkout -b feature/your-feature

# Run quality checks
pnpm lint && pnpm test && pnpm type-check

# Commit and push
git commit -am 'feat: add new feature'
git push origin feature/your-feature

# Create pull request (private)
```

## 📝 License & Support

This project is licensed under the MIT License.

> **🔒 Repository Status**: Private - Access restricted to invited collaborators only
