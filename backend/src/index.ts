import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { ProctorService } from './services/proctorService';
import { TeamCollaborationService } from './services/teamCollaborationService';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import assessmentRoutes from './routes/assessments';
import sessionRoutes from './routes/sessions';
import attemptRoutes from './routes/attempts';
import gradeRoutes from './routes/grades';
import teamRoutes from './routes/teams';
import proctoringRoutes from './routes/proctoring';
import problemRoutes from './routes/problems';
import organizationRoutes from './routes/organizations';
import codeExecutionRoutes from './routes/codeExecution';
import judgeScoreRoutes from './routes/judgeScores';
import leaderboardRoutes from './routes/leaderboard';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/code', codeExecutionRoutes);
app.use('/api/judge-scores', judgeScoreRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Error handling
app.use(errorHandler);

// Initialize WebSocket services
let proctorService: ProctorService;
let teamCollaborationService: TeamCollaborationService;

// Start server
const startServer = async () => {
  try {
    await connectDatabase();

    // Initialize WebSocket services after DB connection
    proctorService = new ProctorService(httpServer);
    logger.info('Proctoring WebSocket service initialized');

    teamCollaborationService = new TeamCollaborationService(httpServer);
    logger.info('Team collaboration WebSocket service initialized');

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { proctorService, teamCollaborationService };
