const mongoose = require('mongoose');
require('dotenv').config();

async function dropIndex() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    await db.collection('tradesessions').dropIndex('tradeRequestId_1');
    console.log('Successfully dropped tradeRequestId_1 index');

    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropIndex(); 