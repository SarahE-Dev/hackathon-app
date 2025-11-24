# API Reference

All endpoints are prefixed with `/api`.

Base URL: `http://localhost:3001/api`

## Authentication

All endpoints (except auth) require the `Authorization` header:

```
Authorization: Bearer {accessToken}
```

Tokens are obtained from login and stored in localStorage.

## Endpoints

### Auth

```
POST   /auth/register           Create new account
POST   /auth/login              Login and get tokens
POST   /auth/refresh            Refresh access token
POST   /auth/logout             Logout
GET    /auth/me                 Get current user
```

### Users

```
GET    /users                   List all users (admin only)
GET    /users/:id               Get user details
PUT    /users/:id               Update user
PUT    /users/:id/roles         Update user roles (admin only)
DELETE /users/:id               Delete user (admin only)
```

### Assessments

```
GET    /assessments                          List assessments (with pagination)
GET    /assessments/:id                      Get assessment details
POST   /assessments                          Create assessment
PUT    /assessments/:id                      Update assessment
POST   /assessments/:id/publish              Publish assessment
DELETE /assessments/:id                      Delete assessment
```

Query parameters for `GET /assessments`:
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50)
- `organizationId` - Filter by organization
- `status` - Filter by status (draft, review, published, archived)

### Questions

```
GET    /assessments/questions/list           List all questions
GET    /assessments/questions/:id            Get question details
POST   /assessments/questions                Create question
PUT    /assessments/questions/:id            Update question
POST   /assessments/questions/:id/publish    Publish question
DELETE /assessments/questions/:id            Delete question
```

### Attempts (Taking Assessments)

```
POST   /attempts/start                       Start new attempt
GET    /attempts                             List user's attempts
GET    /attempts/my-attempts                 Get current user's attempts
GET    /attempts/:id                         Get attempt details
PUT    /attempts/:id/answer                  Save answer (auto-save)
POST   /attempts/:id/submit                  Submit completed attempt
POST   /attempts/:id/event                   Log proctor event
POST   /attempts/:id/upload                  Upload file for question
```

### Grades

```
GET    /grades/ungraded                      Get ungraded attempts
GET    /grades/attempt/:attemptId            Get grades for attempt
GET    /grades/by-attempt/:attemptId         Get grade by attempt
GET    /grades/assessment/:assessmentId      Get all grades for assessment
POST   /grades                               Create/update grade
PUT    /grades/:id                           Update grade
PUT    /grades/:id/release                   Release grade to student
```

### Sessions (Assessment Windows)

```
GET    /sessions                             List sessions
GET    /sessions/:id                         Get session details
POST   /sessions                             Create session
PUT    /sessions/:id                         Update session
DELETE /sessions/:id                         Delete session
```

### Teams

```
GET    /teams                                List all teams
GET    /teams/:id                            Get team details
POST   /teams                                Create team
PUT    /teams/:id                            Update team
DELETE /teams/:id                            Delete team (admin only)
```

### Hackathon Sessions

```
GET    /hackathon-sessions                              List hackathon sessions
GET    /hackathon-sessions/:id                          Get session details
POST   /hackathon-sessions                              Create session (admin/proctor)
PUT    /hackathon-sessions/:id                          Update session (admin/proctor)
DELETE /hackathon-sessions/:id                          Delete session (admin only)
POST   /hackathon-sessions/:id/start                    Start session (admin/proctor)
POST   /hackathon-sessions/:id/pause                    Pause session (admin/proctor)
POST   /hackathon-sessions/:id/resume                   Resume session (admin/proctor)
POST   /hackathon-sessions/:id/complete                 Complete session (admin/proctor)
GET    /hackathon-sessions/:id/leaderboard              Get session leaderboard
GET    /hackathon-sessions/monitor/active               Get active sessions for monitoring
```

### Team Sessions (During Hackathon)

