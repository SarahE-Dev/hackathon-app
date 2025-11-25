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
      slug: 'justice-through-code',
      settings: {
        allowSelfRegistration: true,
      },
    });
    logger.info(`Created organization: ${organization.name}`);

    // Create Users with different roles
    const hashedPassword = await bcrypt.hash('Demo@123456', 10);

    const users = await User.create([
      // Admin
      {
        email: 'admin@example.com',
        passwordHash: hashedPassword,
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
        passwordHash: hashedPassword,
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
        passwordHash: hashedPassword,
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
        passwordHash: hashedPassword,
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
        passwordHash: hashedPassword,
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
        passwordHash: hashedPassword,
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
        passwordHash: hashedPassword,
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
      {
        title: 'What is JavaScript?',
        type: 'mcq-single',
        content: {
          prompt: 'What is JavaScript?',
          options: [
            { id: 'a', text: 'A server-side language', isCorrect: false },
            { id: 'b', text: 'A client-side scripting language', isCorrect: true },
            { id: 'c', text: 'A database language', isCorrect: false },
            { id: 'd', text: 'A markup language', isCorrect: false },
          ],
          correctAnswer: 'b',
        },
        points: 10,
        difficulty: 'easy',
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Variable Declaration in JavaScript',
        type: 'mcq-single',
        content: {
          prompt: 'Which keyword is used to declare a constant variable in JavaScript?',
          options: [
            { id: 'a', text: 'const', isCorrect: true },
            { id: 'b', text: 'var', isCorrect: false },
            { id: 'c', text: 'let', isCorrect: false },
            { id: 'd', text: 'static', isCorrect: false },
          ],
          correctAnswer: 'a',
        },
        points: 10,
        difficulty: 'easy',
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Array Methods in JavaScript',
        type: 'mcq-multi',
        content: {
          prompt: 'Which of the following are array methods in JavaScript? (Select all that apply)',
          options: [
            { id: 'a', text: 'map()', isCorrect: true },
            { id: 'b', text: 'filter()', isCorrect: true },
            { id: 'c', text: 'execute()', isCorrect: false },
            { id: 'd', text: 'reduce()', isCorrect: true },
          ],
          correctAnswer: ['a', 'b', 'd'],
        },
        points: 15,
        difficulty: 'medium',
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'FizzBuzz Challenge',
        type: 'coding',
        content: {
          prompt: 'Write a function that returns "Fizz" for multiples of 3, "Buzz" for multiples of 5, and "FizzBuzz" for multiples of both.',
          codeTemplate: 'function fizzBuzz(n) {\n  // Your code here\n}',
          language: 'javascript',
          testCases: [
            {
              id: '1',
              input: 'fizzBuzz(3)',
              expectedOutput: '"Fizz"',
              isHidden: false,
              points: 5,
            },
          ],
        },
        points: 25,
        difficulty: 'medium',
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Explain Closures',
        type: 'long-form',
        content: {
          prompt: 'Explain what a closure is in JavaScript and provide an example.',
        },
        points: 20,
        difficulty: 'hard',
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'What is async/await?',
        type: 'freeform',
        content: {
          prompt: 'Describe the purpose and usage of async/await in JavaScript.',
        },
        points: 15,
        difficulty: 'medium',
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
    ]);

    logger.info(`Created ${questions.length} questions`);

    // Create Assessments
    const assessments = await Assessment.create([
      {
        title: 'JavaScript Fundamentals Quiz',
        description: 'Test your basic JavaScript knowledge',
        organizationId: organization._id,
        authorId: admin._id,
        sections: [
          {
            id: 'section1',
            title: 'Core Concepts',
            description: 'Test your understanding of JavaScript basics',
            questionIds: [questions[0]._id, questions[1]._id],
            randomizeQuestions: false,
            randomizeOptions: false,
          },
        ],
        settings: {
          totalTimeLimit: 30,
          attemptsAllowed: 3,
          showResultsImmediately: true,
          allowReview: true,
          allowBackward: true,
          shuffleSections: false,
          proctoring: {
            enabled: false,
            requireIdCheck: false,
            detectTabSwitch: false,
            detectCopyPaste: false,
            enableWebcam: false,
            enableScreenRecording: false,
            recordWebcam: false,
            recordScreen: false,
            takeSnapshots: false,
            snapshotIntervalMinutes: 5,
            fullscreenRequired: false,
            allowCalculator: true,
            allowScratchpad: true,
          },
          accessibility: {
            allowExtraTime: true,
            extraTimePercentage: 25,
            allowScreenReader: true,
            dyslexiaFriendlyFont: false,
          },
        },
        status: 'published',
        totalPoints: 20,
      },
      {
        title: 'Intermediate JavaScript Challenge',
        description: 'Challenge yourself with intermediate concepts',
        organizationId: organization._id,
        authorId: admin._id,
        sections: [
          {
            id: 'section1',
            title: 'Methods & Operators',
            questionIds: [questions[2]._id],
            randomizeQuestions: false,
            randomizeOptions: false,
          },
          {
            id: 'section2',
            title: 'Coding Problem',
            questionIds: [questions[3]._id],
            randomizeQuestions: false,
            randomizeOptions: false,
          },
        ],
        settings: {
          totalTimeLimit: 45,
          attemptsAllowed: 2,
          showResultsImmediately: false,
          allowReview: true,
          allowBackward: true,
          shuffleSections: false,
          proctoring: {
            enabled: true,
            requireIdCheck: false,
            detectTabSwitch: true,
            detectCopyPaste: true,
            enableWebcam: false,
            enableScreenRecording: false,
            recordWebcam: false,
            recordScreen: false,
            takeSnapshots: false,
            snapshotIntervalMinutes: 5,
            fullscreenRequired: false,
            allowCalculator: false,
            allowScratchpad: true,
          },
          accessibility: {
            allowExtraTime: false,
            allowScreenReader: false,
            dyslexiaFriendlyFont: false,
          },
        },
        status: 'published',
        totalPoints: 40,
      },
      {
        title: 'Advanced JavaScript Assessment',
        description: 'Test your advanced JavaScript knowledge',
        organizationId: organization._id,
        authorId: admin._id,
        sections: [
          {
            id: 'section1',
            title: 'Advanced Topics',
            questionIds: [questions[4]._id, questions[5]._id],
            randomizeQuestions: false,
            randomizeOptions: false,
          },
        ],
        settings: {
          totalTimeLimit: 60,
          attemptsAllowed: 1,
          showResultsImmediately: false,
          allowReview: false,
          allowBackward: false,
          shuffleSections: false,
          proctoring: {
            enabled: true,
            requireIdCheck: true,
            detectTabSwitch: true,
            detectCopyPaste: true,
            enableWebcam: true,
            enableScreenRecording: false,
            recordWebcam: false,
            recordScreen: false,
            takeSnapshots: false,
            snapshotIntervalMinutes: 10,
            fullscreenRequired: true,
            allowCalculator: false,
            allowScratchpad: true,
          },
          accessibility: {
            allowExtraTime: true,
            extraTimePercentage: 50,
            allowScreenReader: true,
            dyslexiaFriendlyFont: true,
          },
        },
        status: 'published',
        totalPoints: 35,
      },
    ]);

    logger.info(`Created ${assessments.length} assessments`);

    // Create Teams - 6 teams with 2 fellows each
    const teams = await Team.create([
      {
        name: 'Code Wizards',
        organizationId: organization._id,
        memberIds: [fellows[0]._id, fellows[1]._id],
        projectTitle: 'AI-Powered Study Assistant',
        description: 'A smart study assistant using AI for personalized learning',
        track: 'Education',
        repoUrl: 'https://github.com/example/ai-study-assistant',
        demoUrl: 'https://ai-study-assistant.demo.com',
        videoUrl: 'https://youtube.com/watch?v=example1',
        projectExplanation: 'Our project leverages machine learning for personalized recommendations.',
        technicalApproach: 'Built with Node.js, React, and TensorFlow.js',
        challengesOvercome: 'Overcame model accuracy issues with data augmentation',
        disqualified: false,
      },
      {
        name: 'Data Ninjas',
        organizationId: organization._id,
        memberIds: [fellows[2]._id, fellows[3]._id],
        projectTitle: 'Community Health Tracker',
        description: 'Track and visualize community health metrics',
        track: 'Health & Wellness',
        repoUrl: 'https://github.com/example/health-tracker',
        demoUrl: 'https://health-tracker.demo.com',
        videoUrl: 'https://youtube.com/watch?v=example2',
        projectExplanation: 'Comprehensive health monitoring system for communities',
        technicalApproach: 'Python backend with Vue.js and D3.js visualizations',
        challengesOvercome: 'Handled real-time data sync and privacy concerns',
        disqualified: false,
      },
      {
        name: 'Tech Titans',
        organizationId: organization._id,
        memberIds: [fellows[4]._id, fellows[5]._id],
        projectTitle: 'Smart Energy Monitor',
        description: 'Monitor and optimize energy usage to reduce carbon footprint',
        track: 'Sustainability',
        repoUrl: 'https://github.com/example/energy-monitor',
        demoUrl: 'https://energy-monitor.demo.com',
        videoUrl: 'https://youtube.com/watch?v=example3',
        projectExplanation: 'IoT-based system to track and optimize energy consumption',
        technicalApproach: 'Arduino sensors connected to cloud analytics platform',
        challengesOvercome: 'Solved connectivity issues with edge computing',
        disqualified: false,
      },
      {
        name: 'Innovators',
        organizationId: organization._id,
        memberIds: [fellows[6]._id, fellows[7]._id],
        projectTitle: 'Business Network Platform',
        description: 'Connect entrepreneurs and investors for business growth',
        track: 'Finance & Business',
        repoUrl: 'https://github.com/example/business-connect',
        demoUrl: 'https://business-connect.demo.com',
        videoUrl: 'https://youtube.com/watch?v=example4',
        projectExplanation: 'Platform matching entrepreneurs with investors',
        technicalApproach: 'Next.js, PostgreSQL, and Redis for matching',
        challengesOvercome: 'Implemented complex matching algorithms',
        disqualified: false,
      },
      {
        name: 'Future Builders',
        organizationId: organization._id,
        memberIds: [fellows[8]._id, fellows[9]._id],
        projectTitle: 'Skills Marketplace',
        description: 'Marketplace for skill-sharing opportunities',
        track: 'Education',
        repoUrl: 'https://github.com/example/skills-marketplace',
        demoUrl: 'https://skills-marketplace.demo.com',
        videoUrl: 'https://youtube.com/watch?v=example5',
        projectExplanation: 'Connect skill seekers with skill sharers',
        technicalApproach: 'Microservices with Kubernetes',
        challengesOvercome: 'Managed scalability through optimization',
        disqualified: false,
      },
      {
        name: 'Debug Squad',
        organizationId: organization._id,
        memberIds: [fellows[10]._id, fellows[11]._id],
        projectTitle: 'Code Review Tool',
        description: 'AI-powered collaborative code review tool',
        track: 'Developer Tools',
        repoUrl: 'https://github.com/example/code-review-tool',
        demoUrl: 'https://code-review.demo.com',
        videoUrl: 'https://youtube.com/watch?v=example6',
        projectExplanation: 'AI-enhanced code review platform',
        technicalApproach: 'FastAPI with React and OpenAI integration',
        challengesOvercome: 'Integrated multiple code analysis tools',
        disqualified: false,
      },
    ]);

    logger.info(`Created ${teams.length} teams`);

    // Create Hackathon Session for December 13, 2025 (4 hours)
    // Filter for coding questions only
    const codingQuestions = questions.filter(q => q.type === 'coding');

    // Create hackathon session with coding problems
    const hackathonSession = await HackathonSession.create({
      title: 'Justice Through Code - Hackathon Challenge',
      description: 'December 13, 2025 - 4 hour live coding hackathon event',
      organizationId: organization._id,
      startTime: new Date('2025-12-13T09:00:00Z'),
      endTime: new Date('2025-12-13T13:00:00Z'),
      duration: 240, // 4 hours in minutes
      problems: codingQuestions.map((q, index) => ({
        problemId: q._id,
        title: q.title,
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        points: q.points,
        order: index + 1,
      })),
      teams: teams.map(t => t._id),
      proctoring: {
        enabled: true,
        requireFullscreen: true,
        detectTabSwitch: true,
        detectCopyPaste: true,
        detectIdle: true,
        idleTimeoutMinutes: 10,
        allowCalculator: false,
        allowNotes: true,
        recordScreen: false,
        recordWebcam: false,
        takeSnapshots: false,
        snapshotIntervalMinutes: 10,
        requireIdentityCheck: false,
      },
      status: 'scheduled',
      isActive: false,
      accommodations: [],
      createdBy: admin._id,
    });

    logger.info(`Created hackathon session: ${hackathonSession.title}`);

    logger.info('✅ Database seeding completed successfully!');

    return {
      organization,
      users: {
        admin,
        proctor,
        judges: [judge1, judge2, judge3],
        grader,
        fellows,
      },
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
