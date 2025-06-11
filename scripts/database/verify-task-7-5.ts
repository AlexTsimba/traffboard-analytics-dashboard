import { databaseService, db } from '../../packages/database/src/database.service';
import { sql } from 'drizzle-orm';

async function detailedVerification() {
  console.log('🔍 TASK 7.5 DATABASE VERIFICATION');
  console.log('==================================');
  
  try {
    // Basic connection test
    console.log('🔧 Testing database connection...');
    const isConnected = await databaseService.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection: SUCCESS');

    // Get players data analysis
    console.log('\n👥 PLAYERS DATA ANALYSIS:');
    console.log('=========================');
    
    const playersCount = await databaseService.players.count();
    console.log(`📊 Total Players Imported: ${playersCount}`);
    
    // Check unique player IDs
    const uniquePlayerIds = await db.execute(sql`
      SELECT COUNT(DISTINCT player_id) as unique_count FROM players
    `);
    console.log(`🆔 Unique Player IDs: ${uniquePlayerIds[0].unique_count}`);
    
    // Check date distribution
    const dateDistribution = await db.execute(sql`
      SELECT 
        DATE(date) as import_date,
        COUNT(*) as record_count
      FROM players 
      GROUP BY DATE(date)
      ORDER BY import_date DESC
      LIMIT 10
    `);
    
    console.log('\n📅 Recent Import Dates:');
    dateDistribution.forEach(row => {
      console.log(`   ${row.import_date}: ${row.record_count} records`);
    });

    // Check for email field in schema
    console.log('\n📧 EMAIL FIELD VERIFICATION:');
    console.log('============================');
    
    const schemaInfo = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'players' 
        AND column_name LIKE '%email%'
    `);
    
    if (schemaInfo.length === 0) {
      console.log('✅ Email field properly removed (privacy compliance)');
    } else {
      console.log('⚠️ Email-related columns found:');
      schemaInfo.forEach(col => {
        console.log(`   - ${col.column_name}`);
      });
    }

    // Check database constraints
    console.log('\n🔒 DATABASE CONSTRAINTS VERIFICATION:');
    console.log('====================================');
    
    const constraints = await db.execute(sql`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        STRING_AGG(kcu.column_name, ', ') as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'players' 
        AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
      GROUP BY tc.constraint_name, tc.constraint_type
      ORDER BY tc.constraint_type
    `);

    constraints.forEach(constraint => {
      console.log(`${constraint.constraint_type}: ${constraint.columns}`);
      if (constraint.constraint_type === 'UNIQUE' && constraint.columns.includes('player_id') && constraint.columns.includes('date')) {
        console.log('✅ Composite unique constraint (player_id, date) verified');
      }
    });

    // Check for recent errors or processing issues
    console.log('\n🔍 DATA QUALITY VERIFICATION:');
    console.log('============================');
    
    // Check for null values in critical fields
    const nullChecks = await db.execute(sql`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN player_id IS NULL THEN 1 END) as null_player_ids,
        COUNT(CASE WHEN partner_id IS NULL THEN 1 END) as null_partner_ids,
        COUNT(CASE WHEN date IS NULL THEN 1 END) as null_dates
      FROM players
    `);
    
    const nullData = nullChecks[0];
    console.log(`📊 Total Records: ${nullData.total_records}`);
    console.log(`❌ Null Player IDs: ${nullData.null_player_ids}`);
    console.log(`❌ Null Partner IDs: ${nullData.null_partner_ids}`);
    console.log(`❌ Null Dates: ${nullData.null_dates}`);
    
    if (nullData.null_player_ids === 0 && nullData.null_partner_ids === 0 && nullData.null_dates === 0) {
      console.log('✅ No critical null values found');
    }

    // Check conversions data
    console.log('\n📈 CONVERSIONS DATA:');
    console.log('===================');
    const conversionsCount = await databaseService.conversions.count();
    console.log(`📊 Total Conversions: ${conversionsCount}`);

    // Final success rate calculation
    console.log('\n🎯 IMPORT SUCCESS ANALYSIS:');
    console.log('===========================');
    console.log(`📤 Expected Import: 4580 players`);
    console.log(`📥 Successfully Imported: ${playersCount} players`);
    
    const successRate = ((playersCount / 4580) * 100).toFixed(2);
    console.log(`✅ Success Rate: ${successRate}%`);
    
    if (playersCount === 4580) {
      console.log('🎉 PERFECT IMPORT: All 4580 players successfully imported!');
    } else if (successRate >= 98) {
      console.log('✅ EXCELLENT IMPORT: Success rate over 98%');
    } else {
      console.log(`⚠️ REVIEW NEEDED: Success rate ${successRate}%`);
    }

    console.log('\n✅ Task 7.5 verification completed successfully!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

console.log('🚀 Starting detailed Task 7.5 verification...\n');
detailedVerification();
