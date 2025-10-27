# Hackathon Proctoring Platform

Production-level assessment and hackathon platform with proctoring, coding challenges, grading, and judging capabilities.

## Project Structure

```
hackathon-app/
├── frontend/          # Next.js 14 frontend
├── backend/           # Express.js backend API
├── code-runner/       # Code execution service
├── shared/            # Shared types and utilities
├── PROJECT_PLAN.md    # Detailed 10-week implementation plan
└── docker-compose.yml # Development environment
```

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Monaco Editor
- **Backend**: Express.js, TypeScript, Socket.io
- **Database**: MongoDB Atlas
- **Queue**: BullMQ + Redis
- **Code Runner**: Docker + isolated containers
- **Storage**: AWS S3 (or compatible)

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- MongoDB (local or Atlas)
- Redis (local or cloud)
- Docker (for code execution)

### Installation

1. **Install dependencies for all workspaces:**

```bash
npm install
```

2. **Set up environment variables:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start MongoDB and Redis using Docker:**

```bash
docker-compose up -d mongodb redis
```

4. **Run development servers:**

```bash
# Start both frontend and backend
npm run dev

# Or run individually
npm run dev:frontend
npm run dev:backend
npm run dev:runner
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Backend Health: http://localhost:3001/health

### Database Setup

The application will automatically connect to MongoDB. For the first run:

```bash
# Optional: Seed the database with sample data
npm run seed
```

## Development Workflow

### Project Phases (10-Week Plan)

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the complete implementation roadmap.

**Current Phase**: Foundation & Setup ✅

**Next Steps**:
1. Implement database schemas (Week 1-2)
2. Build authentication system (Week 1-2)
3. Create question bank (Week 3-4)
4. Build assessment builder (Week 3-4)

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific workspace
npm test --workspace=backend
npm test --workspace=frontend
```

### Linting

```bash
# Lint all workspaces
npm run lint

# Lint specific workspace
npm run lint --workspace=backend
```

### Building for Production

```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build --workspace=frontend
```

## Key Features (MVP)

### User Roles
- **Admin**: Full system control, user management, assessment creation
- **Proctor**: Monitor sessions, flag incidents, control timing
- **Grader**: Review submissions, apply rubrics, provide feedback
- **Judge**: Score hackathon projects, view leaderboard
- **Applicant**: Take assessments, submit work, view results

### Assessment Features
- Multiple question types (MCQ, freeform, coding, file upload)
- Timed sessions with accommodations
- Randomization and question pools
- Draft → Review → Publish workflow

### Proctoring
- Tab switch and blur detection
- Copy/paste monitoring
- IP and device fingerprinting
- Incident logging with timestamps
- Live proctor dashboard

### Coding Challenges
- Monaco editor (VS Code)
- Python support (more languages post-MVP)
- Visible and hidden test cases
- Per-test scoring
- Sandbox execution (3s timeout)

### Grading System
- Configurable rubrics
- Inline comments on code/text
- Draft and release workflow
- Regrade requests

### Hackathon Mode
- Team registration and management
- Judge assignment and rubrics
- Real-time leaderboard (admin view)
- Public reveal at scheduled time
- Tie-break rules

## API Documentation

### Authentication

```bash
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Core Endpoints

```bash
# Users
GET    /api/users
POST   /api/users
PUT    /api/users/:id

# Assessments
GET    /api/assessments
POST   /api/assessments
PUT    /api/assessments/:id
POST   /api/assessments/:id/publish

# Sessions
POST   /api/sessions
GET    /api/sessions/:id

# Attempts
POST   /api/attempts
GET    /api/attempts/:id
PUT    /api/attempts/:id/answer
POST   /api/attempts/:id/submit

# Grading
GET    /api/grades/queue
POST   /api/grades
POST   /api/grades/:id/release

# Hackathon
POST   /api/teams
GET    /api/leaderboard
POST   /api/judge-scores
```

### WebSocket Events

```javascript
// Connect to proctoring WebSocket
const socket = io('ws://localhost:3001');

// Join session
socket.emit('join-session', sessionId);

// Listen for proctor events
socket.on('proctor-event', (data) => {
  console.log('Event:', data);
});
```

## Database Schema

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for complete schema documentation.

### Core Collections:
- Users
- Organizations
- Questions
- Assessments
- Sessions
- Attempts
- Grades
- Teams
- JudgeScores
- ProctorEvents

## Security

- JWT authentication with refresh tokens
- Rate limiting on all endpoints
- Input validation with Zod
- Helmet.js for HTTP headers
- CORS configured for frontend origin
- Isolated Docker containers for code execution
- Signed URLs for file downloads

## Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

### Backend (Railway/Render/AWS)

```bash
cd backend
npm run build
npm start
```

### Environment Variables

Ensure all production environment variables are set:
- `MONGODB_URI`: MongoDB Atlas connection string
- `REDIS_HOST`, `REDIS_PORT`: Redis connection
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: Secure random strings
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: S3 credentials
- `FRONTEND_URL`, `BACKEND_URL`: Production URLs

## Monitoring

- Structured logging with Winston
- Error tracking (Sentry recommended)
- Performance monitoring
- Database query analysis

## Contributing

This is a production system. Follow these guidelines:

1. Create feature branches from `main`
2. Write tests for new features
3. Follow TypeScript strict mode
4. Update documentation
5. Request code review before merging

## Roadmap

### Week 1-2 (Current)
- [x] Project setup
- [x] Type definitions
- [ ] Database schemas
- [ ] Authentication system

### Week 3-4
- [ ] Question bank
- [ ] Assessment builder

### Week 5-6
- [ ] Session delivery
- [ ] Proctoring features

### Week 7
- [ ] Code execution engine

### Week 8
- [ ] Grading system

### Week 9-10
- [ ] Hackathon features
- [ ] Analytics and polish

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the complete timeline.

## License

MIT

## Support

For issues and questions, please open a GitHub issue or contact the development team.
