# Hackathon App - Testing & Setup Guide

## Overview

This guide covers how to test the hackathon-app with full role-based access, test data, and features. The application now includes complete seed data with users, assessments, questions, and teams.

---

## Quick Start

### Start Application
```bash
cd /Users/saraheatherly/Desktop/hackathon-app
docker-compose up -d
sleep 40
docker-compose ps  # Verify all services are healthy
```

### Stop Application
```bash
docker-compose down
```

### Full Clean Reset (Remove All Data)
```bash
docker-compose down -v
```

---

## Test Credentials

All passwords are: `Demo@123456`

### Admin Account
- **Email:** admin@example.com
- **Role:** Admin
- **Access:** Full admin panel, can create assessments, teams, users
- **Page:** http://localhost:3000/auth/login

### Proctor Account
- **Email:** proctor@example.com
- **Role:** Proctor
- **Access:** Monitor assessments, view proctoring events
- **Page:** http://localhost:3000/auth/login

### Judge Accounts (3 judges)
- **Judge 1:** judge1@example.com (Sarah Johnson)
- **Judge 2:** judge2@example.com (Michael Chen)
- **Judge 3:** judge3@example.com (Emily Rodriguez)
- **Role:** Judge
- **Access:** View and score hackathon projects, leave feedback
- **Features:** Can access judge documentation, scoring rubrics, leaderboards

### Grader Account
- **Email:** grader@example.com
- **Role:** Grader
- **Access:** Grade assessment submissions, provide feedback
- **Features:** Can manually grade, leave comments, adjust scores

### Fellow Accounts (20 fellows - Participants)
- **Emails:** fellow1@example.com through fellow20@example.com
- **Role:** Fellow/Participant
- **Access:** Take assessments, submit projects, view team dashboard
- **Teams:** Already assigned to one of 6 teams

---

## Seeded Data

### Database includes:
✅ **1 Organization:** Justice Through Code
✅ **26 Users:** 1 admin, 1 proctor, 3 judges, 1 grader, 20 fellows
✅ **6 Questions:** Multiple choice, coding, long-form, freeform
✅ **3 Assessments:** Fundamentals, Intermediate, Advanced
✅ **6 Teams:** All assigned members and project information

---

## Assessment Testing

### Available Assessments

#### 1. JavaScript Fundamentals Quiz
- **Difficulty:** Easy to Medium
- **Time Limit:** 30 minutes
- **Attempts:** 3 allowed
- **Proctoring:** Disabled (good for testing without proctoring)
- **Results:** Shown immediately
- **Questions:**
  - What is JavaScript? (MCQ Single)
  - Variable Declaration (MCQ Single)
- **Total Points:** 20

#### 2. Intermediate JavaScript Challenge
- **Difficulty:** Medium
- **Time Limit:** 45 minutes
- **Attempts:** 2 allowed
- **Proctoring:** Enabled (tab switch, copy/paste detection)
- **Results:** Hidden until review
- **Questions:**
  - Array Methods (MCQ Multiple)
  - FizzBuzz Challenge (Coding)
- **Total Points:** 40

#### 3. Advanced JavaScript Assessment
- **Difficulty:** Hard
- **Time Limit:** 60 minutes
- **Attempts:** 1 only
- **Proctoring:** Full monitoring (webcam, fullscreen, ID check)
- **Accessibility:** 50% extra time, screen reader, dyslexia font
- **Questions:**
  - Explain Closures (Long-form)
  - Async/Await (Freeform)
- **Total Points:** 35

### How to Test Assessments

**As a Fellow (Participant):**
1. Log in with fellow1@example.com / Demo@123456
2. Go to Assessments section
3. Click on any assessment to see details
4. Click "Start Assessment" to begin
5. Answer questions and submit
6. View results based on assessment settings

**As a Grader:**
1. Log in with grader@example.com / Demo@123456
2. Go to Grading panel
3. View submitted assessments
4. Leave feedback and scores
5. Submit grades

---

## Team & Hackathon Testing

### Pre-created Teams

