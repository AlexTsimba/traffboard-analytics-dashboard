# Traffboard Analytics Dashboard

A comprehensive analytics dashboard for affiliate marketing and player conversion tracking, built with Next.js 15 App Router and PostgreSQL.

## 🚀 Architecture

- **Full Stack**: Next.js 15 App Router (single container deployment)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom 2FA with JWT tokens and TOTP
- **UI**: shadcn/ui components with Tailwind CSS
- **Deployment**: Docker container on Digital Ocean

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

## 🛠️ Development Setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Docker (optional)

### Quick Start

1. **Clone and install dependencies:**
   ```bash
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

## 🐳 Docker Deployment

### Single Container Setup

```bash
# Build image
docker build -f apps/web/Dockerfile -t traffboard .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=your-secret \
  traffboard
```

### Production with docker-compose

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Security Features

- **Environment Variables**: Secure secret management
- **Database**: Encrypted connections with SSL
- **API Security**: Rate limiting and CORS configuration
- **Authentication**: 2FA, session management, secure cookies
- **Input Validation**: Zod schemas for all API inputs

## 🏃 Performance Optimizations

- **Server Components**: Direct database queries, zero client-side data fetching
- **ISR Caching**: Incremental Static Regeneration for analytics reports
- **Bundle Optimization**: Tree-shaking, code splitting
- **Database**: Connection pooling, optimized queries with Drizzle

## 📈 Monitoring & Observability

- **Health Checks**: `/api/health` endpoint
- **Error Handling**: Graceful error boundaries
- **Logging**: Structured logging for debugging
- **Performance**: Bundle analysis and optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review the API documentation at `/api-docs`
