# Hackathon App - Quick Reference Guide

## Absolute Paths to Key Files

### Frontend Core
- `/Users/saraheatherly/Desktop/hackathon-app/frontend/src/lib/api.ts` - API client configuration
- `/Users/saraheatherly/Desktop/hackathon-app/frontend/src/app/dashboard/page.tsx` - User dashboard
- `/Users/saraheatherly/Desktop/hackathon-app/frontend/src/app/admin/page.tsx` - Admin dashboard
- `/Users/saraheatherly/Desktop/hackathon-app/frontend/src/app/assessment/[attemptId]/page.tsx` - Assessment taking
- `/Users/saraheatherly/Desktop/hackathon-app/frontend/src/store/attemptStore.ts` - Attempt state management

### Backend Core
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/index.ts` - Server entry point
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/routes/assessments.ts` - Assessment endpoints
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/routes/attempts.ts` - Attempt endpoints
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/routes/sessions.ts` - Session endpoints
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/controllers/attemptController.ts` - Attempt logic

### Database Models
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/models/Assessment.ts` - Assessment schema
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/models/Attempt.ts` - Attempt schema
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/models/Session.ts` - Session schema
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/models/Question.ts` - Question schema
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/models/Grade.ts` - Grade schema
- `/Users/saraheatherly/Desktop/hackathon-app/backend/src/models/Team.ts` - Team schema

### Types
- `/Users/saraheatherly/Desktop/hackathon-app/shared/src/types/common.ts` - Common enums and types

---

## API Endpoints Quick Map

### Assessment Endpoints
```
GET  /api/assessments                    List assessments
POST /api/assessments                    Create assessment
GET  /api/assessments/:id                Get assessment
PUT  /api/assessments/:id                Update assessment
POST /api/assessments/:id/publish        Publish assessment
DELETE /api/assessments/:id              Delete assessment

GET  /api/assessments/questions/list     List questions
GET  /api/assessments/questions/:id      Get question
POST /api/assessments/questions          Create question
```

### Session Endpoints
```
GET  /api/sessions/my-sessions           Get user's active sessions
GET  /api/sessions                       List sessions (admin/proctor)
GET  /api/sessions/:id                   Get session
POST /api/sessions                       Create session
PUT  /api/sessions/:id                   Update session
POST /api/sessions/:id/pause             Pause session
POST /api/sessions/:id/resume            Resume session
```

### Attempt Endpoints
```
GET  /api/attempts/my-attempts           Get user's attempts
POST /api/attempts/start                 Start new attempt
GET  /api/attempts/:id                   Get attempt
PUT  /api/attempts/:id/answer            Save answer
POST /api/attempts/:id/submit            Submit attempt
POST /api/attempts/:id/event             Add proctor event
POST /api/attempts/:id/upload            Upload file
```

---

## Frontend Routes Currently Implemented

| Route | File | Status |
|-------|------|--------|
| `/` | `page.tsx` | Home page |
| `/auth/login` | `auth/login/page.tsx` | Login |
| `/auth/register` | `auth/register/page.tsx` | Register |
| `/dashboard` | `dashboard/page.tsx` | User dashboard |
| `/admin` | `admin/page.tsx` | Admin dashboard |
| `/assessment/[attemptId]` | `assessment/[attemptId]/page.tsx` | Take assessment |
| `/assessments/[id]/attempt` | `assessments/[id]/attempt/page.tsx` | Take assessment (alt) |

### Missing Frontend Routes (To Build)
- `/admin/users` - User management
- `/admin/assessments` - Assessment management
- `/admin/sessions` - Session management
- `/admin/analytics` - Analytics
- `/assessments` - Assessments list
- `/assessments/[id]/results` - Results/feedback
- `/sessions` - Sessions list
- `/hackathons` - Hackathon list/dashboard
- `/hackathons/[id]` - Hackathon detail
- `/teams` - Teams list
- `/teams/[id]` - Team detail

---

