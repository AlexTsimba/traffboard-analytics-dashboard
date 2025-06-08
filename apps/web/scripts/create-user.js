#!/usr/bin/env node

/**
 * Script to create users manually for internal use
 * Usage: npm run create-user <email> <password>
 */

const { db } = require('@traffboard/database');
const { users } = require('@traffboard/database');
const { hashPassword } = require('@traffboard/auth');
const { eq } = require('drizzle-orm');

async function createUser(email, password) {
  try {
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      console.error('❌ User already exists with email:', email);
      process.exit(1);
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const result = await db.insert(users).values({
      email,
      passwordHash,
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
    console.log('📅 Created:', newUser.createdAt);
    console.log('\n💡 The user can now sign in and set up 2FA if desired.');

  } catch (error) {
    console.error('❌ Error creating user:', error);
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

createUser(email, password);
