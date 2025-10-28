# API Reference

All endpoints are prefixed with `/api/v1` (or `/api` for current version).

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
GET    /grades/attempt/:attemptId            Get grades for attempt
GET    /grades/assessment/:assessmentId      Get all grades for assessment
POST   /grades                               Create/update grade
PUT    /grades/:id                           Update grade
```

### Users

```
GET    /users                 List all users (admin only)
GET    /users/:id             Get user details
PUT    /users/:id             Update user
DELETE /users/:id             Delete user (admin only)
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
    "title": "JavaScript Fundamentals",
    ...
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

## Rate Limiting

Auth endpoints are rate limited:
- **15 requests per 15 minutes** per IP address

Response header when rate limited:
```
Retry-After: 300
```

## Example Requests

### Create Assessment

```bash
curl -X POST http://localhost:3001/api/assessments \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quiz",
    "organizationId": "...",
    "sections": [],
    "settings": {
      "passingScore": 70,
      "attemptsAllowed": 1
    }
  }'
```

### Start Attempt

```bash
curl -X POST http://localhost:3001/api/attempts/start \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "assessmentId": "64a1b2c3d4e5f6g7h8i9j0k1"
  }'
```

### Save Answer (Auto-save)

```bash
curl -X PUT http://localhost:3001/api/attempts/{attemptId}/answer \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "q1",
    "answer": "The answer to the question"
  }'
```

### Submit Attempt

```bash
curl -X POST http://localhost:3001/api/attempts/{attemptId}/submit \
  -H "Authorization: Bearer {token}"
```

## WebSocket Events (Real-time)

Connected via Socket.io at `ws://localhost:3001`

### Events Emitted by Server

```
proctor:incident      Student triggered a proctoring flag
proctor:submit        Student submitted attempt
attempt:update        Attempt status changed
grade:released        Grades released to student
```

### Events Sent by Client

```
attempt:answer        Answer saved (for real-time sync)
proctor:event         User event (tab switch, copy, etc.)
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
