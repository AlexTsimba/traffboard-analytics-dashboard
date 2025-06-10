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

async function updateUserPassword() {
  const client = new Client({
    connectionString: 'postgresql://traffboard_user:traffboard_password@localhost:5432/traffboard'
  });

  try {
    console.log('🔍 Connecting to database...');
    await client.connect();
    console.log('✅ Database connected successfully');

    const email = 'test@traffboard.com';
    const password = 'password123';

    // Generate proper password hash
    console.log('🔐 Generating proper password hash...');
    const passwordHash = await hashPassword(password);
    console.log('🔑 Generated hash:', passwordHash.substring(0, 20) + '...');
    
    // Update user with correct password hash
    console.log('🔄 Updating user password...');
    const result = await client.query(`
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE email = $2
      RETURNING id, email, role
    `, [passwordHash, email]);

    if (result.rows.length === 0) {
      console.error('❌ User not found');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('✅ Password updated successfully!');
    console.log('📧 Email:', user.email);
    console.log('🆔 User ID:', user.id);
    console.log('👑 Role:', user.role);
    console.log('\n💡 Login credentials (updated):');
    console.log('   Email: test@traffboard.com');
    console.log('   Password: password123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

updateUserPassword();