| Team Name | Members | Project | Track |
|-----------|---------|---------|-------|
| Code Wizards | 4 fellows | AI-Powered Study Assistant | Education |
| Data Ninjas | 3 fellows | Community Health Tracker | Health & Wellness |
| Tech Titans | 3 fellows | Smart Energy Monitor | Sustainability |
| Innovators | 2 fellows | Business Network Platform | Finance & Business |
| Future Builders | 3 fellows | Skills Marketplace | Education |
| Debug Squad | 2 fellows | Code Review Tool | Developer Tools |

### How to Test Teams

**As Admin:**
1. Log in with admin@example.com
2. Go to Admin > Hackathons section
3. View teams, members, projects
4. Can create new teams, add/remove members
5. Manage team submissions and disqualifications

**As a Fellow (Team Member):**
1. Log in with any fellow account
2. Go to Dashboard
3. View your team information
4. See team members and roles
5. View project details

**As a Judge:**
1. Log in with judge1@example.com
2. Go to Judge Dashboard
3. View hackathon leaderboard
4. Score team projects using rubrics
5. Leave feedback and comments

---

## Admin Panel Testing

### Admin Capabilities

#### User Management
- View all users with their roles
- Create new users
- Add/remove roles from users
- Manage user status (active/inactive)
- View user organizations

#### Assessment Management
- Create new assessments
- Edit draft assessments
- Publish assessments
- View all assessments
- Manage questions
- Set accessibility settings
- Configure proctoring rules

#### Team Management
- View all teams
- Create teams
- Add/remove team members
- Manage team projects
- Create hackathon sessions
- Assign teams to hackathons
- Grant accommodations (extra time, etc.)

#### Reports & Analytics
- View attempt statistics
- Check grading progress
- See team submissions
- Monitor proctoring events
- Generate reports

### How to Access Admin Panel

1. Log in with admin@example.com / Demo@123456
2. You should see "Admin Panel" in navigation
3. Navigate to:
   - Users Management
   - Assessments
   - Teams
   - Hackathons
   - Analytics

---

## Role-Based Access Testing

### What Each Role Should See

#### Admin
- ✅ Full application access
- ✅ Admin panel with all management tools
- ✅ User management
- ✅ Assessment builder
- ✅ Team management
- ✅ Reports and analytics
- ✅ Proctor monitoring tools

#### Proctor
- ✅ Assessment monitoring dashboard
- ✅ Proctoring events list (tab switches, copy/paste, etc.)
- ✅ Student activity during assessments
- ✅ Flagging system for suspicious activity
- ✅ Recording management
- ❌ Cannot edit assessments
- ❌ Cannot grade

#### Judge
- ✅ Hackathon viewing dashboard
- ✅ Team project information
- ✅ Scoring/rating interface
- ✅ Judge documentation (rubrics, guides)
- ✅ Leaderboard
- ✅ Comments and feedback tools
- ❌ Cannot edit team information
- ❌ Cannot view other judges' scorings

#### Grader
- ✅ Assessment submissions
- ✅ Manual grading interface
- ✅ Rubric-based scoring
- ✅ Feedback and comments
- ✅ Grade release controls
- ❌ Cannot see hackathon content
- ❌ Cannot modify assessments

#### Fellow (Participant)
- ✅ Personal dashboard
- ✅ Available assessments
- ✅ Take assessments
- ✅ View assessment results
- ✅ Team dashboard
- ✅ Project submission
- ✅ View grades
- ❌ Cannot access admin panel
- ❌ Cannot view other teams' details

---

## Feature Testing Checklist

### Authentication & Authorization
- [ ] Login with each role works
- [ ] Correct role displayed after login
- [ ] Logout functionality works
- [ ] Unauthorized pages redirect to login
- [ ] Each role sees only permitted features

### Assessments
- [ ] Fellow can view available assessments
- [ ] Fellow can start an assessment
- [ ] Fellow can answer MCQ questions
- [ ] Fellow can submit assessment
- [ ] Grader can view submissions
- [ ] Grader can score submissions
- [ ] Results display correctly

### Proctoring
- [ ] Proctoring rules display in assessment details
- [ ] Proctor can see monitoring dashboard
- [ ] Proctoring events log (if events triggered)
- [ ] Proctor can flag suspicious activity

### Teams & Projects
- [ ] Admin can create teams
- [ ] Admin can add team members
- [ ] Fellows see their team information
- [ ] Teams display with all members
- [ ] Project information is complete

