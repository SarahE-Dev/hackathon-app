import mongoose from 'mongoose';
import { seedComprehensive } from './comprehensive.seed';
import { config } from 'dotenv';

config();

async function runSeeds() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hackathon-platform';

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('Starting comprehensive database seeding...\n');

    // Run comprehensive seed
    await seedComprehensive();

    console.log('\n✅ All seeds completed successfully!');

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeds:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

runSeeds();
