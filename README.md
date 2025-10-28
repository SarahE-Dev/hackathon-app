# CodeArena - Justice Through Code Hackathon Platform

Production-ready assessment and hackathon platform with proctoring, coding challenges, grading, and judging capabilities. Built with a neon cyberpunk design and complete containerization.

## Project Structure

```
hackathon-app/
├── frontend/              # Next.js 14 frontend (Tailwind CSS + neon theme)
├── backend/               # Express.js backend API (TypeScript)
├── code-runner/           # Code execution service (Docker-in-Docker)
├── shared/                # Shared types and utilities
├── docker-compose.yml     # Production Docker setup
├── docker-compose.dev.yml # Development Docker setup (hot-reload)
├── DOCKER_SETUP.md        # Complete Docker guide
├── IMPLEMENTATION_GUIDE.md # Feature roadmap
└── README.md              # This file
```

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Zustand, Monaco Editor
- **Backend**: Express.js, TypeScript, Socket.io, Mongoose, BullMQ
- **Database**: MongoDB 7.0 (containerized)
- **Cache & Queue**: Redis 7 (containerized)
- **Code Runner**: Node.js + Docker (isolated containers)
- **Deployment**: Docker Compose with multi-stage builds
- **Design**: Neon cyberpunk theme with glass morphism

## Quick Start

### Prerequisites

- Docker & Docker Compose (recommended)
- Node.js 18+ and npm (if running without Docker)
- Git

### Option 1: Docker (Recommended)

```bash
# Start all services in Docker
docker-compose up

# Or with clean build
docker-compose down && docker-compose build --no-cache && docker-compose up
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Start MongoDB and Redis (in Docker)
docker-compose up -d mongodb redis

# Run development servers
npm run dev:frontend &
npm run dev:backend &
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Backend Health: http://localhost:3001/health

### Create Demo Assessment

After starting the platform, create a demo assessment:

```bash
# Database will have a demo user ready
# Email: demo@example.com
# Password: Demo@123456
```

Then:
1. Go to http://localhost:3000/dashboard
2. Login with credentials above
3. Click "Start" on the JavaScript Fundamentals Quiz
4. Answer the 4 questions (MCQ, Short Answer, Multi-Select, Long Answer)
5. Submit and see your results

**Note**: If rate limiting blocks you during setup, wait a few minutes and try again.

## Features Implemented ✅

### Core Features
- ✅ User Authentication (JWT with refresh tokens)
- ✅ User Roles & Permissions (Admin, Proctor, Grader, Judge, Applicant)
- ✅ Assessment Creation & Publishing
- ✅ Question Bank (6 question types)
- ✅ Assessment Taking Interface
- ✅ Auto-save with Zustand state management
- ✅ Dashboard with assessment tracking
- ✅ Neon cyberpunk design theme
- ✅ Full Docker containerization
- ✅ Multi-stage Docker builds for production

### Question Types Supported
1. **Multiple Choice (MCQ)** - Single selection
2. **Multi-Select** - Multiple correct answers
3. **Short Answer** - Text input with validation
4. **Long Answer** - Long-form text with word count
5. **Coding** - Monaco editor with test cases
6. **File Upload** - Document/file submission

## Development Commands

### Building

```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build --workspace=frontend
npm run build --workspace=backend
```

### Development Mode (Local)

```bash
# Start all dev servers
npm run dev

# Or individually
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:3001
npm run dev:runner    # Code execution service
```

### Testing

```bash
# Run all tests
npm test

# Run specific workspace tests
npm test --workspace=backend
npm test --workspace=frontend
```

### Linting

```bash
# Lint all workspaces
npm run lint

