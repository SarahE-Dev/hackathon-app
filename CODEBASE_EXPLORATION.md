# Hackathon App Codebase Exploration Report

## Executive Summary
The hackathon-app is a comprehensive assessment and hackathon management platform built with Next.js (frontend) and Express.js (backend) with MongoDB. The codebase contains well-structured models, routes, and components for managing assessments, attempts, sessions, and team-based hackathons. This report documents the existing architecture and identifies what still needs to be built.

---

## 1. DASHBOARD PAGE STRUCTURE

### Current Dashboard Pages

#### Frontend Pages (Next.js App Router)
```
/Users/saraheatherly/Desktop/hackathon-app/frontend/src/app/
├── (auth)/
│   ├── login/page.tsx          - Auth group (login)
│   └── register/page.tsx       - Auth group (register)
├── auth/
│   ├── login/page.tsx          - Alternative login route
│   └── register/page.tsx       - Alternative register route
├── dashboard/page.tsx          - USER DASHBOARD (main student/user view)
├── admin/page.tsx              - ADMIN DASHBOARD (admin overview & stats)
├── assessment/[attemptId]/page.tsx  - TAKE ASSESSMENT PAGE (old route)
├── assessments/[id]/attempt/page.tsx - TAKE ASSESSMENT PAGE (new route)
├── page.tsx                    - Home/Landing page
├── layout.tsx                  - Root layout
└── globals.css                 - Global styles
```

### Dashboard Details

#### 1. User Dashboard (`/dashboard/page.tsx`) - FUNCTIONAL
- **Status**: Partially built with placeholder UI
- **Features**:
  - User profile display (email, name, roles)
  - Quick action cards for:
    - Assessments (Coming Soon)
    - Results (Coming Soon)
    - Hackathons (Coming Soon)
  - Platform status section showing:
    - Authentication & User Management (✓ Done)
    - Question Bank API (✓ Done)
    - Assessment Builder API (✓ Done)
    - Session & Attempt System (⚠ In Progress)
    - Proctoring Dashboard (⚠ In Progress)
    - Code Execution Engine (⚠ In Progress)
  - Logout functionality

#### 2. Admin Dashboard (`/admin/page.tsx`) - PARTIALLY FUNCTIONAL
- **Status**: UI built with mock data
- **Features**:
  - Stats Grid (4 key metrics):
    - Total Users (with active count)
    - Assessments (with published count)
    - Active Sessions
    - Total Attempts
  - Recent Activity Feed (mock data showing user actions)
  - Quick Actions Links:
    - Manage Users → `/admin/users` (not implemented)
    - Manage Assessments → `/admin/assessments` (not implemented)
    - Manage Sessions → `/admin/sessions` (not implemented)
    - View Analytics → `/admin/analytics` (not implemented)
  - Performance Overview Chart (placeholder)
  - **Issue**: Uses hardcoded mock data; needs real API integration

#### 3. Assessment Taking Pages - FUNCTIONAL
Two routes exist (need consolidation):
- `/assessment/[attemptId]/page.tsx` - Using Zustand store (preferred approach)
- `/assessments/[id]/attempt/page.tsx` - Using Axios directly

Both pages have:
- Question display with navigation
- Timer countdown with auto-submit
- Proctoring alerts display
- Answer auto-save
- Submit confirmation modal
- Progress tracking
- Question sidebar navigator

### Dashboard Routes Status

| Route | Status | Notes |
|-------|--------|-------|
| `/dashboard` | Functional | User dashboard with basic layout |
| `/admin` | Partial | Mock data only, needs API integration |
| `/admin/users` | Not Built | Referenced but not implemented |
| `/admin/assessments` | Not Built | Referenced but not implemented |
| `/admin/sessions` | Not Built | Referenced but not implemented |
| `/admin/analytics` | Not Built | Referenced but not implemented |
| `/assessment/[attemptId]` | Functional | Assessment taking interface (using store) |
| `/assessments/[id]/attempt` | Functional | Assessment taking interface (using axios) |
| `/assessments/[id]/results` | Not Built | Results/grading page needed |
| Hackathon routes | Not Built | `/hackathons/*` routes not created |

---

## 2. BACKEND API ENDPOINTS

