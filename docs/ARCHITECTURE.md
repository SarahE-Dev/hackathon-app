# Architecture & Tech Stack

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom neon theme
- **State Management**: Zustand (auth, attempts, ui stores)
- **HTTP Client**: Axios with JWT interceptors
- **Code Editor**: Monaco Editor (for coding challenges)
- **Theme**: Glass-morphism + neon cyberpunk design

### Backend
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB 7.0 with Mongoose
- **Authentication**: JWT (access + refresh tokens)
- **Real-time**: Socket.io (proctoring features)
- **Job Queue**: BullMQ with Redis
- **Validation**: Zod schema validation
- **Security**: Helmet.js, CORS, bcrypt hashing

### Infrastructure
- **Database**: MongoDB 7.0 (containerized)
- **Cache/Queue**: Redis 7 (containerized)
- **Code Execution**: Node.js sandbox (Docker-in-Docker)
- **Deployment**: Docker Compose with multi-stage builds

## Project Structure

```
hackathon-app/
├── frontend/                    # Next.js 14 application
│   ├── src/
│   │   ├── app/               # Page routes (App Router)
│   │   ├── components/        # React components
│   │   ├── lib/               # Utilities, API client
│   │   └── store/             # Zustand state stores
│   ├── Dockerfile
│   └── package.json
│
├── backend/                     # Express.js API server
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Express middleware
│   │   ├── services/          # Business logic
│   │   └── index.ts           # Server entry point
│   ├── Dockerfile
│   └── package.json
│
├── code-runner/                 # Code execution service
│   ├── Dockerfile
│   └── src/
│
├── shared/                      # Shared types & utilities
│   └── src/types/
│
├── docker-compose.yml          # Production configuration
├── docker-compose.dev.yml      # Development with hot-reload
├── docs/                        # Documentation
└── README.md                    # Main project readme
```

## Data Flow

### Authentication Flow
```
User Input (Login)
    ↓
/api/auth/login (POST)
    ↓
Verify password (bcrypt)
    ↓
Generate JWT tokens
    ↓
Return access + refresh tokens
    ↓
Client stores in localStorage
    ↓
All subsequent requests include Authorization header
```

### Assessment Taking Flow
```
User clicks "Start"
    ↓
POST /api/attempts/start
    ↓
Create Attempt record (status: in_progress)
    ↓
Redirect to attempt page
    ↓
Auto-save answers every 10 seconds
    ↓
PUT /api/attempts/:id/answer (Zustand state → API)
    ↓
User submits
    ↓
POST /api/attempts/:id/submit
    ↓
Lock attempt (status: submitted)
    ↓
Trigger grading pipeline (async)
```

### Real-time Proctoring Flow
```
Proctor opens monitoring dashboard
    ↓
Socket.io connection established
    ↓
Student attempts exam
    ↓
Proctor events detected (tab switch, copy, etc.)
    ↓
POST /api/attempts/:id/event
    ↓
Event stored in ProctorEvent collection
    ↓
Socket.io broadcasts to connected proctors
    ↓
Real-time display of incidents
```

## Database Schema

### Core Collections

**users**
- email, passwordHash, firstName, lastName
- roles: [{ role, organizationId, cohortId? }]
- lastLogin, isActive, emailVerified

**organizations**
- name, description
- Used for multi-tenancy

**assessments**
- title, description, organizationId, authorId
- sections: [{ id, title, questionIds, timeLimit? }]
- settings: { passingScore, attempts, proctoring?, ... }
- status: draft | review | published | archived
- publishedSnapshot: { version, assessment, questions, publishedAt }

**questions**
- type: mcq-single | mcq-multi | freeform | long-form | coding | file-upload
- content, options, correctAnswer, points
- status: draft | published | archived

**attempts**
- assessmentId, userId, sessionId?
- startedAt, submittedAt?, status
- answers: [{ questionId, answer, savedAt }]
- score?, feedback?

**grades**
- attemptId, assessmentId, userId
- score, maxScore, feedback
- rubric?: { criteria: [{ name, points, earnedPoints, comment }] }
- status: pending | draft | submitted | released

**proctorEvents** (future)
- attemptId, userId, type, timestamp
- description, severity, resolved

## API Structure

All endpoints follow this pattern:
```
GET    /api/{resource}              # List with pagination
GET    /api/{resource}/:id          # Get single
POST   /api/{resource}              # Create
PUT    /api/{resource}/:id          # Update
DELETE /api/{resource}/:id          # Delete
POST   /api/{resource}/:id/{action} # Custom actions
```

Response format:
```json
{
  "success": true,
  "data": { /* resource data */ },
  "error": null
}
```

See [API.md](./API.md) for complete endpoint list.

## State Management

### Zustand Stores
- **authStore**: Current user, tokens, login/logout
- **attemptStore**: Current attempt, answers, auto-save status
- **uiStore**: Notifications, modals, theme

```typescript
// Usage in components
const { user, isLoggedIn } = useAuthStore();
const { currentAnswer, saveAnswer } = useAttemptStore();
```

## Security Features

✅ JWT authentication with expiration
✅ Refresh token rotation
✅ Password hashing with bcrypt
✅ Rate limiting on auth endpoints
✅ Input validation with Zod
✅ CORS configuration
✅ Helmet.js for HTTP headers
✅ Role-based access control (RBAC)

## Performance Optimizations

- **Multi-stage Docker builds**: Smaller production images
- **Redis caching**: Session and token caching
- **BullMQ**: Async job processing for code execution
- **Database indexing**: On frequently queried fields
- **Font optimization**: Next.js automatic font optimization
- **Image optimization**: Next.js Image component

## Deployment

See [DOCKER.md](./DOCKER.md) for containerization details.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup.

---

**[← Back to Index](./INDEX.md)**