## Frontend API Client Methods

### Available
```typescript
authAPI.register() 
authAPI.login()
authAPI.logout()
authAPI.getCurrentUser()

usersAPI.getAll()
usersAPI.getById()
usersAPI.create()
usersAPI.update()
usersAPI.delete()

assessmentsAPI.getAll()
assessmentsAPI.getById()
assessmentsAPI.create()
assessmentsAPI.update()
assessmentsAPI.publish()
assessmentsAPI.delete()

questionsAPI.getAll()
questionsAPI.getById()
questionsAPI.create()
questionsAPI.update()
questionsAPI.publish()
questionsAPI.duplicate()
questionsAPI.archive()
questionsAPI.delete()
```

### Missing (Need to Create)
```typescript
sessionsAPI.*
attemptsAPI.*
gradesAPI.*
teamsAPI.*
```

---

## Data Models Structure

### Assessment
- title, description
- sections (array with questions)
- settings (time, attempts, proctoring, accessibility)
- publishedSnapshot (immutable copy when published)

### Attempt
- sessionId, userId, assessmentId
- assessmentSnapshot (copy of assessment at attempt time)
- answers (array of question responses)
- files (array of uploaded files)
- events (tab switch, blur, etc.)
- status, score, timeSpent

### Session
- assessmentId, organizationId
- windowStart, windowEnd (time window for taking assessment)
- accommodations (time multipliers per user)
- policies (late submission, leaderboard, etc.)

### Question
- type (mcq, freeform, coding, file-upload)
- content (prompt, options, test cases, etc.)
- difficulty, tags, points
- status (draft, review, published, archived)

### Grade
- attemptId (unique, one grade per attempt)
- questionScores (array with points per question)
- status (pending, draft, submitted, released)
- feedback, comments

---

## What's Working vs What's Not

### Working
- Authentication (login/register/logout)
- User roles and permissions
- Assessment CRUD (create/read/update/publish)
- Question CRUD
- Session CRUD (basic)
- Attempt creation and submission
- Auto-save for answers
- Proctoring event capture
- Basic UI for assessment taking
- Dashboard pages (UI only)

### Not Working / Not Implemented
- Admin dashboard data integration (mock only)
- Admin pages (users, assessments, sessions, analytics)
- Grading system (routes exist, no controller)
- Team/hackathon management (routes are placeholders)
- Results/feedback pages
- Question bank UI
- Assessment builder UI
- File upload/storage
- Code execution
- Proctoring dashboard
- Mobile optimization

---

## To Start Development

1. **Understand Current State**: Read CODEBASE_EXPLORATION.md (this file)
2. **Check Test Data**: Database may have test assessments/questions
3. **Implement Missing**: Prioritize based on what affects users most:
   - Results page (users want to see scores)
   - Session listing (students need to find assessments)
   - Admin dashboard integration (admins need visibility)
4. **Add API Wrappers**: Create sessionsAPI, attemptsAPI, etc. in frontend
5. **Build Admin Pages**: Implement user/assessment/session management
6. **Polish UI**: Mobile responsiveness and error handling

---

## Environment Variables Needed

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL (defaults to http://localhost:3001)
- `NEXT_PUBLIC_BACKEND_URL` - Alternative naming (some pages use this)

### Backend (.env)
- `BACKEND_PORT` - Server port (defaults to 3001)
- `FRONTEND_URL` - For CORS (defaults to http://localhost:3000)
- `NODE_ENV` - development/production
- Database connection details (MongoDB URI)
- JWT secret keys

---

## Code Style & Patterns Observed

- **Frontend**: React hooks, Zustand for state, Next.js App Router
- **Backend**: Express with controllers, Mongoose for MongoDB
- **Naming**: camelCase for functions, PascalCase for components/classes
- **API Response**: Standard `{ success, data, error }` format
- **Error Handling**: Custom ApiError class with status codes
- **Auth**: JWT in Authorization header, token refresh on 401

