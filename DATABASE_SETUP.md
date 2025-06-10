# 🐳 Docker Database Setup - Production Match

**Complete PostgreSQL setup with Docker that exactly matches your production database.**

## 🚀 Quick Start (3 commands)

```bash
# 1. Navigate to project
cd /Users/fristname_lastname/Documents/Obsidian/Traffboard/apps/web

# 2. Setup Docker database & environment
npm run setup:docker

# 3. Start development server
npm run dev
```

**Ready to test!** 🎉
- **Login**: http://localhost:3000/login
- **CSV Import**: http://localhost:3000/admin/import
- **Database Admin**: http://localhost:8080

## 📋 Login Credentials

- **Email**: admin@traffboard.com
- **Password**: admin123456

## 🗄️ Database Access

- **URL**: postgresql://traffboard_user:traffboard_password@localhost:5432/traffboard
- **Adminer**: http://localhost:8080 (Database GUI)

## 🛠️ Database Management

```bash
# Start database
npm run db:start

# Stop database  
npm run db:stop

# Restart database
npm run db:restart

# View logs
npm run db:logs

# Reset all data (DANGER!)
npm run db:reset
```

## 📊 What's Included

✅ **Production-matched schema**
- Conversions table (for CSV imports)
- Players table 
- Users & authentication
- All indexes and constraints

✅ **Sample data** for testing
- Sample conversions data
- Sample players data
- Admin user pre-created

✅ **Management tools**
- Adminer database GUI
- Database backup/restore scripts
- Health checks and monitoring

## 🧪 Testing CSV Import

1. **Login** to the application
2. **Navigate** to `/admin/import` 
3. **Upload** your 1.5MB CSV file
4. **Validate** → **Preview** → **Execute**
5. **Verify** data in Adminer or dashboard

## 🔧 Production Matching

This Docker setup uses:
- **PostgreSQL 15** (same as production)
- **Exact table schemas** from your migrations
- **Same indexes** and constraints
- **Identical data types** and relationships

## 📁 File Structure

```
/docker/
├── 01-schema.sql    # Main tables (conversions, players)
├── 02-auth.sql      # Authentication system  
└── 03-seed.sql      # Sample data & admin user
```

**Ready to test your CSV import functionality!** 🚀
