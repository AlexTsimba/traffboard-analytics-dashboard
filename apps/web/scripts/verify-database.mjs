import { db } from '@traffboard/database/index.js';
import { players, conversions } from '@traffboard/database/schema.js';
import { sql } from 'drizzle-orm';

async function verifyDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test database connection
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connected successfully');

    // Check if tables exist and get counts
    console.log('\n📊 Database State Verification:');
    console.log('==================================');

    // Check players table
    try {
      const playersCount = await db.select({ count: sql`count(*)` }).from(players);
      console.log(`👥 Total Players: ${playersCount[0]?.count || 0}`);

      // Check unique players
      const uniquePlayersCount = await db.select({ 
        count: sql`count(distinct player_id)` 
      }).from(players);
      console.log(`🆔 Unique Player IDs: ${uniquePlayersCount[0]?.count || 0}`);

      // Check date range
      const dateRange = await db.select({
        minDate: sql`min(date)`,
        maxDate: sql`max(date)`
      }).from(players);
      console.log(`📅 Date Range: ${dateRange[0]?.minDate} to ${dateRange[0]?.maxDate}`);

      // Check recent records
      const recentCount = await db.select({ 
        count: sql`count(*)` 
      }).from(players).where(sql`date >= '2025-06-01'`);
      console.log(`📈 Recent Records (June 2025+): ${recentCount[0]?.count || 0}`);

    } catch (error) {
      if (error.message.includes('relation "players" does not exist')) {
        console.log('❌ Players table does not exist');
      } else {
        console.log(`❌ Players table error: ${error.message}`);
      }
    }

    // Check conversions table
    try {
      const conversionsCount = await db.select({ count: sql`count(*)` }).from(conversions);
      console.log(`📈 Total Conversions: ${conversionsCount[0]?.count || 0}`);
    } catch (error) {
      if (error.message.includes('relation "conversions" does not exist')) {
        console.log('❌ Conversions table does not exist');
      } else {
        console.log(`❌ Conversions table error: ${error.message}`);
      }
    }

    // Check database schema info
    console.log('\n🏗️ Database Schema Verification:');
    console.log('================================');

    // Check if email column exists in players table
    try {
      const schemaInfo = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'players' 
        ORDER BY ordinal_position
      `);
      
      const emailColumn = schemaInfo.find(col => col.column_name === 'partners_email');
      if (emailColumn) {
        console.log('⚠️ Email column still exists in database!');
      } else {
        console.log('✅ Email column properly removed (privacy compliance)');
      }

      console.log(`📋 Players table has ${schemaInfo.length} columns`);

    } catch (error) {
      console.log(`❌ Schema check error: ${error.message}`);
    }

    // Check constraints
    try {
      const constraints = await db.execute(sql`
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'players' 
          AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
        ORDER BY tc.constraint_type, kcu.column_name
      `);

      console.log('\n🔒 Database Constraints:');
      console.log('=======================');
      constraints.forEach(constraint => {
        console.log(`${constraint.constraint_type}: ${constraint.column_name} (${constraint.constraint_name})`);
      });

    } catch (error) {
      console.log(`❌ Constraints check error: ${error.message}`);
    }

    console.log('\n✅ Database verification completed!');

  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('\n🔧 Database does not exist. Please create it first.');
    }
    console.error('Full error:', error);
    process.exit(1);
  }
}

console.log('🚀 Starting database verification...');
verifyDatabase();