# Fix linting issues
npm run lint:fix --workspace=frontend
```

## Upcoming Features 🚀

### In Progress
- **Results Pages** - View scores, feedback, and detailed breakdowns
- **Grading System** - Rubrics, inline comments, regrading
- **Proctoring Dashboard** - Real-time monitoring and incident tracking

### Planned
- **Hackathon Mode** - Teams, projects, leaderboards, judge scoring
- **Admin Dashboard** - User management, assessment analytics
- **Analytics** - Time-on-task, question statistics, performance reports
- **Code Execution** - Full code sandbox with test case validation
- **Advanced Proctoring** - Tab detection, copy-paste monitoring, device fingerprinting

## API Routes

### Authentication
```
POST   /api/auth/register        - Create new account
POST   /api/auth/login           - Login and get JWT
POST   /api/auth/refresh         - Refresh access token
POST   /api/auth/logout          - Logout
GET    /api/auth/me              - Get current user
```

### Assessments
```
GET    /api/assessments          - List published assessments
GET    /api/assessments/:id      - Get assessment details
POST   /api/assessments          - Create assessment (Admin/Proctor)
PUT    /api/assessments/:id      - Update assessment
POST   /api/assessments/:id/publish - Publish assessment (Admin)
```

### Questions
```
GET    /api/assessments/questions/list - Get question bank
GET    /api/assessments/questions/:id  - Get question details
POST   /api/assessments/questions      - Create question
PUT    /api/assessments/questions/:id  - Update question
POST   /api/assessments/questions/:id/publish - Publish question
```

### Attempts (Taking Assessments)
```
POST   /api/attempts/start       - Start new attempt
GET    /api/attempts/my-attempts - Get user's attempts
GET    /api/attempts/:id         - Get attempt details
PUT    /api/attempts/:id/answer  - Auto-save answer
POST   /api/attempts/:id/submit  - Submit attempt
POST   /api/attempts/:id/event   - Log proctor events
POST   /api/attempts/:id/upload  - Upload file
```

### Grades
```
GET    /api/grades/attempt/:id   - Get attempt grades
GET    /api/grades/assessment/:id - Get all attempt grades for assessment
POST   /api/grades               - Create/update grade
```

### Users & Organizations
```
GET    /api/users                - List users (Admin)
GET    /api/users/:id            - Get user details
PUT    /api/users/:id            - Update user
DELETE /api/users/:id            - Delete user (Admin)
```

## Docker Setup Guide

For complete Docker instructions, see [DOCKER_SETUP.md](./DOCKER_SETUP.md).

### Basic Docker Commands

```bash
# Start all services
docker-compose up

# Stop all services
docker-compose down

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Rebuild images
docker-compose build --no-cache

# Clean everything and start fresh
docker-compose down -v && docker-compose up
```

### Database Access

```bash
# MongoDB shell
docker exec hackathon-mongodb mongosh hackathon-platform

# Redis CLI
docker exec hackathon-redis redis-cli
```

## Project Architecture

### Frontend Stack
- **Framework**: Next.js 14 with App Router
- **State Management**: Zustand (auth, attempt, ui stores)
- **Styling**: Tailwind CSS with custom neon color theme
- **UI Components**: Custom glass-morphism design system
- **Editor**: Monaco Editor for code questions
- **HTTP Client**: Axios with JWT interceptors

### Backend Stack
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose
- **Caching**: Redis
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.io for proctoring
- **Validation**: Zod schema validation

### Database Collections
- **Users** - User accounts with roles
- **Organizations** - Organizational boundaries
- **Assessments** - Assessment definitions
- **Questions** - Question bank with all types
- **Attempts** - User attempt records
- **Grades** - Assessment grades and feedback
- **Teams** - Hackathon teams (future)
- **ProctorEvents** - Monitoring logs (future)

## Quick Demo Login

When you start the application, a demo account is pre-configured:

**Dashboard**: http://localhost:3000/dashboard

**Credentials**:
- Email: `demo@example.com`
- Password: `Demo@123456`

**What to do**:
1. Click the login link on the home page
2. Enter credentials above
3. View the JavaScript Fundamentals Quiz
4. Click "Start" to begin
5. Answer all 4 questions
6. Click "Submit" to finish

## Security

- ✅ JWT authentication with refresh tokens
- ✅ Rate limiting on auth endpoints
- ✅ Input validation with Zod
- ✅ Helmet.js for HTTP headers
- ✅ CORS configured
- ✅ Bcrypt password hashing
- ✅ Secure token storage in localStorage
- 🔄 Planned: Proctoring security features (tab detection, etc.)

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Backend (.env)
```
NODE_ENV=development
BACKEND_PORT=3001
MONGODB_URI=mongodb://mongodb:27017/hackathon-platform
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
FRONTEND_URL=http://localhost:3000
```

## Deployment

### Docker Production Build

```bash
# Build production images
docker-compose build --no-cache

# Run production containers
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Environment for Production

Update these for production:
- `JWT_SECRET`: Generate with `openssl rand -base64 32`
- `JWT_REFRESH_SECRET`: Generate with `openssl rand -base64 32`
- `MONGODB_URI`: Use MongoDB Atlas connection string
- `REDIS_URL`: Use Redis Cloud or managed service
- `FRONTEND_URL`: Your production frontend URL
- `BACKEND_URL`: Your production API URL

## File Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── ui/          # Base UI components
│   │   ├── questions/   # Question renderers
│   │   └── assessment/  # Assessment components
│   ├── lib/             # Utilities and API client
│   └── store/           # Zustand stores

backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Route definitions
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic
│   └── index.ts         # Server entry point

shared/
└── src/types/           # Shared TypeScript types
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT - See LICENSE file for details

## Support

For issues and questions:
1. Check [DOCKER_SETUP.md](./DOCKER_SETUP.md) for Docker-related issues
2. Check [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for architecture details
3. Open a GitHub issue with detailed description
4. Contact the development team

---

**Built with ❤️ for Justice Through Code**
