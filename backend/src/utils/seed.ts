import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Organization, Question, Assessment, Team } from '../models';
import { hashPassword } from './password';
import { UserRole, QuestionType, DifficultyLevel, AssessmentStatus } from '../../../shared/src/types/common';
import { logger } from './logger';

dotenv.config();

const seed = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hackathon-platform');
    logger.info('Connected to MongoDB');

    // Clear existing data (optional - comment out in production!)
    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      Question.deleteMany({}),
      Assessment.deleteMany({}),
      Team.deleteMany({}),
    ]);
    logger.info('Cleared existing data');

    // Create Organization
    const org = new Organization({
      name: 'Demo University',
      slug: 'demo-university',
      cohorts: [
        {
          name: 'Fall 2024',
          year: 2024,
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-12-31'),
        },
      ],
      settings: {
        allowSelfRegistration: false,
        defaultRetakePolicy: 'once-with-penalty',
        defaultLatePolicy: {
          enabled: true,
          sameDayDeadline: '21:30',
          weekendDeadline: 'Sunday 23:59',
          penaltyPercentage: 10,
        },
        timezone: 'America/New_York',
      },
    });
    await org.save();
    logger.info(`Created organization: ${org.name}`);

    // Create Users (all with password: password123)
    const demoPassword = await hashPassword('password123');

    // Create users with new email domains for proper role differentiation
    const admin = new User({
      email: 'admin@codearena.edu',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: demoPassword,
      roles: [{ role: UserRole.ADMIN, organizationId: org._id }],
      isActive: true,
      emailVerified: true,
    });
    await admin.save();
    logger.info(`Created admin: ${admin.email}`);

    const proctor = new User({
      email: 'proctor@codearena.edu',
      firstName: 'Proctor',
      lastName: 'User',
      passwordHash: demoPassword,
      roles: [
        { role: UserRole.PROCTOR, organizationId: org._id },
        { role: UserRole.GRADER, organizationId: org._id },
      ],
      isActive: true,
      emailVerified: true,
    });
    await proctor.save();
    logger.info(`Created proctor: ${proctor.email}`);

    const student = new User({
      email: 'student@codearena.edu',
      firstName: 'Student',
      lastName: 'User',
      passwordHash: demoPassword,
      roles: [{ role: UserRole.APPLICANT, organizationId: org._id, cohortId: org.cohorts[0]._id }],
      isActive: true,
      emailVerified: true,
    });
    await student.save();
    logger.info(`Created student: ${student.email}`);

    const judge = new User({
      email: 'judge@codearena.edu',
      firstName: 'Judge',
      lastName: 'User',
      passwordHash: demoPassword,
      roles: [{ role: UserRole.JUDGE, organizationId: org._id }],
      isActive: true,
      emailVerified: true,
    });
    await judge.save();
    logger.info(`Created judge: ${judge.email}`);

    // Create Teams and assign students to them
    const team1 = new Team({
      name: 'Code Warriors',
      projectTitle: 'Warrior Web App',
      description: 'A fierce team of coding warriors building innovative web applications',
      organizationId: org._id,
      memberIds: [student._id],
      track: 'Full Stack',
      disqualified: false,
    });
    await team1.save();
    logger.info(`Created team: ${team1.name} with ${team1.memberIds.length} members`);

    const team2 = new Team({
      name: 'Algorithm Avengers',
      projectTitle: 'Smart Algorithm Library',
      description: 'Masters of algorithms building intelligent data processing solutions',
      organizationId: org._id,
      memberIds: [student._id],
      track: 'Algorithms',
      disqualified: false,
    });
    await team2.save();
    logger.info(`Created team: ${team2.name} with ${team2.memberIds.length} members`);

    // Also create the old demo users for backwards compatibility
    const oldAdminPassword = await hashPassword('password123');
    const oldAdmin = new User({
      email: 'admin@demo.edu',
      firstName: 'Old Admin',
      lastName: 'User',
      passwordHash: oldAdminPassword,
      roles: [{ role: UserRole.ADMIN, organizationId: org._id }],
      isActive: true,
      emailVerified: true,
    });
    await oldAdmin.save();

    const oldProctor = new User({
      email: 'proctor@demo.edu',
      firstName: 'Old Proctor',
      lastName: 'User',
      passwordHash: oldAdminPassword,
      roles: [
        { role: UserRole.PROCTOR, organizationId: org._id },
        { role: UserRole.GRADER, organizationId: org._id },
      ],
      isActive: true,
      emailVerified: true,
    });
    await oldProctor.save();

    const oldStudent = new User({
      email: 'student@demo.edu',
      firstName: 'Old Student',
      lastName: 'User',
      passwordHash: oldAdminPassword,
      roles: [{ role: UserRole.APPLICANT, organizationId: org._id, cohortId: org.cohorts[0]._id }],
      isActive: true,
      emailVerified: true,
    });
    await oldStudent.save();

    const oldJudge = new User({
      email: 'judge@demo.edu',
      firstName: 'Old Judge',
      lastName: 'User',
      passwordHash: oldAdminPassword,
      roles: [{ role: UserRole.JUDGE, organizationId: org._id }],
      isActive: true,
      emailVerified: true,
    });
    await oldJudge.save();

    // Create Sample Questions

    // MCQ Question
    const mcqQuestion = new Question({
      type: QuestionType.MCQ_SINGLE,
      title: 'What is the capital of France?',
      content: {
        prompt: 'Select the correct answer:',
        options: [
          { id: 'a', text: 'London', isCorrect: false },
          { id: 'b', text: 'Berlin', isCorrect: false },
          { id: 'c', text: 'Paris', isCorrect: true },
          { id: 'd', text: 'Madrid', isCorrect: false },
        ],
        correctAnswer: 'c',
      },
      tags: ['geography', 'europe'],
      difficulty: DifficultyLevel.EASY,
      organizationId: org._id,
      authorId: admin._id,
      points: 1,
      status: AssessmentStatus.PUBLISHED,
    });
    await mcqQuestion.save();

    // Coding Question
    const codingQuestion = new Question({
      type: QuestionType.CODING,
      title: 'Write a function to sum two numbers',
      content: {
        prompt: 'Write a Python function called `add` that takes two numbers and returns their sum.',
        language: 'python',
        codeTemplate: 'def add(a, b):\n    # Your code here\n    pass',
        testCases: [
          {
            id: '1',
            input: '2, 3',
            expectedOutput: '5',
            isHidden: false,
            points: 1,
            timeLimit: 1000,
            memoryLimit: 256,
          },
          {
            id: '2',
            input: '10, -5',
            expectedOutput: '5',
            isHidden: true,
            points: 1,
            timeLimit: 1000,
            memoryLimit: 256,
          },
        ],
      },
      tags: ['programming', 'python', 'basic'],
      difficulty: DifficultyLevel.EASY,
      organizationId: org._id,
      authorId: admin._id,
      points: 2,
      status: AssessmentStatus.PUBLISHED,
    });
    await codingQuestion.save();

    // Freeform Question
    const freeformQuestion = new Question({
      type: QuestionType.FREEFORM,
      title: 'Explain the difference between let and const in JavaScript',
      content: {
        prompt: 'In 2-3 sentences, explain the difference between `let` and `const` in JavaScript.',
      },
      tags: ['javascript', 'programming', 'concepts'],
      difficulty: DifficultyLevel.MEDIUM,
      organizationId: org._id,
      authorId: admin._id,
      points: 3,
      status: AssessmentStatus.PUBLISHED,
    });
    await freeformQuestion.save();

    logger.info(`Created ${3} sample questions`);

    // Create Sample Assessment
    const assessment = new Assessment({
      title: 'Demo Technical Assessment',
      description: 'A sample assessment with multiple question types',
      organizationId: org._id,
      authorId: admin._id,
      sections: [
        {
          id: 'section-1',
          title: 'Multiple Choice',
          description: 'General knowledge questions',
          questionIds: [mcqQuestion._id],
          timeLimit: 5,
          randomizeQuestions: false,
          randomizeOptions: true,
        },
        {
          id: 'section-2',
          title: 'Coding Challenge',
          description: 'Programming questions',
          questionIds: [codingQuestion._id],
          timeLimit: 15,
          randomizeQuestions: false,
          randomizeOptions: false,
        },
        {
          id: 'section-3',
          title: 'Short Answer',
          description: 'Explain your understanding',
          questionIds: [freeformQuestion._id],
          timeLimit: 10,
          randomizeQuestions: false,
          randomizeOptions: false,
        },
      ],
      settings: {
        totalTimeLimit: 30,
        attemptsAllowed: 2,
        showResultsImmediately: false,
        allowReview: true,
        allowBackward: false,
        shuffleSections: false,
        startWindow: new Date(),
        endWindow: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        proctoring: {
          enabled: true,
          requireIdCheck: true,
          detectTabSwitch: true,
          detectCopyPaste: true,
          enableWebcam: false,
          enableScreenRecording: false,
          fullscreenRequired: false,
          allowCalculator: false,
          allowScratchpad: true,
        },
        accessibility: {
          allowExtraTime: true,
          extraTimePercentage: 50,
          allowScreenReader: true,
          dyslexiaFriendlyFont: false,
        },
      },
      status: AssessmentStatus.PUBLISHED,
      publishedSnapshot: {
        version: 1,
        assessment: {} as any, // Would be full assessment object
        questions: [mcqQuestion, codingQuestion, freeformQuestion].map(q => q.toObject()),
        publishedAt: new Date(),
        publishedBy: admin._id,
      },
      publishedAt: new Date(),
    });
    await assessment.save();
    logger.info(`Created assessment: ${assessment.title}`);

    // Print Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Database Seeded Successfully!');
    console.log('='.repeat(60));
    console.log('\n📋 Test Accounts (all use password: password123):');
    console.log('\n  🔴 Admin:');
    console.log(`    Email: admin@codearena.edu`);
    console.log(`    Password: password123`);
    console.log(`    Role: Admin (Full platform control)`);
    console.log('\n  🟡 Judge:');
    console.log(`    Email: judge@codearena.edu`);
    console.log(`    Password: password123`);
    console.log(`    Role: Judge (Evaluate hackathon submissions)`);
    console.log('\n  🟠 Proctor:');
    console.log(`    Email: proctor@codearena.edu`);
    console.log(`    Password: password123`);
    console.log(`    Role: Proctor + Grader (Monitor sessions & grade assessments)`);
    console.log('\n  🟢 Student:');
    console.log(`    Email: student@codearena.edu`);
    console.log(`    Password: password123`);
    console.log(`    Role: Applicant (Take assessments & participate in hackathons)`);
    console.log('\n📚 Sample Data:');
    console.log(`  Organization: ${org.name}`);
    console.log(`  Users: 8 (4 new + 4 legacy)`);
    console.log(`  Teams: 2 (Code Warriors, Algorithm Avengers)`);
    console.log(`  Questions: 3 (MCQ, Coding, Freeform)`);
    console.log(`  Assessment: ${assessment.title}`);
    console.log('\n🚀 Next Steps:');
    console.log('  1. Login with any account above to see role-specific dashboards');
    console.log('  2. Students are already assigned to teams for hackathon participation');
    console.log('  3. Admins can manage team assignments and create new teams');
    console.log('  4. Judges and proctors can monitor sessions and evaluate submissions\n');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
