#!/usr/bin/env node

/**
 * Script to create users manually for internal use
 * Usage: npm run create-user <email> <password>
 */

const { db, users } = require('@traffboard/database');
const { eq } = require('drizzle-orm');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

// Local auth implementation
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${salt}:${buf.toString('hex')}`;
}

async function createUser(email, password) {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test database connection
    await db.execute('SELECT 1');
    console.log('✅ Database connected successfully');

    // Check if user exists
    console.log('🔍 Checking if user exists...');
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      console.error('❌ User already exists with email:', email);
      process.exit(1);
    }

    // Create user
    console.log('🔐 Hashing password...');
    const passwordHash = await hashPassword(password);
    
    console.log('👤 Creating user...');
    const result = await db.insert(users).values({
      email,
      passwordHash,
      role: 'admin',
      isVerified: true,
      twoFactorEnabled: false,
    }).returning();

    const newUser = result[0];
    if (!newUser) {
      throw new Error('Failed to create user');
    }

    console.log('✅ User created successfully!');
    console.log('📧 Email:', newUser.email);
    console.log('🆔 User ID:', newUser.id);
    console.log('👑 Role:', newUser.role);
    console.log('📅 Created:', newUser.createdAt);
    console.log('\n💡 The user can now sign in to the application.');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('Usage: npm run create-user <email> <password>');
  console.log('Example: npm run create-user admin@company.com securepassword123');
  process.exit(1);
}

const [email, password] = args;

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

// Validate password length
if (password.length < 8) {
  console.error('❌ Password must be at least 8 characters long');
  process.exit(1);
}

console.log('🚀 Starting user creation process...');
createUser(email, password);
