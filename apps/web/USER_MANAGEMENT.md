# User Management

This application uses internal user management - users cannot register themselves and must be created manually by administrators.

## Creating a New User

Use the following command to create a new user:

```bash
npm run create-user <email> <password>
```

### Example:
```bash
npm run create-user admin@company.com securepassword123
```

### Requirements:
- Email must be a valid email format
- Password must be at least 8 characters long
- Email must be unique (not already exist in the system)

## User Authentication Features

Once a user is created, they can:

1. **Sign In** at `/login` using their email and password
2. **Set up 2FA** (optional) for additional security
3. **Access the dashboard** once authenticated

## API Endpoints

### For User Creation (Admin Only)
- `POST /api/auth/create-user` - Create a new user (for admin use)

### For Users
- `POST /api/auth/login` - User login
- `POST /api/auth/setup-2fa` - Set up two-factor authentication
- `POST /api/auth/verify-2fa` - Verify 2FA setup
- `POST /api/auth/refresh` - Refresh authentication tokens

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Automatic token refresh
- Optional 2FA with TOTP (QR codes)
- Rate limiting on authentication endpoints
- Protected routes middleware

## Database Schema

Users are stored in the `users` table with the following fields:
- `id` - Auto-incrementing primary key
- `email` - Unique email address
- `passwordHash` - Hashed password
- `isVerified` - Email verification status (auto-set to true)
- `twoFactorSecret` - TOTP secret (when 2FA is enabled)
- `twoFactorEnabled` - Boolean flag for 2FA status
- `createdAt` - Timestamp of user creation
- `updatedAt` - Timestamp of last update
