# Hackathon Proctoring Platform - Project Plan

## Executive Summary
Production-level assessment and hackathon platform with proctoring, coding challenges, grading, and judging capabilities.

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI**: React 18+, TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io client for proctoring
- **Code Editor**: Monaco Editor (VS Code editor)
- **State Management**: React Context + Zustand
- **Deployment**: Vercel

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.io
- **API**: RESTful + WebSocket

### Database
- **Primary DB**: MongoDB Atlas
- **Collections**: Users, Roles, Organizations, Questions, Assessments, Sessions, Attempts, Grades, Teams, ProctorEvents
- **ODM**: Mongoose

### Infrastructure
- **Code Execution**: Docker containers with isolated sandboxes
- **Job Queue**: BullMQ + Redis
- **File Storage**: AWS S3 or Vercel Blob
- **Monitoring**: Structured logging + error tracking

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 Next.js Frontend                     │
│  (Vercel) - SSR/CSR, Role-based routing             │
└──────────────┬──────────────────────┬────────────────┘
               │                      │
               │ REST API             │ WebSocket
               │                      │
┌──────────────▼──────────────────────▼────────────────┐
│              Express.js Backend                      │
│  Auth, RBAC, Business Logic, Real-time Events       │
└──┬────────────┬─────────────┬──────────────────┬────┘
   │            │             │                  │
   │ Mongoose   │ BullMQ      │ Socket.io        │ S3
   │            │             │                  │
┌──▼────┐  ┌───▼─────┐  ┌────▼─────┐      ┌────▼─────┐
│MongoDB│  │  Redis  │  │WebSocket │      │ Storage  │
│ Atlas │  │  Queue  │  │  Server  │      │ (Files)  │
└───────┘  └────┬────┘  └──────────┘      └──────────┘
                │
           ┌────▼──────────┐
           │ Code Runners  │
           │ (Docker Pool) │
           └───────────────┘