### Judges & Scoring
- [ ] Judge can view teams
- [ ] Judge can leave scores and feedback
- [ ] Leaderboard shows correct rankings
- [ ] Judge documentation accessible

### Admin Panel
- [ ] Admin can create assessments
- [ ] Admin can manage users
- [ ] Admin can manage teams
- [ ] Admin can view analytics

---

## API Testing

### Authentication Endpoint
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Demo@123456"}'
```

### Get Assessments
```bash
# Replace TOKEN with actual access token from login
curl -X GET http://localhost:3001/api/assessments \
  -H "Authorization: Bearer TOKEN"
```

### Get Teams
```bash
curl -X GET http://localhost:3001/api/teams \
  -H "Authorization: Bearer TOKEN"
```

### Health Check
```bash
curl http://localhost:3001/health
```

---

## Common Testing Scenarios

### Scenario 1: Complete Assessment Flow
1. Log in as fellow1@example.com
2. Go to Assessments
3. Choose "JavaScript Fundamentals Quiz"
4. Click "Start Assessment"
5. Answer both questions
6. Submit assessment
7. View results
8. Log out

### Scenario 2: Admin Creates Assessment
1. Log in as admin@example.com
2. Go to Admin Panel > Assessments
3. Click "Create New Assessment"
4. Fill in title, description, questions
5. Set proctoring rules
6. Publish
7. Log out and test as fellow

### Scenario 3: Judge Scores Project
1. Log in as judge1@example.com
2. Go to Judge Dashboard
3. Select a team project to review
4. Fill in scoring rubric
5. Leave feedback/comments
6. Submit score
7. Check leaderboard update

### Scenario 4: Proctor Monitors Session
1. Log in as proctor@example.com
2. Go to Monitoring Dashboard
3. View active assessment sessions
4. Monitor student activity
5. Check for proctoring events
6. Flag suspicious activity if any

---

## Troubleshooting

### Services Not Starting
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs backend

# Rebuild and restart
docker-compose down -v
docker-compose up --build -d
```

### Port Conflicts
If ports 3000 or 3001 are in use:
```bash
# Find process using port
lsof -i :3000
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Database Issues
```bash
# Clear everything and restart
docker-compose down -v
docker volume prune
docker-compose up -d
```

### Can't Login
- Verify credentials are correct (see credentials section above)
- Check backend logs: `docker logs hackathon-backend`
- Ensure database is seeded: `docker logs hackathon-backend | grep "Created"`

---

## What's Next

### For Development
- Use admin account to create new assessments
- Use fellow accounts to test assessment taking
- Use judge accounts to test scoring
- Use grader accounts to test grading

### For Production Testing (UAT)
1. Create multiple teams with real people
2. Have judges score projects
3. Have fellows complete assessments
4. Test proctoring with real monitoring
5. Verify email notifications (if implemented)

### Future Enhancements
- [ ] Create hackathon sessions with timings
- [ ] Set up recording features
- [ ] Configure S3 for file storage
- [ ] Set up email notifications
- [ ] Create automated grading workflows
- [ ] Set up plagiarism detection

---

## Database Seeding Details

### Seeded Data Summary
```
Organization: 1
  Name: Justice Through Code
  Slug: justice-through-code

Users: 26 total
  - Admin: 1
  - Proctor: 1
  - Judges: 3
  - Grader: 1
  - Fellows: 20

Questions: 6
  - MCQ Single: 2
  - MCQ Multiple: 1
  - Coding: 1
  - Long-form: 1
  - Freeform: 1

Assessments: 3
  - Fundamentals (Easy): 2 questions, 30 min, 20 points
  - Intermediate (Medium): 2 questions, 45 min, 40 points
  - Advanced (Hard): 2 questions, 60 min, 35 points

Teams: 6
  - Code Wizards: 4 members
  - Data Ninjas: 3 members
  - Tech Titans: 3 members
  - Innovators: 2 members
  - Future Builders: 3 members
  - Debug Squad: 2 members
```

---

## Support & Issues

For issues or questions:
1. Check docker logs: `docker-compose logs`
2. Verify all services are healthy: `docker-compose ps`
3. Check backend health: `curl http://localhost:3001/health`
4. Review seeding: `docker logs hackathon-backend | grep -i "seed"`

---

**Last Updated:** November 24, 2025
**Version:** 1.0
**Status:** ✅ All systems operational
