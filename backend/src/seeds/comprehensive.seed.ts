import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Organization from '../models/Organization';
import Assessment from '../models/Assessment';
import Question from '../models/Question';
import Team from '../models/Team';
import HackathonSession from '../models/HackathonSession';
import { logger } from '../utils/logger';

export async function seedComprehensive() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Assessment.deleteMany({});
    await Question.deleteMany({});
    await Team.deleteMany({});
    await HackathonSession.deleteMany({});
    
    logger.info('Cleared existing data');

    // Create Organization
    const organization = await Organization.create({
      name: 'Justice Through Code',
      description: 'Empowering communities through technology education',
      settings: {
        allowSelfRegistration: true,
        defaultRoles: ['fellow'],
      },
    });
    logger.info(`Created organization: ${organization.name}`);

    // Create Users with different roles
    const hashedPassword = await bcrypt.hash('Demo@123456', 10);

    const users = await User.create([
      // Admin
      {
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        roles: [
          { role: 'admin', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      // Proctor
      {
        email: 'proctor@example.com',
        password: hashedPassword,
        firstName: 'Proctor',
        lastName: 'Monitor',
        roles: [
          { role: 'proctor', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      // Judges
      {
        email: 'judge1@example.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        roles: [
          { role: 'judge', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'judge2@example.com',
        password: hashedPassword,
        firstName: 'Michael',
        lastName: 'Chen',
        roles: [
          { role: 'judge', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'judge3@example.com',
        password: hashedPassword,
        firstName: 'Emily',
        lastName: 'Rodriguez',
        roles: [
          { role: 'judge', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      // Grader
      {
        email: 'grader@example.com',
        password: hashedPassword,
        firstName: 'Grader',
        lastName: 'Smith',
        roles: [
          { role: 'grader', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      // Fellows (JTC Participants)
      ...Array.from({ length: 20 }, (_, i) => ({
        email: `fellow${i + 1}@example.com`,
        password: hashedPassword,
        firstName: ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Dakota', 'Avery'][i % 8],
        lastName: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][i % 5],
        roles: [
          { role: 'fellow', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      })),
    ]);

    const [admin, proctor, judge1, judge2, judge3, grader, ...fellows] = users;
    logger.info(`Created ${users.length} users`);

    // Create Questions for Assessments
    const questions = await Question.create([
      // MCQ Questions
      {
        title: 'JavaScript Basics',
        type: 'multiple-choice',
        content: {
          text: 'What is the output of: console.log(typeof null)?',
          options: [
            { id: 'a', text: 'object', isCorrect: true },
            { id: 'b', text: 'null', isCorrect: false },
            { id: 'c', text: 'undefined', isCorrect: false },
            { id: 'd', text: 'number', isCorrect: false },
          ],
        },
        points: 10,
        difficulty: 'easy',
        organizationId: organization._id,
        status: 'published',
      },
      {
        title: 'Python Data Types',
        type: 'multiple-choice',
        content: {
          text: 'Which data type is mutable in Python?',
          options: [
            { id: 'a', text: 'tuple', isCorrect: false },
            { id: 'b', text: 'string', isCorrect: false },
            { id: 'c', text: 'list', isCorrect: true },
            { id: 'd', text: 'int', isCorrect: false },
          ],
        },
        points: 10,
        difficulty: 'easy',
        organizationId: organization._id,
        status: 'published',
      },
      // Coding Questions
      {
        title: 'Reverse a String',
        type: 'coding',
        content: {
          text: 'Write a function that reverses a string.',
          starterCode: 'function reverseString(str) {\n  // Your code here\n}',
          testCases: [
            {
              input: '"hello"',
              expectedOutput: '"olleh"',
              points: 5,
            },
            {
              input: '"JavaScript"',
              expectedOutput: '"tpircSavaJ"',
              points: 5,
            },
          ],
          allowedLanguages: ['javascript', 'python', 'java'],
        },
        points: 20,
        difficulty: 'medium',
        organizationId: organization._id,
        status: 'published',
      },
      {
        title: 'Two Sum Problem',
        type: 'coding',
        content: {
          text: 'Given an array of integers and a target, return indices of two numbers that add up to target.',
          starterCode: 'function twoSum(nums, target) {\n  // Your code here\n}',
          testCases: [
            {
              input: '[2,7,11,15], 9',
              expectedOutput: '[0,1]',
              points: 10,
            },
            {
              input: '[3,2,4], 6',
              expectedOutput: '[1,2]',
              points: 10,
            },
          ],
          allowedLanguages: ['javascript', 'python', 'java'],
        },
        points: 30,
        difficulty: 'hard',
        organizationId: organization._id,
        status: 'published',
      },
      // Essay Questions
      {
        title: 'System Design',
        type: 'long-answer',
        content: {
          text: 'Explain how you would design a URL shortening service like bit.ly. Consider scalability, database design, and potential bottlenecks.',
          wordLimit: 500,
        },
        points: 25,
        difficulty: 'hard',
        organizationId: organization._id,
        status: 'published',
      },
      {
        title: 'Algorithm Explanation',
        type: 'short-answer',
        content: {
          text: 'Explain the time complexity of binary search and why it\'s efficient.',
          wordLimit: 150,
        },
        points: 15,
        difficulty: 'medium',
        organizationId: organization._id,
        status: 'published',
      },
    ]);

    logger.info(`Created ${questions.length} questions`);

    // Create Assessments
    const assessments = await Assessment.create([
      {
        title: 'JavaScript Fundamentals Quiz',
        description: 'Test your JavaScript knowledge with this comprehensive quiz',
        organizationId: organization._id,
        authorId: admin._id,
        sections: [
          {
            id: 'section1',
            title: 'Core Concepts',
            questionIds: [questions[0]._id, questions[1]._id],
          },
        ],
        settings: {
          timeLimit: 30,
          passingScore: 70,
          attempts: 3,
          proctoring: {
            enabled: true,
            requireWebcam: false,
            detectTabSwitch: true,
            preventCopyPaste: true,
          },
          randomizeQuestions: false,
          showResults: true,
        },
        status: 'published',
        publishedAt: new Date(),
        publishedSnapshot: {
          version: 1,
          assessment: {} as any,
          questions: [questions[0], questions[1]],
          publishedAt: new Date(),
        },
      },
      {
        title: 'Algorithm Challenge',
        description: 'Solve coding problems to test your algorithmic thinking',
        organizationId: organization._id,
        authorId: admin._id,
        sections: [
          {
            id: 'section1',
            title: 'Coding Problems',
            questionIds: [questions[2]._id, questions[3]._id],
          },
        ],
        settings: {
          timeLimit: 60,
          passingScore: 60,
          attempts: 2,
          proctoring: {
            enabled: true,
            requireWebcam: false,
            detectTabSwitch: true,
            preventCopyPaste: false, // Allow for coding
          },
          randomizeQuestions: false,
          showResults: false,
        },
        status: 'published',
        publishedAt: new Date(),
        publishedSnapshot: {
          version: 1,
          assessment: {} as any,
          questions: [questions[2], questions[3]],
          publishedAt: new Date(),
        },
      },
      {
        title: 'Technical Interview Prep',
        description: 'Comprehensive technical interview preparation',
        organizationId: organization._id,
        authorId: admin._id,
        sections: [
          {
            id: 'section1',
            title: 'Theory',
            questionIds: [questions[4]._id, questions[5]._id],
          },
        ],
        settings: {
          timeLimit: 45,
          passingScore: 75,
          attempts: 1,
          proctoring: {
            enabled: true,
            requireWebcam: true,
            detectTabSwitch: true,
            preventCopyPaste: true,
          },
          randomizeQuestions: false,
          showResults: false,
        },
        status: 'published',
        publishedAt: new Date(),
        publishedSnapshot: {
          version: 1,
          assessment: {} as any,
          questions: [questions[4], questions[5]],
          publishedAt: new Date(),
        },
      },
    ]);

    logger.info(`Created ${assessments.length} assessments`);

    // Create Teams
    const teams = await Team.create([
      {
        name: 'Code Wizards',
        memberIds: [fellows[0]._id, fellows[1]._id, fellows[2]._id, fellows[3]._id],
        organizationId: organization._id,
        projectTitle: 'AI-Powered Study Assistant',
        description: 'A smart study assistant that uses AI to help students learn more effectively',
        repoUrl: 'https://github.com/example/ai-study-assistant',
        demoUrl: 'https://ai-study-assistant.demo.com',
        videoUrl: 'https://youtube.com/watch?v=example1',
        submittedAt: new Date(),
        track: 'Education',
      },
      {
        name: 'Data Ninjas',
        memberIds: [fellows[4]._id, fellows[5]._id, fellows[6]._id],
        organizationId: organization._id,
        projectTitle: 'Community Health Tracker',
        description: 'Track and visualize community health metrics to improve public health outcomes',
        repoUrl: 'https://github.com/example/health-tracker',
        demoUrl: 'https://health-tracker.demo.com',
        videoUrl: 'https://youtube.com/watch?v=example2',
        submittedAt: new Date(),
        track: 'Healthcare',
      },
      {
        name: 'Tech Titans',
        memberIds: [fellows[7]._id, fellows[8]._id, fellows[9]._id, fellows[10]._id],
        organizationId: organization._id,
        projectTitle: 'Green Energy Monitor',
        description: 'Monitor and optimize energy consumption in real-time',
        repoUrl: 'https://github.com/example/energy-monitor',
        demoUrl: 'https://energy-monitor.demo.com',
        videoUrl: 'https://youtube.com/watch?v=example3',
        submittedAt: new Date(),
        track: 'Sustainability',
      },
      {
        name: 'Innovators',
        memberIds: [fellows[11]._id, fellows[12]._id, fellows[13]._id],
        organizationId: organization._id,
        projectTitle: 'Local Business Connect',
        description: 'Platform connecting local businesses with community members',
        repoUrl: 'https://github.com/example/business-connect',
        demoUrl: 'https://business-connect.demo.com',
        submittedAt: new Date(),
        track: 'Community',
      },
      {
        name: 'Future Builders',
        memberIds: [fellows[14]._id, fellows[15]._id, fellows[16]._id, fellows[17]._id],
        organizationId: organization._id,
        projectTitle: 'Skills Marketplace',
        description: 'Connect people who want to learn skills with local mentors',
        repoUrl: 'https://github.com/example/skills-marketplace',
        submittedAt: new Date(),
        track: 'Education',
      },
      {
        name: 'Debug Squad',
        memberIds: [fellows[18]._id, fellows[19]._id],
        organizationId: organization._id,
        projectTitle: 'Code Review Assistant',
        description: 'AI-powered code review tool to help developers write better code',
        track: 'Developer Tools',
        // Not submitted yet
      },
    ]);

    logger.info(`Created ${teams.length} teams`);

    // Create Hackathon Session
    const hackathonSession = await HackathonSession.create({
      title: 'Justice Through Code Hackathon 2024',
      description: 'Build solutions that empower communities through technology',
      organizationId: organization._id,
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Started 2 days ago
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Ends in 5 days
      duration: 7 * 24 * 60, // 7 days in minutes
      problems: [
        {
          problemId: questions[2]._id,
          title: 'Reverse a String',
          difficulty: 'medium',
          points: 20,
          order: 1,
        },
        {
          problemId: questions[3]._id,
          title: 'Two Sum Problem',
          difficulty: 'hard',
          points: 30,
          order: 2,
        },
      ],
      teams: teams.map(t => t._id),
      proctoring: {
        enabled: true,
        requireFullscreen: false,
        detectTabSwitch: true,
        detectCopyPaste: true,
        detectIdle: true,
        idleTimeoutMinutes: 15,
        allowCalculator: true,
        allowNotes: true,
        recordScreen: false,
        recordWebcam: false,
        takeSnapshots: false,
        snapshotIntervalMinutes: 10,
        requireIdentityCheck: false,
      },
      status: 'active',
      isActive: true,
      createdBy: admin._id,
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    logger.info('Created hackathon session');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ SEED DATA CREATED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   Organizations: 1`);
    console.log(`   Users: ${users.length}`);
    console.log(`     - Admins: 1`);
    console.log(`     - Proctors: 1`);
    console.log(`     - Judges: 3`);
    console.log(`     - Graders: 1`);
    console.log(`     - Fellows: 20`);
    console.log(`   Questions: ${questions.length}`);
    console.log(`   Assessments: ${assessments.length}`);
    console.log(`   Teams: ${teams.length}`);
    console.log(`   Hackathon Sessions: 1`);
    console.log('\n🔑 Login Credentials (all passwords: Demo@123456):');
    console.log('   Admin:     admin@example.com');
    console.log('   Proctor:   proctor@example.com');
    console.log('   Judge:     judge1@example.com, judge2@example.com, judge3@example.com');
    console.log('   Grader:    grader@example.com');
    console.log('   Fellows:   fellow1@example.com - fellow20@example.com');
    console.log('\n🎯 Ready to test!');
    console.log('='.repeat(50) + '\n');

    return {
      organization,
      users,
      questions,
      assessments,
      teams,
      hackathonSession,
    };
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}
