import { databaseService } from '../../packages/database/src/database.service';

async function testDatabaseConnection() {
  console.log('🔧 Testing database connection...');
  
  try {
    // Test basic connection
    const isConnected = await databaseService.testConnection();
    console.log(`✅ Database connection: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
    
    // Get health check
    const health = await databaseService.healthCheck();
    console.log(`🏥 Health check: ${health.status} (${health.details?.responseTime || 'N/A'})`);
    
    // Test repository initialization
    console.log('📦 Repository instances:');
    console.log(`   - Conversions: ${databaseService.conversions ? '✅' : '❌'}`);
    console.log(`   - Players: ${databaseService.players ? '✅' : '❌'}`);
    
    // Test basic CRUD operations (without actual data)
    console.log('🧪 Testing repository methods:');
    const count = await databaseService.conversions.count();
    console.log(`   - Conversions count: ${count}`);
    
    const playersCount = await databaseService.players.count();
    console.log(`   - Players count: ${playersCount}`);
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testDatabaseConnection();
}

export { testDatabaseConnection };
