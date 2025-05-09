const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '.env') });

// Add test-specific configuration
const TEST_DB_NAME = 'test_barter_app';

beforeAll(async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set in server/.env');
    }
    
    // Parse the existing MongoDB URI and replace the database name
    const uri = new URL(process.env.MONGODB_URI);
    uri.pathname = `/${TEST_DB_NAME}`;
    
    await mongoose.connect(uri.toString(), {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
});

beforeEach(async () => {
  try {
    // Clear all collections before each test
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('Error clearing collections:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    // Just clear collections instead of dropping the database
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}); 