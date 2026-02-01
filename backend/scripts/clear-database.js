require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');

const clearDatabase = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('🗑️  Clearing database...');
    
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('📋 Found collections:', collectionNames);
    
    // Drop all collections
    for (const collectionName of collectionNames) {
      await mongoose.connection.db.dropCollection(collectionName);
      console.log(`✅ Dropped collection: ${collectionName}`);
    }
    
    console.log('✅ Database cleared successfully!');
    console.log('💡 You can now restart the application');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

clearDatabase();
