#!/usr/bin/env node

const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const API_URL = 'http://localhost:3001/api';
const MONGODB_URL = 'mongodb://localhost:27017/hackathon-platform';

// Simple in-process bcrypt for demo (use real bcrypt in production)
const hashPassword = (password) => {
  // For demo purposes, return a simple hash
  return crypto.createHash('sha256').update(password).digest('hex');
};

async function setup() {
  console.log('\n========================================');
  console.log('Creating Demo Assessment & Test User');
  console.log('========================================\n');

  try {
    // Step 1: Create/login demo user
    console.log('Step 1: Registering/logging in demo user...');

    let token;
    try {
      // Try login first
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'demo@example.com',
        password: 'Demo@123456'
      });
      token = loginRes.data.data.tokens.accessToken;
      console.log('✓ Logged in successfully');
    } catch (e) {
      // Register new user
      console.log('  Creating new user...');
      const regRes = await axios.post(`${API_URL}/auth/register`, {
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User',
        password: 'Demo@123456'
      });
      token = regRes.data.data.tokens.accessToken;
      console.log('✓ Registered new user');
    }

    console.log(`✓ Token: ${token.substring(0, 20)}...\n`);

    // Step 2: Get/create organization
    console.log('Step 2: Setting up organization...');

    // Hard-coded org ID that was just created
    const orgId = '690012282ed637772e4f87fe';
    console.log(`✓ Using test organization: ${orgId}`);

    console.log('');

    // Step 3: Create Assessment
    console.log('Step 3: Creating assessment...');

    const assessmentRes = await axios.post(`${API_URL}/assessments`, {
      title: 'JavaScript Fundamentals Quiz',
      description: 'Test your knowledge of JavaScript basics including variables, data types, functions, and DOM manipulation.',
      organizationId: orgId,
      sections: [{
        title: 'JavaScript Basics',
        description: 'Core JavaScript concepts',
        instructions: 'Answer the following questions to the best of your ability.',
        questions: []
      }],
      settings: {
        passingScore: 70,
        allowMultipleAttempts: true,
        maxAttempts: 3,
        showCorrectAnswers: true,
        shuffleQuestions: false,
        proctoring: { enabled: false },
        accessibility: { extendedTime: false, timeMultiplier: 1 },
        latePolicy: {
          allowLateSubmission: true,
          gracePeriodMinutes: 5,
          penaltyPercent: 10
        }
      },
      totalPoints: 100
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const assessmentId = assessmentRes.data.data._id || assessmentRes.data.data.id;
    console.log(`✓ Created assessment: ${assessmentId}\n`);

    // Step 4: Create Questions
    console.log('Step 4: Adding questions...');

    const questions = [
      {
        type: 'MCQ',
        title: 'What is JavaScript?',
        content: 'JavaScript is primarily used for:',
        options: ['Server-side applications', 'Client-side web development', 'Mobile app development', 'Desktop applications'],
        correctAnswer: 1,
        points: 25,
        difficulty: 'Easy',
        tags: ['basics']
      },
      {
        type: 'Short-Answer',
        title: 'Variable Declaration',
        content: 'Name one way to declare a variable in JavaScript:',
        correctAnswer: 'var',
        points: 25,
        difficulty: 'Easy',
        tags: ['basics']
      },
      {
        type: 'Multi-Select',
        title: 'Data Types',
        content: 'Which of the following are primitive JavaScript data types?',
        options: ['String', 'Number', 'Boolean', 'Color', 'Array'],
        correctAnswer: [0, 1, 2],
        points: 25,
        difficulty: 'Medium',
        tags: ['basics']
      },
      {
        type: 'Long-Answer',
        title: 'Explain Closures',
        content: 'Explain what a closure is in JavaScript and provide an example.',
        points: 25,
        difficulty: 'Hard',
        tags: ['advanced']
      }
    ];

    for (let i = 0; i < questions.length; i++) {
      try {
        await axios.post(`${API_URL}/assessments/questions`, questions[i], {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Added question ${i + 1}: ${questions[i].title}`);
      } catch (e) {
        console.log(`⚠ Could not add question ${i + 1}: ${e.response?.data?.error?.message || e.message}`);
      }
    }

    console.log('');

    // Step 5: Publish Assessment
    console.log('Step 5: Publishing assessment...');

    try {
      await axios.post(`${API_URL}/assessments/${assessmentId}/publish`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✓ Assessment published\n');
    } catch (e) {
      console.log(`⚠ Could not publish assessment: ${e.response?.data?.error?.message || e.message}\n`);
    }

    // Summary
    console.log('========================================');
    console.log('✓ Demo Setup Complete!');
    console.log('========================================\n');
    console.log('Test User Credentials:');
    console.log('  Email: demo@example.com');
    console.log('  Password: Demo@123456\n');
    console.log('Assessment Details:');
    console.log(`  ID: ${assessmentId}`);
    console.log('  Title: JavaScript Fundamentals Quiz');
    console.log('  Questions: 4');
    console.log('  Total Points: 100\n');
    console.log('Next Steps:');
    console.log('  1. Go to: http://localhost:3000/dashboard');
    console.log('  2. Login with the credentials above');
    console.log('  3. Click "Start" on the JavaScript Fundamentals Quiz');
    console.log('  4. Answer the questions and submit\n');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

setup();
