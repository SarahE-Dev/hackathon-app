# Quick Start Guide 🚀

Get the enhanced platform running in minutes!

## Option 1: Docker (Recommended) 🐳

### Start Fresh with Seed Data

```bash
# Clean start with all seed data
docker-compose down -v
docker-compose up --build
```

### Access the Platform

Once all services are up (MongoDB, Redis, Backend, Frontend):

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **MongoDB:** localhost:27017
- **Redis:** localhost:6379

### Login Credentials

```
Admin:     admin@example.com     / password123
Proctor:   proctor@example.com   / password123
Judge 1:   judge1@example.com    / password123
Judge 2:   judge2@example.com    / password123
Judge 3:   judge3@example.com    / password123
Grader:    grader@example.com    / password123
Students:  student1@example.com - student20@example.com / password123
```

---

## Option 2: Local Development 💻

### Prerequisites

- Node.js 18+
- MongoDB
- Redis

### Setup

```bash
# Install dependencies
npm install

# Backend
cd backend
npm install
npm run seed  # Load test data
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## What to Test 🎯

### 1. Admin Dashboard (`/admin`)

Login as `admin@example.com`:

✅ View live statistics
✅ Click stat cards to navigate
✅ Access quick actions
✅ See team overview
✅ Check recent activity

### 2. User Management (`/admin/users`)

✅ View all 23 seeded users
✅ Filter by role
✅ Search users
✅ Add a judge role to student1
✅ Remove a role
✅ See statistics update

### 3. Analytics (`/admin/analytics`)

✅ System health indicators
✅ User distribution chart
✅ Hackathon stats
✅ Team metrics
✅ Time range selector

### 4. Judge Dashboard (`/judge`)

Login as `judge1@example.com`:

✅ See 5 submitted projects
✅ Click "Score Project"
✅ Review team details
✅ Use rubric sliders (0.5 increments)
✅ Add notes
✅ Submit score
✅ See your submitted score
✅ Update your score

### 5. Assessment Grading (`/judge/grading`)

Login as judge or grader:

✅ View submissions list
✅ Filter by status
✅ Search submissions
✅ See grading statistics
✅ Click to grade (if data available)

---

## Seed Data Included 📦

### Users (23):
- 1 Admin
- 1 Proctor
- 3 Judges
- 1 Grader
- 20 Students

### Teams (6):
1. **Code Wizards** - AI Study Assistant (Submitted ✅)
2. **Data Ninjas** - Health Tracker (Submitted ✅)
3. **Tech Titans** - Energy Monitor (Submitted ✅)
4. **Innovators** - Business Connect (Submitted ✅)
5. **Future Builders** - Skills Marketplace (Submitted ✅)
6. **Debug Squad** - Code Review Tool (In Progress 🔄)

### Assessments (3):
- JavaScript Fundamentals Quiz
- Algorithm Challenge
- Technical Interview Prep

### Questions (6):
- 2 Multiple Choice
- 2 Coding Problems
- 2 Essay Questions

### Hackathon Session:
- Active 7-day hackathon
- All teams registered
- 2 coding challenges

---

## Quick Navigation 🗺️

### Admin Routes:
- `/admin` - Main dashboard
- `/admin/users` - User management
- `/admin/analytics` - Platform analytics
- `/admin/sessions` - Session management
- `/admin/leaderboard` - Competition standings

### Judge Routes:
- `/judge` - Judge dashboard
- `/judge/grading` - Assessment grading

### Proctor Routes:
- `/proctor/monitor` - Live monitoring

### Hackathon Routes:
- `/hackathon/teams` - Browse teams
- `/hackathon/teams/[id]` - Team details

### General:
- `/dashboard` - User dashboard
- `/auth/login` - Login page
- `/assessment/[id]` - Take assessment

---

## Troubleshooting 🔧

### Docker Issues

**Services won't start:**
```bash
docker-compose down -v  # Remove volumes
docker-compose up --build  # Rebuild
```

**Port conflicts:**
```bash
# Check what's using ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :27017 # MongoDB
lsof -i :6379  # Redis
```

**Seed data not loading:**
```bash
# Rebuild backend
docker-compose up --build backend
```

### Local Development Issues

**MongoDB connection:**
- Ensure MongoDB is running: `mongosh`
- Check connection string in `.env`

**Redis connection:**
- Ensure Redis is running: `redis-cli ping`
- Should return `PONG`

**Port already in use:**
```bash
# Kill process on port 3000
kill -9 $(lsof -ti:3000)
```

---

## Next Steps 🎯

### Explore Features:
1. **Try all user roles** - Login as admin, judge, proctor, student
2. **Score projects** - Use the rubric system to score teams
3. **Manage users** - Add/remove roles, search users
4. **Check analytics** - View platform metrics
5. **Test assessments** - Take an assessment as a student

### Customize:
1. **Modify rubric** - Edit scoring criteria in judge page
2. **Add more seed data** - Extend `comprehensive.seed.ts`
3. **Adjust styling** - Update Tailwind config
4. **Configure proctoring** - Adjust settings per assessment

### Deploy:
1. **Review `DOCKER_SETUP.md`** - Production deployment guide
2. **Check security** - Update passwords, secrets
3. **Configure domains** - Set environment variables
4. **Enable SSL** - Add certificates
5. **Set up monitoring** - Logs, metrics, alerts

---

## Documentation 📚

### Comprehensive Guides:
- `ADMIN_JUDGE_GUIDE.md` - Detailed feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `DOCKER_SETUP.md` - Docker deployment guide

### API Documentation:
- `docs/API.md` - API endpoints
- `docs/FEATURES.md` - Feature list
- `docs/ARCHITECTURE.md` - System architecture

---

## Support 💬

### Getting Help:
1. Check documentation files
2. Review inline code comments
3. Inspect browser console for errors
4. Check backend logs: `docker-compose logs backend`

---

## Summary ✨

You now have:
- ✅ Professional admin dashboard
- ✅ Advanced judging system
- ✅ Complete test data
- ✅ 23 users ready to use
- ✅ 6 teams with projects
- ✅ Active hackathon
- ✅ All roles configured

**Everything is ready to go!** 🎉

Login, explore, and start testing all the new features!