### Backend Structure
```
backend/src/
├── routes/
│   ├── auth.ts              - Authentication endpoints
│   ├── users.ts             - User management
│   ├── assessments.ts       - Assessment CRUD
│   ├── sessions.ts          - Session management
│   ├── attempts.ts          - Assessment attempt endpoints
│   ├── grades.ts            - Grading (placeholder)
│   ├── teams.ts             - Team/hackathon management (placeholder)
│   └── proctoring.ts        - Proctoring events
├── controllers/
│   ├── authController.ts
│   ├── userController.ts
│   ├── assessmentController.ts
│   ├── attemptController.ts
│   └── sessionController.ts
├── models/                  - MongoDB schemas
├── middleware/
│   ├── auth.ts              - JWT authentication
│   ├── errorHandler.ts
│   └── rateLimiter.ts
└── index.ts                 - Server entry point
```

### Assessment Endpoints

#### Assessments (`/api/assessments`)
```
GET    /assessments              - List assessments (paginated)
GET    /assessments/:id          - Get assessment by ID
POST   /assessments              - Create new assessment (admin/proctor)
PUT    /assessments/:id          - Update assessment (admin/proctor)
POST   /assessments/:id/publish  - Publish assessment (admin)
DELETE /assessments/:id          - Delete assessment (admin)

Questions (nested under assessments):
GET    /assessments/questions/list       - List all questions (paginated)
GET    /assessments/questions/:id        - Get question by ID
POST   /assessments/questions            - Create question (admin/proctor)
PUT    /assessments/questions/:id        - Update question (admin/proctor)
POST   /assessments/questions/:id/publish - Publish question (admin)
POST   /assessments/questions/:id/duplicate - Duplicate question (admin/proctor)
POST   /assessments/questions/:id/archive   - Archive question (admin)
DELETE /assessments/questions/:id        - Delete question (admin)
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "assessments": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

#### Sessions (`/api/sessions`)
```
GET    /sessions/my-sessions              - Get active sessions for current user
GET    /sessions/                         - List all sessions (admin/proctor)
GET    /sessions/:id                      - Get session details
POST   /sessions/                         - Create session (admin/proctor)
PUT    /sessions/:id                      - Update session (admin/proctor)
POST   /sessions/:id/pause                - Pause session (admin/proctor)
POST   /sessions/:id/resume               - Resume session (admin/proctor)
DELETE /sessions/:id                      - Delete session (admin)
```

#### Attempts (`/api/attempts`)
```
GET    /attempts/my-attempts              - Get user's attempts (with filters)
POST   /attempts/start                    - Start new attempt (or resume)
GET    /attempts/:id                      - Get attempt details
PUT    /attempts/:id/answer               - Save answer (autosave)
POST   /attempts/:id/submit               - Submit attempt
POST   /attempts/:id/event                - Add proctor event (tab switch, etc.)
POST   /attempts/:id/upload               - Upload file for file-upload questions
```

#### Grades (`/api/grades`)
```
STATUS: PLACEHOLDER - Routes exist but not implemented
Planned endpoints:
GET    /grades/:attemptId                 - Get grade for attempt
POST   /grades/                           - Create/submit grade
PUT    /grades/:id                        - Update grade
POST   /grades/:id/release                - Release grade to student
GET    /grades/                           - List grades (with filters)
```

#### Teams/Hackathons (`/api/teams`)
```
STATUS: PLACEHOLDER - Routes exist but not implemented
Planned endpoints would handle:
- Team management
- Hackathon participation
- Submissions
- Judge scoring
```

### Proctoring Routes (`/api/proctoring`)
- WebSocket-based proctoring service available
- Real-time alert system for suspicious activity

---

## 3. DATABASE MODELS & SCHEMAS

### User Model
**File**: `/backend/src/models/User.ts`
**Key Fields**:
- `email`, `password`, `firstName`, `lastName`
- `roles` (array of role assignments)
- `organizationId` (reference)
- `isActive`, `isVerified`
- Timestamps

### Assessment Model
**File**: `/backend/src/models/Assessment.ts`
**Key Structure**:
```typescript
{
  title: String,
  description: String,
  organizationId: ObjectId,
  authorId: ObjectId,
  
  sections: [{
    id: String,
    title: String,
    description: String,
    questionIds: [ObjectId],
    timeLimit: Number,
    randomizeQuestions: Boolean,
    randomizeOptions: Boolean,
    questionsToDisplay: Number
  }],
  
  settings: {
    totalTimeLimit: Number,
    attemptsAllowed: Number (default: 1),
    showResultsImmediately: Boolean,
    allowReview: Boolean,
    allowBackward: Boolean,
    shuffleSections: Boolean,
    startWindow: Date,
    endWindow: Date,
    
    lateSubmissionPolicy: {
      enabled: Boolean,
      deadline: Date,
      penaltyPercentage: Number
    },
    
    proctoring: {
      enabled: Boolean,
      requireIdCheck: Boolean,
      detectTabSwitch: Boolean (default: true),
      detectCopyPaste: Boolean (default: true),
      enableWebcam: Boolean,
      enableScreenRecording: Boolean,
      fullscreenRequired: Boolean,
      allowCalculator: Boolean,
      allowScratchpad: Boolean (default: true)
    },
    
    accessibility: {
      allowExtraTime: Boolean,
      extraTimePercentage: Number,
      allowScreenReader: Boolean (default: true),
      dyslexiaFriendlyFont: Boolean
    }
  },
  
  status: 'draft' | 'review' | 'published' | 'archived',
  
  publishedSnapshot: {
    version: Number,
    assessment: Mixed,
    questions: [Mixed],
    publishedAt: Date,
    publishedBy: ObjectId
  },
  
  publishedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Question Model
**File**: `/backend/src/models/Question.ts`
**Key Structure**:
```typescript
{
  type: 'mcq-single' | 'mcq-multi' | 'freeform' | 'long-form' | 'coding' | 'file-upload',
  version: Number (default: 1),
  status: 'draft' | 'review' | 'published' | 'archived',
  title: String,
  
  content: {
    prompt: String,
    options: [{
      id: String,
      text: String,
      isCorrect: Boolean
    }],
    correctAnswer: Mixed,
    testCases: [{
      id: String,
      input: String,
      expectedOutput: String,
      isHidden: Boolean,
      points: Number,
      timeLimit: Number (ms),
      memoryLimit: Number (MB)
    }],
    rubricId: ObjectId,
    allowedFileTypes: [String],
    maxFileSize: Number (default: 10MB),
    codeTemplate: String,
    language: String
  },
  
  tags: [String],
  difficulty: 'easy' | 'medium' | 'hard' | 'expert',
  authorId: ObjectId,
  organizationId: ObjectId,
  points: Number,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Session Model
**File**: `/backend/src/models/Session.ts`
**Key Structure**:
```typescript
{
  assessmentId: ObjectId (required),
  organizationId: ObjectId (required),
  cohortId: ObjectId,
  title: String,
  windowStart: Date,
  windowEnd: Date,
  
  policies: {
    allowLateSubmission: Boolean,
    lateDeadline: Date,
    autoStartOnJoin: Boolean,
    showLeaderboard: Boolean
  },
  
  accommodations: [{
    userId: ObjectId,
    timeMultiplier: Number (default: 1.0, min: 1.0),
    reducedProctoring: Boolean,
    separateRoom: Boolean,
    notes: String
  }],
  
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Attempt Model
**File**: `/backend/src/models/Attempt.ts`
**Key Structure**:
```typescript
{
  sessionId: ObjectId (required),
  userId: ObjectId (required),
  assessmentId: ObjectId (required),
  
  assessmentSnapshot: {  // Immutable copy of assessment at attempt time
    // Full assessment object
  },
  
  startedAt: Date,
  submittedAt: Date,
  timeSpent: Number (seconds),
  
  answers: [{
    questionId: ObjectId,
    answer: Mixed,
    timestamp: Date,
    timeSpent: Number,
    version: Number
  }],
  
  files: [{
    questionId: ObjectId,
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: Date
  }],
  
  events: [{
    type: String (e.g., 'attempt-started', 'answer-saved', 'tab-switch'),
    timestamp: Date,
    metadata: Mixed
  }],
  
  status: 'not-started' | 'in-progress' | 'submitted' | 'graded' | 'released',
  score: Number,
  maxScore: Number,
  
  ipAddress: String,
  userAgent: String,
  deviceFingerprint: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

**Virtual Field**:
- `progress`: Calculated percentage of answered questions

### Grade Model
**File**: `/backend/src/models/Grade.ts`
**Key Structure**:
```typescript
{
  attemptId: ObjectId (required, unique),
  graderId: ObjectId,
  
  questionScores: [{
    questionId: ObjectId,
    rubricScores: Record<string, number>,
    points: Number,
    maxPoints: Number,
    comments: [{
      id: String,
      text: String,
      lineNumber: Number,
      timestamp: Date
    }],
    autograded: Boolean
  }],
  
  overallScore: Number,
  maxScore: Number,
  percentage: Number (0-100),
  status: 'pending' | 'draft' | 'submitted' | 'released',
  
  feedback: String,
  gradedAt: Date,
  releasedAt: Date,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Team Model
**File**: `/backend/src/models/Team.ts`
**Key Structure**:
```typescript
{
  name: String,
  organizationId: ObjectId,
  memberIds: [ObjectId],
  projectTitle: String,
  description: String,
  
  track: String,
  repoUrl: String,
  demoUrl: String,
  videoUrl: String,
  submittedAt: Date,
  
  disqualified: Boolean (default: false),
  
  createdAt: Date,
  updatedAt: Date
}
```

### Other Models (Partially/Not Implemented)
- **ProctorEvent**: Stores individual proctoring events
- **Rubric**: Grading rubrics for manual grading
- **JudgeScore**: Hackathon judge scoring
- **Leaderboard**: Computed leaderboard data
- **Organization**: Tenant organization
- **Grade**: Grading records

---

## 4. FRONTEND API HELPER FUNCTIONS

### File: `/frontend/src/lib/api.ts`

#### axios Configuration
- Base URL: `${NEXT_PUBLIC_API_URL}/api` (defaults to `http://localhost:3001`)
- Request interceptor: Automatically adds Bearer token from localStorage
- Response interceptor: Handles 401 errors with token refresh logic
- Token refresh endpoint: `POST /api/auth/refresh`

#### Auth API
```typescript
authAPI = {
  register(data: { email, password, firstName, lastName }) → Promise
  login(email: string, password: string) → Promise
  logout() → Promise
  getCurrentUser() → Promise
  refreshToken(refreshToken: string) → Promise
}
```

#### Users API
```typescript
usersAPI = {
  getAll(params?: any) → Promise
  getById(id: string) → Promise
  create(data: any) → Promise
  update(id: string, data: any) → Promise
  delete(id: string) → Promise
}
```

#### Assessments API
```typescript
assessmentsAPI = {
  getAll(params?: any) → Promise           // List with pagination
  getById(id: string) → Promise            // Get single assessment
  create(data: any) → Promise              // Create new
  update(id: string, data: any) → Promise  // Update draft
  publish(id: string) → Promise            // Publish assessment
  delete(id: string) → Promise             // Delete draft
}
```

#### Questions API
```typescript
questionsAPI = {
  getAll(params?: any) → Promise                           // List questions
  getById(id: string) → Promise                            // Get question
  create(data: any) → Promise                              // Create question
  update(id: string, data: any) → Promise                  // Update question
  publish(id: string) → Promise                            // Publish question
  duplicate(id: string) → Promise                          // Duplicate question
  archive(id: string) → Promise                            // Archive question
  delete(id: string) → Promise                             // Delete question
}
```

#### Missing API Helpers
The following APIs are NOT yet wrapped in helpers (direct axios calls used):
- Sessions API (need to create `sessionsAPI` wrapper)
- Attempts API (need to create `attemptsAPI` wrapper)
- Grades API (need to create `gradesAPI` wrapper)
- Teams/Hackathons API (need to create `teamsAPI` wrapper)

### State Management

#### Zustand Stores
**Location**: `/frontend/src/store/`

1. **authStore.ts** - Authentication state
   - User data, tokens, login/logout state

2. **attemptStore.ts** - Assessment attempt state
   - Attempt ID, answers, current question index
   - Timer state, submission state
   - Proctor alerts
   - Auto-save functionality
   - Methods: `startAttempt`, `answerQuestion`, `submitAttempt`, `autoSave`

3. **uiStore.ts** - Global UI state
   - Toast notifications
   - Loading states

#### Hooks
**Location**: `/frontend/src/hooks/`

1. **useProctoring.ts** - Proctoring hook
   - Tab detection
   - Copy/paste prevention
   - Fullscreen enforcement
   - Manages proctoring alerts

---

## 5. COMPONENT STRUCTURE

### Question Components
**Location**: `/frontend/src/components/questions/`

Implemented:
- `QuestionRenderer.tsx` - Main dispatcher component
- `MultipleChoiceQuestion.tsx` - Single/multiple choice
- `ShortAnswerQuestion.tsx` - Short text input
- `LongAnswerQuestion.tsx` - Long form text
- `CodingQuestion.tsx` - Code editor
- `FileUploadQuestion.tsx` - File upload
- `MultiSelectQuestion.tsx` - Multiple selection

### UI Components
**Location**: `/frontend/src/components/ui/`

Implemented:
- `Button.tsx` - Button component
- `Card.tsx` - Card/container component
- `Input.tsx` - Input field
- `Toast.tsx` - Notification component

### Assessment Components
**Location**: `/frontend/src/components/assessment/`

Implemented:
- `Timer.tsx` - Countdown timer component

---

## 6. SHARED TYPE DEFINITIONS

**Location**: `/shared/src/types/`

### Enums Defined
```typescript
UserRole: 'admin' | 'proctor' | 'grader' | 'judge' | 'applicant'
QuestionType: 'mcq-single' | 'mcq-multi' | 'freeform' | 'long-form' | 'coding' | 'file-upload'
AssessmentStatus: 'draft' | 'review' | 'published' | 'archived'
AttemptStatus: 'not-started' | 'in-progress' | 'submitted' | 'graded' | 'released'
GradeStatus: 'pending' | 'draft' | 'submitted' | 'released'
ProctoringEventType: 'tab-switch' | 'blur' | 'copy' | 'paste' | 'print' | 'idle' | 'manual-flag' | 'id-check'
DifficultyLevel: 'easy' | 'medium' | 'hard' | 'expert'
SubmissionLanguage: 'python' | 'javascript' | 'java' | 'cpp' | 'go'
```

### Common Interfaces
- `Timestamps`: `{ createdAt, updatedAt }`
- `PaginationParams`: Page, limit, sort options
- `PaginatedResponse<T>`: Data array + pagination metadata
- `ApiResponse<T>`: Standard API response wrapper

---

## 7. WHAT NEEDS TO BE BUILT

### Critical Missing Features

#### 1. Admin Dashboard Functionality
- **Status**: UI done, API integration needed
- **Tasks**:
  - Integrate stats endpoints (or create them)
  - Real activity feed from database
  - Admin pages for:
    - User management (`/admin/users`)
    - Assessment management (`/admin/assessments`)
    - Session management (`/admin/sessions`)
    - Analytics dashboard (`/admin/analytics`)

#### 2. API Wrapper Functions
- **Missing**: `sessionsAPI`, `attemptsAPI`, `gradesAPI`, `teamsAPI` in `/frontend/src/lib/api.ts`
- **Impact**: Assessment taking page uses direct axios calls (should use wrappers)

#### 3. Grades/Grading System
- Backend routes placeholder only
- Need:
  - Grade CRUD endpoints
  - Grading workflow UI
  - Grade release to students
  - Rubric-based grading interface

#### 4. Team/Hackathon Management
- Team routes are placeholder
- Need:
  - Team CRUD endpoints
  - Team member management
  - Project submission endpoints
  - Judge scoring endpoints
  - Hackathon dashboard pages
  - Leaderboard functionality

#### 5. Results/Feedback Pages
- Missing: `/assessments/[id]/results` page
- Should display:
  - Score and percentage
  - Question-by-question breakdown
  - Correct answers (if allowed)
  - Feedback on graded questions
  - Time spent analysis

#### 6. Session Management UI
- Session creation/editing pages needed
- Session list page for students
- Accommodation management interface

#### 7. Question Bank Interface
- Question list/search page
- Question builder/editor
- Question templates
- Question preview

#### 8. Code Execution Integration
- Currently placeholder in `/code-runner` directory
- Need to implement actual code execution for coding questions

#### 9. Assessment Builder UI
- Frontend interface for creating/editing assessments
- Section management
- Question addition/ordering
- Settings configuration

#### 10. Proctoring Dashboard
- Real-time monitoring interface for proctors
- Event review interface
- Ability to flag suspicious activity
- Force submission capability

#### 11. File Upload Handling
- Backend file storage integration
- Frontend upload progress UI
- File validation and scanning

#### 12. Accessibility Features
- Implement accessibility settings from assessment model
- Extra time multiplier for timed assessments
- Dyslexia-friendly font option
- Screen reader support

#### 13. Mobile Responsiveness
- Many pages not optimized for mobile
- Assessment taking page needs mobile layout

#### 14. Error Handling & Validation
- Better form validation on creation pages
- User-friendly error messages
- Fallback UIs for errors

### Data Integration Needed

#### Frontend Updates Required
1. Assessment taking page - connect to real attempts API
2. Dashboard - fetch user's active assessments/attempts
3. Admin dashboard - fetch real stats and activity
4. Results page - fetch grade and feedback

#### Backend Implementation Needed
1. Complete grade controller and routes
2. Complete team/hackathon controller and routes
3. Session controller completion (some methods exist)
4. Add filtering/search to list endpoints
5. Add proper pagination defaults
6. Add validation layer

---

## 8. TECHNICAL STACK SUMMARY

### Frontend
- **Framework**: Next.js 13+ (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **UI Components**: Custom components + Headless UI

### Backend
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **Real-time**: WebSockets (for proctoring)
- **Middleware**: Custom auth, error handling, rate limiting

### Shared
- **Type System**: TypeScript
- **Shared Types**: In `/shared/src/types/`

---

## 9. DEVELOPMENT ROADMAP RECOMMENDATION

### Phase 1: Core Assessment Flow (High Priority)
1. Connect assessment taking to real attempts API
2. Implement session listing for students
3. Build results/feedback page
4. Complete attempt controller

### Phase 2: Admin Features (Medium Priority)
1. Implement admin dashboard API endpoints
2. Build admin pages (users, assessments, sessions)
3. Add assessment builder UI
4. Add question bank interface

### Phase 3: Grading System (Medium Priority)
1. Implement grade controller
2. Build grading interface
3. Add feedback submission
4. Implement grade release

### Phase 4: Hackathon Features (Lower Priority)
1. Implement team management
2. Build hackathon dashboard
3. Add judge scoring system
4. Implement leaderboard

### Phase 5: Enhancements (Lower Priority)
1. File upload handling
2. Code execution
3. Proctoring dashboard
4. Accessibility features
5. Mobile optimization

---

## 10. KEY FILES REFERENCE

### Critical Files to Know
```
Frontend:
- /frontend/src/lib/api.ts - All API calls
- /frontend/src/app/assessment/[attemptId]/page.tsx - Assessment taking
- /frontend/src/store/attemptStore.ts - Attempt state management
- /frontend/src/app/dashboard/page.tsx - User dashboard
- /frontend/src/app/admin/page.tsx - Admin dashboard

Backend:
- /backend/src/index.ts - Server entry point
- /backend/src/routes/*.ts - All endpoints
- /backend/src/controllers/*.ts - Business logic
- /backend/src/models/*.ts - Data schemas
- /backend/src/middleware/auth.ts - JWT verification
- /backend/src/config/database.ts - Database connection

Shared:
- /shared/src/types/common.ts - Enums and common types
```

---

## 11. NOTES & OBSERVATIONS

1. **Route Naming Inconsistency**: Two assessment taking routes exist (`/assessment/[attemptId]` and `/assessments/[id]/attempt`) - should consolidate
2. **Mock Data**: Admin dashboard uses hardcoded mock data - needs real API integration
3. **Assessment Snapshots**: Good pattern used - assessments are frozen at attempt time
4. **Accommodations**: Well-designed system for student accommodations (time multiplier, reduced proctoring, etc.)
5. **Proctoring**: WebSocket service available but not fully utilized in UI
6. **Error Handling**: Basic error handling in place, could be enhanced
7. **Validation**: Minimal validation on request bodies - should add schema validation
8. **Testing**: No test files found in codebase
9. **Deployment**: Docker compose file exists but configuration details not explored

