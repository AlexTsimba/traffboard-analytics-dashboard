# Scripts Directory

This directory contains development and maintenance scripts for the Traffboard project.

## Database Scripts (`./database/`)

### `test-connection.ts`
Tests database connectivity and repository initialization.

**Usage:**
```bash
cd packages/database
npx tsx ../../scripts/database/test-connection.ts
```

### `verify-task-7-5.ts`
Comprehensive verification script for Task 7.5 (CSV import functionality).

**Features:**
- Database connection testing
- Players data analysis
- Email field verification (privacy compliance)
- Database constraints validation
- Data quality checks
- Import success rate calculation

**Usage:**
```bash
cd packages/database
npx tsx ../../scripts/database/verify-task-7-5.ts
```

## Running Scripts

All scripts should be run from the appropriate package directory to ensure correct module resolution:

```bash
# For database scripts
cd packages/database
npx tsx ../../scripts/database/[script-name].ts
```

## Notes

- Scripts are for development and testing purposes only
- Not included in production builds
- Require development dependencies (tsx, TypeScript)
- Database scripts require valid DATABASE_URL environment variable