```

## Phase 1: MVP Core (Weeks 1-8)

### Week 1-2: Foundation & Auth
**Goal**: Project setup, database, authentication

#### Tasks:
1. **Project Initialization**
   - Initialize Next.js project with TypeScript
   - Set up Express backend with TypeScript
   - Configure MongoDB connection
   - Set up ESLint, Prettier, Git hooks

2. **Database Schema Design**
   - Define Mongoose schemas for all core entities
   - Set up indexes for performance
   - Create seed data scripts

3. **Authentication System**
   - JWT-based auth with refresh tokens
   - Password hashing with bcrypt
   - Email/password registration and login
   - Password reset flow

4. **Authorization (RBAC)**
   - Role definitions: Admin, Proctor, Grader, Judge, Applicant
   - Permission middleware
   - Organization/Cohort scoping

**Deliverables**:
- Working auth system
- User and role management
- Basic admin dashboard

---

### Week 3-4: Question Bank & Assessment Builder
**Goal**: Content authoring system

#### Tasks:
1. **Question Bank**
   - CRUD APIs for questions
   - Question types: MCQ (single/multi), freeform, coding, file-upload
   - Tags, difficulty levels, versioning
   - Question preview component

2. **Assessment Builder**
   - Create assessment with sections
   - Add questions from bank
   - Configure timers, randomization
   - Settings: attempts, late policy, accommodations
   - Draft → Review → Publish workflow
   - Immutable published snapshots

3. **UI Components**
   - Rich text editor for questions
   - Drag-and-drop question ordering
   - Settings panels
   - Preview mode

**Deliverables**:
- Question bank management
- Assessment creation and publishing
- Admin can build complete assessments

---

### Week 5-6: Session Delivery & Proctoring
**Goal**: Test-taking experience with integrity monitoring

#### Tasks:
1. **Session Engine**
   - Start session with time window
   - Per-question navigation
   - Autosave every 5 seconds
   - Timer display with accommodations
   - Autosubmit on timeout
   - Resume after disconnect

2. **Proctoring Features**
   - Tab change/blur detection
   - Copy/paste/print detection
   - IP address logging
   - Device fingerprint
   - Incident flagging (automatic + manual)
   - Event audit trail
   - Pre-check: photo ID confirmation UI

3. **Proctor Dashboard**
   - Live session monitoring
   - Student list with status indicators
   - Incident logs
   - Manual note-taking
   - Start/stop/pause controls
   - Time override for individuals

**Deliverables**:
- Functional test-taking interface
- Basic proctoring with event logging
- Proctor monitoring dashboard

---

### Week 7: Coding Question Runner
**Goal**: Execute and test code submissions

#### Tasks:
1. **Code Execution Service**
   - Docker-based Python sandbox (start with one language)
   - Job queue with BullMQ
   - Stdin/stdout capture
   - Time and memory limits (3s, 512MB)
   - Test case runner (visible + hidden)

2. **Frontend Code Editor**
   - Monaco Editor integration
   - Language selector (Python initially)
   - Run code button
   - Test results display
   - Per-test scoring feedback

3. **Security & Isolation**
   - Network isolation in containers
   - File system restrictions
   - Resource limits
   - Timeout handling

**Deliverables**:
- Working code execution for Python
- Test runner with visible/hidden tests
- Per-test scoring

---

### Week 8: Grading & Rubrics
**Goal**: Grading workflow with rubrics

#### Tasks:
1. **Rubric System**
   - Create rubric templates
   - Criteria with point scales
   - Per-question and overall rubrics
   - Reusable templates

2. **Grading Interface**
   - View submissions by question
   - Assignment queue (self-assign or auto)
   - Inline comments on freeform/code
   - Apply rubric criteria
   - Draft grades before release
   - Bulk release to students

3. **Results Page**
   - Student view: scores, feedback, comments
   - Download PDF report
   - Release controls (draft vs published)

**Deliverables**:
- Grading UI with rubrics
- Feedback system
- Student results page

---

## Phase 2: Hackathon Features (Weeks 9-10)

### Week 9: Team & Project Management
**Goal**: Hackathon-specific features

#### Tasks:
1. **Team Registration**
   - Team creation with members
   - Project details form
   - GitHub/demo links
   - Team page for judges

2. **Judging System**
   - Configurable rubric per track
   - Judge assignment
   - Scoring interface
   - Private notes
   - Conflict of interest flagging

3. **Leaderboard**
   - Computed standings (weighted average)
   - Tie-break rules (most 5s, earliest submit)
   - Admin: real-time view
   - Public: reveal toggle
   - Track filters

**Deliverables**:
- Team registration and management
- Judge scoring interface
- Leaderboard with reveal control

---

### Week 10: Analytics & Polish
**Goal**: Reporting and production readiness

#### Tasks:
1. **Analytics Dashboard**
   - Time-on-task by question
   - Item difficulty analysis
   - Proctoring flag summary
   - Cohort performance distribution
   - CSV/JSON export

2. **File Management**
   - Upload to S3/Vercel Blob
   - Size/type validation
   - Virus scanning integration (placeholder)
   - Signed URL downloads

3. **Production Hardening**
   - Error boundaries and fallbacks
   - Rate limiting
   - Input validation (Zod schemas)
   - OWASP security checklist
   - Accessibility audit (WCAG 2.1 AA)
   - Load testing (1k concurrent users)

**Deliverables**:
- Analytics and export
- Secure file handling
- Production-ready deployment

---

## Phase 3: Post-MVP Enhancements (Future)

### Advanced Proctoring
- Webcam/screen recording (sampled frames)
- Face detection heuristics
- Live video feed to proctor

### Multi-Language Code Support
- JavaScript, Java, C++, Go
- Language-specific test frameworks
- Performance benchmarking

### Integrations
- SSO (Google/Microsoft OAuth)
- LMS integration (Canvas grade sync)
- Webhooks for events

### Advanced Analytics
- KR-20/Cronbach's alpha
- Item discrimination index
- Predictive scoring

---

## Database Schema (Core Collections)

### Users
```javascript
{
  _id: ObjectId,
  email: string,
  passwordHash: string,
  firstName: string,
  lastName: string,
  roles: [{ roleType: enum, orgId: ObjectId }],
  createdAt: Date,
  lastLogin: Date
}
```

### Organizations
```javascript
{
  _id: ObjectId,
  name: string,
  cohorts: [{ name: string, year: number }],
  settings: Object
}
```

### Questions
```javascript
{
  _id: ObjectId,
  type: enum ['mcq', 'freeform', 'coding', 'file-upload'],
  version: number,
  status: enum ['draft', 'published'],
  content: {
    prompt: string,
    options?: Array,
    correctAnswer?: any,
    tests?: Array, // for coding
    rubric?: ObjectId
  },
  tags: [string],
  difficulty: enum,
  authorId: ObjectId,
  createdAt: Date
}
```

### Assessments
```javascript
{
  _id: ObjectId,
  title: string,
  orgId: ObjectId,
  sections: [{
    title: string,
    questions: [ObjectId],
    timeLimit: number,
    randomize: boolean
  }],
  settings: {
    totalTime: number,
    attemptsAllowed: number,
    latePolicy: Object,
    proctoring: Object
  },
  status: enum ['draft', 'published'],
  publishedSnapshot: Object, // immutable
  createdAt: Date
}
```

### Sessions
```javascript
{
  _id: ObjectId,
  assessmentId: ObjectId,
  cohortId: ObjectId,
  windowStart: Date,
  windowEnd: Date,
  policies: Object,
  accommodations: [{ userId: ObjectId, timeMultiplier: number }]
}
```

### Attempts
```javascript
{
  _id: ObjectId,
  sessionId: ObjectId,
  userId: ObjectId,
  assessmentSnapshot: Object,
  startedAt: Date,
  submittedAt: Date,
  answers: [{
    questionId: ObjectId,
    answer: any,
    timestamp: Date,
    timeSpent: number
  }],
  files: [{ questionId: ObjectId, url: string }],
  events: [{
    type: enum ['tab-switch', 'blur', 'copy', 'paste'],
    timestamp: Date,
    metadata: Object
  }],
  status: enum ['in-progress', 'submitted', 'graded']
}
```

### Grades
```javascript
{
  _id: ObjectId,
  attemptId: ObjectId,
  graderId: ObjectId,
  questionScores: [{
    questionId: ObjectId,
    rubricScores: Object,
    comments: [{ text: string, lineNumber?: number }],
    points: number
  }],
  overallScore: number,
  status: enum ['draft', 'released'],
  gradedAt: Date
}
```

### Teams (Hackathon)
```javascript
{
  _id: ObjectId,
  name: string,
  members: [ObjectId],
  projectTitle: string,
  description: string,
  repoUrl: string,
  demoUrl: string,
  submittedAt: Date
}
```

### JudgeScores
```javascript
{
  _id: ObjectId,
  teamId: ObjectId,
  judgeId: ObjectId,
  track: string,
  scores: {
    impact: number,
    technical: number,
    execution: number,
    ux: number,
    innovation: number
  },
  notes: string,
  submittedAt: Date
}
```

---

## API Structure (Key Endpoints)

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Users & Roles
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `POST /api/users/:id/roles`

### Questions
- `GET /api/questions`
- `POST /api/questions`
- `PUT /api/questions/:id`
- `POST /api/questions/:id/publish`

### Assessments
- `GET /api/assessments`
- `POST /api/assessments`
- `PUT /api/assessments/:id`
- `POST /api/assessments/:id/publish`

### Sessions
- `POST /api/sessions` (start)
- `GET /api/sessions/:id`
- `PUT /api/sessions/:id/pause`

### Attempts
- `POST /api/attempts` (begin attempt)
- `GET /api/attempts/:id`
- `PUT /api/attempts/:id/answer`
- `POST /api/attempts/:id/submit`

### Code Execution
- `POST /api/code/run`
- `GET /api/code/status/:jobId`

### Grading
- `GET /api/grades/queue`
- `POST /api/grades`
- `PUT /api/grades/:id`
- `POST /api/grades/:id/release`

### Hackathon
- `POST /api/teams`
- `GET /api/teams/:id`
- `POST /api/judge-scores`
- `GET /api/leaderboard`

### Proctoring (WebSocket)
- `ws://backend/proctoring`
  - Events: `session-join`, `tab-switch`, `incident`, `proctor-note`