```
POST   /hackathon-sessions/team/join                                  Join session as team
GET    /hackathon-sessions/:sessionId/team/:teamId                    Get team session
PUT    /hackathon-sessions/:sessionId/team/:teamId/problem            Update problem progress
POST   /hackathon-sessions/:sessionId/team/:teamId/problem/submit     Submit solution
POST   /hackathon-sessions/:sessionId/team/:teamId/submit             Final team submission
POST   /hackathon-sessions/:sessionId/team/:teamId/event              Log proctoring event
POST   /hackathon-sessions/:sessionId/team/:teamId/pause              Pause team (proctor)
POST   /hackathon-sessions/:sessionId/team/:teamId/resume             Resume team (proctor)
```

### Judge Scores

```
GET    /judge-scores                         List all scores
GET    /judge-scores/team/:teamId            Get scores for team
POST   /judge-scores                         Create/update score
DELETE /judge-scores/:id                     Delete score
```

### Leaderboard

```
GET    /leaderboard/:sessionId               Get leaderboard for session
PUT    /leaderboard/:sessionId               Update leaderboard standings
```

### Proctoring

```
GET    /proctoring/sessions/:id              Get proctoring data for session
POST   /proctoring/:attemptId/flag           Flag an incident
GET    /proctoring/:attemptId/incidents      Get incidents for attempt
PUT    /proctoring/incidents/:id/resolve     Resolve incident
```

### Plagiarism Detection

```
POST   /plagiarism/similarity                Detect similarity between submissions
GET    /plagiarism/anomalies/:attemptId      Get timing anomalies
POST   /plagiarism/ai-detection              Check if code is AI-generated
GET    /plagiarism/report/:assessmentId      Get integrity report
```

### Code Execution

```
POST   /code-execution/execute               Execute code against test cases
```

### File Upload

```
POST   /file-upload/upload                   Upload file
GET    /file-upload/:id                      Get file
DELETE /file-upload/:id                      Delete file
```

### Organizations

```
GET    /organizations                        List organizations
GET    /organizations/:id                    Get organization details
POST   /organizations                        Create organization (admin)
PUT    /organizations/:id                    Update organization (admin)
```

## Request/Response Format

### Request

```bash
POST /assessments
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "JavaScript Fundamentals",
  "description": "Test your JS knowledge",
  "organizationId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "sections": [
    {
      "title": "Basics",
      "questionIds": ["q1", "q2", "q3"]
    }
  ],
  "settings": {
    "passingScore": 70,
    "attemptsAllowed": 3,
    "showResultsImmediately": true
  }
}
```

### Success Response

```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "title": "JavaScript Fundamentals"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Assessment not found",
    "statusCode": 404
  }
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests (rate limited) |
| 500 | Server Error |

## Role-Based Access

| Endpoint Group | Admin | Proctor | Judge | Grader | Fellow |
|----------------|-------|---------|-------|--------|--------|
| Auth | All | All | All | All | All |
| Users (read) | Yes | Yes | Yes | Yes | Own |
| Users (write) | Yes | No | No | No | Own |
| Assessments | All | Read | Read | Read | Read |
| Attempts | All | All | Read | All | Own |
| Grades | All | Read | Read | All | Own |
| Teams | All | Read | Read | Read | Own Team |
| Hackathon Sessions | All | Manage | Read | Read | Participate |
| Judge Scores | Read | Read | All | Read | No |
| Proctoring | All | All | No | No | No |

## WebSocket Events (Real-time)

Connected via Socket.io at `ws://localhost:3001`

### Events Emitted by Server

```
proctor:incident          Student triggered a proctoring flag
proctor:submit            Student submitted attempt
attempt:update            Attempt status changed
grade:released            Grades released to student
session:update            Hackathon session status changed
team:update               Team session updated
leaderboard:update        Leaderboard standings changed
```

### Events Sent by Client

```
attempt:answer            Answer saved (for real-time sync)
proctor:event             User event (tab switch, copy, etc.)
team:code                 Code update in team session
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Auth (login/register) | 15 per 15 min |
| API (general) | 100 per hour |
| File Upload | 10MB per file |

## Pagination

List endpoints support pagination:

```bash
GET /assessments?page=2&limit=20
```

Response includes pagination info:
```json
{
  "success": true,
  "data": {
    "assessments": [...],
    "pagination": {
      "page": 2,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

**[← Back to Index](./INDEX.md)**
