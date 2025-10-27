# Quick Start Guide

Get your hackathon proctoring platform running in 5 minutes!

## Prerequisites

Make sure you have these installed:
- **Node.js 20+** and npm
- **Docker** and Docker Compose
- **Git**

## Step 1: Install Dependencies

```bash
npm install
```

This will install all dependencies for all workspaces (frontend, backend, code-runner, shared).

## Step 2: Start Database Services

```bash
docker-compose up -d mongodb redis
```

This starts:
- MongoDB on `localhost:27017`
- Redis on `localhost:6379`

Verify they're running:
```bash
docker ps
```

## Step 3: Configure Environment

```bash
cp .env.example .env
```

**Important**: Generate secure JWT secrets:
```bash
# On Mac/Linux
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env
```

Your `.env` should look like this:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/hackathon-platform

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (generated above)
JWT_SECRET=your-generated-secret
JWT_REFRESH_SECRET=your-generated-refresh-secret

# Server
NODE_ENV=development
BACKEND_PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Step 4: Start Development Servers

```bash
npm run dev
```

This starts both servers:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

Or run them separately:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## Step 5: Test the API

### Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-10-20T..."}
```

### Register a User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "admin@example.com",
      "firstName": "Admin",
      "lastName": "User",
      "roles": []
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

**Save the `accessToken`** - you'll need it for authenticated requests!

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!"
  }'
```

### Get Current User (Authenticated)
```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Replace `YOUR_ACCESS_TOKEN` with the token from register/login response.

---

## Common Commands

### Development
```bash
# Start both servers
npm run dev

# Start only backend
npm run dev:backend

# Start only frontend
npm run dev:frontend
```

### Database Management
```bash
# View MongoDB logs
docker logs hackathon-mongodb

# Connect to MongoDB shell
docker exec -it hackathon-mongodb mongosh

# Inside mongosh:
use hackathon-platform
show collections
db.users.find()

# Stop database services
docker-compose down

# Restart database services
docker-compose restart mongodb redis
```

### Linting & Type Checking
```bash
# Lint all code
npm run lint

# Type check
npm run type-check --workspace=backend
npm run type-check --workspace=frontend
```

### Build for Production
```bash
npm run build
```

---

## Testing API Endpoints

### Using cURL

**1. Create an Organization** (Admin only - first manually add admin role to user in DB)

```bash
# Connect to MongoDB
docker exec -it hackathon-mongodb mongosh

# In mongosh:
use hackathon-platform
db.users.updateOne(
  { email: "admin@example.com" },
  { $push: { roles: { role: "admin", organizationId: ObjectId() } } }
)
```

**2. Create a Question**

```bash
curl -X POST http://localhost:3001/api/assessments/questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "mcq-single",
    "title": "What is 2 + 2?",
    "content": {
      "prompt": "Select the correct answer:",
      "options": [
        {"id": "a", "text": "3", "isCorrect": false},
        {"id": "b", "text": "4", "isCorrect": true},
        {"id": "c", "text": "5", "isCorrect": false}
      ],
      "correctAnswer": "b"
    },
    "tags": ["math", "basic"],
    "difficulty": "easy",
    "organizationId": "YOUR_ORG_ID",
    "points": 1
  }'
```

**3. Publish Question**

```bash
curl -X POST http://localhost:3001/api/assessments/questions/QUESTION_ID/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**4. Create Assessment**

```bash
curl -X POST http://localhost:3001/api/assessments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Basic Math Quiz",
    "description": "A simple math assessment",
    "organizationId": "YOUR_ORG_ID",
    "sections": [{
      "id": "section1",
      "title": "Section 1",
      "questionIds": ["QUESTION_ID"],
      "timeLimit": 10,
      "randomizeQuestions": false,
      "randomizeOptions": false
    }],
    "settings": {
      "totalTimeLimit": 10,
      "attemptsAllowed": 1,
      "showResultsImmediately": true,
      "allowReview": true,
      "allowBackward": true,
      "shuffleSections": false,
      "proctoring": {
        "enabled": true,
        "requireIdCheck": false,
        "detectTabSwitch": true,
        "detectCopyPaste": true
      },
      "accessibility": {
        "allowExtraTime": false,
        "allowScreenReader": true,
        "dyslexiaFriendlyFont": false
      }
    }
  }'
```

### Using Postman/Insomnia

1. Import this collection or create requests manually
2. Set environment variable `BASE_URL` = `http://localhost:3001`
3. Set `TOKEN` = your access token after login
4. Use `{{BASE_URL}}` and `Bearer {{TOKEN}}` in requests

---

## Troubleshooting

### Port Already in Use

If ports 3000 or 3001 are already in use:

```bash
# Find process using port
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 PID
```

Or change ports in `.env`:
```env
BACKEND_PORT=3002
```

And in `frontend/package.json`:
```json
"dev": "next dev -p 3001"
```

### MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**:
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# If not running, start it
docker-compose up -d mongodb

# Check logs
docker logs hackathon-mongodb
```

### Cannot Find Module Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
rm -rf */node_modules */package-lock.json
npm install
```

### TypeScript Errors

```bash
# Rebuild shared types
npm run build --workspace=shared

# Restart TypeScript server in your IDE
```

### Database Connection Hangs

Sometimes MongoDB needs a full restart:
```bash
docker-compose down
docker volume rm hackathon-app_mongodb_data  # WARNING: Deletes all data!
docker-compose up -d mongodb
```

---

## What's Working Now?

✅ **User Registration & Authentication**
- Register new users
- Login with email/password
- JWT token refresh
- Role-based access control

✅ **User Management** (Admin only)
- List, create, update, delete users
- Assign roles to users
- Organization-scoped access

✅ **Question Bank**
- Create questions (MCQ, freeform, coding, file-upload)
- Draft → Publish workflow
- Filter by type, difficulty, tags
- Duplicate and archive questions

✅ **Assessment Builder**
- Create assessments with multiple sections
- Add questions from question bank
- Configure time limits and proctoring
- Publish with immutable snapshots

---

## What's Not Implemented Yet?

❌ Session management (starting a test session)
❌ Attempt tracking (taking a test)
❌ Real-time proctoring monitoring
❌ Code execution engine
❌ Grading interface
❌ Hackathon features (teams, judging)
❌ Frontend UI (only basic structure)

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for details.

---

## Next Development Steps

1. **Implement Session/Attempt System**
   - Create session controller
   - Implement attempt tracking
   - Add autosave functionality

2. **Build Frontend Pages**
   - Login/Register pages
   - Dashboard
   - Assessment taking interface

3. **Add Real-time Proctoring**
   - WebSocket event handlers
   - Proctor dashboard
   - Tab/blur detection

4. **Code Execution Engine**
   - Docker sandbox setup
   - BullMQ worker
   - Test case runner

---

## Useful Resources

- **Project Plan**: [PROJECT_PLAN.md](./PROJECT_PLAN.md) - 10-week implementation roadmap
- **Implementation Status**: [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Current progress
- **Requirements**: [plan.txt](./plan.txt) - Original requirements document

---

## Need Help?

1. Check [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for what's implemented
2. Check [PROJECT_PLAN.md](./PROJECT_PLAN.md) for architecture details
3. Check logs: `docker logs hackathon-mongodb` or `npm run dev:backend`
4. Open an issue on GitHub

---

🎉 **You're all set!** Your hackathon proctoring platform is running with a production-ready authentication system, user management, question bank, and assessment builder.

Happy coding! 🚀
