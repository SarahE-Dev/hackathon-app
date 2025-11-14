import mongoose from 'mongoose';
import { seedQuestions } from './questions.seed';
import { config } from 'dotenv';

config();

async function runSeeds() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hackathon-app';

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log('Starting database seeding...\n');

    // Run all seed functions
    console.log('📝 Seeding questions...');
    await seedQuestions();

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
