import pkg from 'pg';
const { Client } = pkg;
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${salt}:${buf.toString('hex')}`;
}

async function createUser() {
  const client = new Client({
    connectionString: 'postgresql://traffboard_user:traffboard_password@localhost:5432/traffboard'
  });

  try {
    console.log('🔍 Connecting to database...');
    await client.connect();
    console.log('✅ Database connected successfully');

    const email = 'test@traffboard.com';
    const password = 'password123';

    // Check if user exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ User already exists with email:', email);
      process.exit(0);
    }

    // Create user
    console.log('🔐 Hashing password...');
    const passwordHash = await hashPassword(password);
    
    console.log('👤 Creating user...');
    const result = await client.query(`
      INSERT INTO users (email, password_hash, role, is_verified, two_factor_enabled, created_at, updated_at)
      VALUES ($1, $2, 'admin', true, false, NOW(), NOW())
      RETURNING id, email, role, created_at
    `, [email, passwordHash]);

    const newUser = result.rows[0];
    console.log('✅ User created successfully!');
    console.log('📧 Email:', newUser.email);
    console.log('🆔 User ID:', newUser.id);
    console.log('👑 Role:', newUser.role);
    console.log('📅 Created:', newUser.created_at);
    console.log('\n💡 Login credentials:');
    console.log('   Email: test@traffboard.com');
    console.log('   Password: password123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createUser();