---

## Security Considerations

1. **Input Validation**: Zod schemas for all API inputs
2. **SQL Injection**: MongoDB parameterized queries via Mongoose
3. **XSS**: Sanitize user-generated content
4. **CSRF**: SameSite cookies + CSRF tokens
5. **File Upload**: Type/size validation, virus scan, signed URLs
6. **Code Execution**: Isolated Docker containers, network disabled
7. **Authentication**: JWT with short expiry, refresh token rotation
8. **Rate Limiting**: Per-user and per-IP limits
9. **Audit Logging**: Immutable event logs for all sensitive actions

---

## Deployment Strategy

### Development
- Local MongoDB + Redis
- Docker Compose for code runners
- Hot reload for frontend/backend

### Staging
- MongoDB Atlas (shared cluster)
- Vercel preview deployments
- AWS S3 for files
- Redis Cloud (free tier)

### Production
- MongoDB Atlas (dedicated cluster, multi-region)
- Vercel production
- AWS S3 with CloudFront CDN
- Redis Cloud (scaled)
- Docker runners on AWS ECS or fly.io
- Monitoring: Datadog/Sentry

---

## Testing Strategy

1. **Unit Tests**: Jest for business logic
2. **Integration Tests**: Supertest for API endpoints
3. **E2E Tests**: Playwright for critical flows
4. **Load Tests**: k6 for 1k concurrent users
5. **Security Tests**: OWASP ZAP automated scan

---

## Success Metrics (MVP)

- [ ] 5 user roles with working RBAC
- [ ] 4 question types (MCQ, freeform, coding, file-upload)
- [ ] Assessment builder with publish workflow
- [ ] Session delivery with autosave < 5s
- [ ] Tab-switch and blur detection
- [ ] Python code execution < 3s average
- [ ] Grading with rubrics
- [ ] Hackathon team/judge/leaderboard features
- [ ] 1k concurrent test-takers supported
- [ ] WCAG 2.1 AA compliance
- [ ] < 2s page load on broadband

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Code execution security breach | High | Isolated containers, network disabled, resource limits |
| Database scalability issues | Medium | Atlas auto-scaling, proper indexing, caching |
| Real-time proctoring lag | Medium | WebSocket optimization, regional servers |
| File storage costs | Low | Compression, retention policies, size limits |
| Cheating via screen sharing | Medium | Tab detection, periodic checks (Post-MVP: recording) |

---

## Next Steps

1. Set up project repository structure
2. Initialize Next.js + Express codebases
3. Configure MongoDB Atlas and schemas
4. Build authentication system
5. Start Week 1 tasks
