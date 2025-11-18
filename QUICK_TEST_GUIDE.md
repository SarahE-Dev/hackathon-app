# Quick Test Guide - RBAC & Python-Only Features

## 🚀 Quick Start with Docker

### 1. Clean Start (Recommended)
```bash
# Stop everything and clean volumes
docker-compose down -v

# Rebuild and start
docker-compose up --build

# Watch backend logs to confirm seed ran
docker logs -f hackathon-backend
```

You should see:
```
Checking if database needs seeding...
No users found. Running database seed...
Database seeding completed!
Starting backend server...
```

### 2. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MongoDB**: localhost:27017

## 🧪 Test Scenarios

### Test 1: RBAC Login Redirects

#### Admin Login
1. Go to http://localhost:3000/auth/login
2. Click "Admin" demo button (or enter manually):
   - Email: `admin@example.com`
   - Password: `Demo@123456`
3. Click "Sign In"
4. **Expected**: Redirects to `/admin` (Admin Control Panel)
5. **Verify**: You see admin dashboard with management cards

#### Proctor Login
1. Logout and return to login
2. Click "Proctor" demo button:
   - Email: `proctor@example.com`
   - Password: `Demo@123456`
3. Click "Sign In"
4. **Expected**: Redirects to `/proctor` (Proctor Dashboard)
5. **Verify**: You see proctoring monitoring interface

#### Judge Login
1. Logout and return to login
2. Use judge credentials:
   - Email: `judge1@example.com`
   - Password: `Demo@123456`
3. Click "Sign In"
4. **Expected**: Redirects to `/judge` (Judge Dashboard)
5. **Verify**: You see judge scoring interface

#### Student Login
1. Logout and return to login
2. Click "Student" demo button:
   - Email: `student1@example.com`
   - Password: `Demo@123456`
3. Click "Sign In"
4. **Expected**: Redirects to `/dashboard` (Student Dashboard)
5. **Verify**: You see available assessments and team info

### Test 2: Python-Only Coding Questions

#### Assessment Coding Question
1. Login as **Admin** (`admin@example.com`)
2. Navigate to: **Admin** → **Questions** → **Create New Question**
3. Select question type: **Coding**
4. **Expected**: Language field shows "Python (Only Python is supported)" (no dropdown)
5. Fill in:
   - Title: "Test Python Function"
   - Difficulty: Easy
   - Points: 100
   - Problem statement: "Write a function that returns 'Hello'"
   - Starter code: `def hello():\n    pass`
   - Add test case:
     - Input: (empty)
     - Expected: `Hello`
6. Click "Create Question"
7. **Expected**: Question created successfully with Python as language

#### Taking an Assessment
1. Logout, login as **Student** (`student1@example.com`)
2. Go to **Assessments** → Find an assessment with coding questions
3. Start the assessment
4. When you reach a coding question:
   - **Expected**: No language dropdown visible
   - **Expected**: Display shows "Language: Python"
   - **Expected**: Monaco editor is in Python mode
5. Write some Python code
6. Click "Run Code"
7. **Expected**: Code executes as Python

### Test 3: Live Coding Session (Hackathon)

1. Login as **Admin**
2. Create a hackathon session (if needed):
   - Navigate to **Admin** → **Sessions**
   - Create new session with coding problems
3. Logout, login as **Student** with team
4. Join the hackathon session
5. When coding interface appears:
   - **Expected**: Language selector is replaced with "Language: Python" text
   - **Expected**: No dropdown to change language
   - **Expected**: Code editor is in Python mode
6. Write Python code and run it
7. **Expected**: Code executes successfully in Python

### Test 4: Verify No Language Selectors

Check these pages to ensure NO language dropdowns exist:

✅ **Pages to Check**:
- `/admin/questions/new` - Question builder (Coding type)
- `/assessment/[id]` - Taking assessment with coding question
- `/hackathon/session/[sessionId]` - Live coding session

✅ **What to Look For**:
- Static text: "Language: Python" or "Python (Only Python is supported)"
- NO dropdown/select element for languages
- Code always executes as Python

## 🔍 Verification Checklist

### Docker Seed
- [ ] Docker starts successfully
- [ ] Backend logs show "Database seeding completed!"
- [ ] Can login with demo accounts immediately
- [ ] No manual seed command needed

### RBAC Routing
- [ ] Admin → `/admin`
- [ ] Proctor → `/proctor`
- [ ] Judge → `/judge`
- [ ] Student → `/dashboard`
- [ ] Each role sees appropriate dashboard

### Python-Only Coding
- [ ] No language selector in question builder
- [ ] No language selector in assessments
- [ ] No language selector in live sessions
- [ ] All code runs as Python
- [ ] Monaco editor shows Python syntax highlighting

## 🐛 Troubleshooting

### Seed Doesn't Run
```bash
# Check backend logs
docker logs hackathon-backend

# Manually run seed if needed
docker exec -it hackathon-backend npm run seed --workspace=backend
```

### Wrong Redirect After Login
- Clear browser cache and localStorage
- Check browser console for errors
- Verify user has correct role in database

### Can't Run Code
- Check backend is running: `docker ps`
- Check API is accessible: http://localhost:3001/health
- Check browser console for errors
- Verify MongoDB connection

## 📝 Test Accounts Summary

| Role | Email | Password | Redirect |
|------|-------|----------|----------|
| Admin | admin@example.com | Demo@123456 | /admin |
| Proctor | proctor@example.com | Demo@123456 | /proctor |
| Judge | judge1@example.com | Demo@123456 | /judge |
| Student | student1@example.com | Demo@123456 | /dashboard |

## ✅ Success Criteria

All tests pass when:
1. ✅ Docker automatically seeds database on first run
2. ✅ Each role redirects to correct dashboard
3. ✅ No language selectors visible anywhere
4. ✅ All coding features use Python only
5. ✅ Code execution works correctly
6. ✅ No console errors

## 📞 Need Help?

If tests fail, check:
1. Docker containers are all running: `docker ps`
2. Backend logs: `docker logs hackathon-backend`
3. Frontend logs: `docker logs hackathon-frontend`
4. MongoDB logs: `docker logs hackathon-mongodb`
5. Browser console (F12)
