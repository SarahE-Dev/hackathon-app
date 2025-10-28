# Getting Started with CodeArena

## 🚀 Quick Start (2 minutes)

### 1. Start Docker Containers

```bash
docker-compose up
```

Wait for "✓ Ready" messages. Services start at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### 2. Visit the App

Go to: **http://localhost:3000**

You'll see the CodeArena landing page with a neon cyberpunk design.

### 3. Login to Dashboard

Click **"Sign In"** button and use these credentials:

```
Email:    demo@example.com
Password: Demo@123456
```

### 4. Take the Assessment

1. On the dashboard, you'll see **"JavaScript Fundamentals Quiz"**
2. Click the **"Start"** button
3. Answer the 4 questions:
   - **Question 1**: Multiple Choice
   - **Question 2**: Short Answer
   - **Question 3**: Multi-Select
   - **Question 4**: Long Answer
4. Click **"Submit"** to finish

---

## 📍 What You Can Do Right Now

✅ **Sign up** with a new account
✅ **Login** with demo account
✅ **View assessments** on your dashboard
✅ **Take assessments** with different question types
✅ **Auto-save** responses (happens in background)

---

## 🛠️ Useful Commands

### Check Container Status
```bash
docker-compose ps
```

### View Logs
```bash
# Frontend logs
docker-compose logs -f frontend

# Backend logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f mongodb
```

### Stop Everything
```bash
docker-compose down
```

### Fresh Start (Clean Database)
```bash
docker-compose down -v
docker-compose up
```

### Access Database
```bash
# MongoDB shell
docker exec hackathon-mongodb mongosh hackathon-platform

# Redis CLI
docker exec hackathon-redis redis-cli
```

---

## 🔧 Development Mode (Local)

If you prefer to run locally without Docker:

```bash
# Install dependencies
npm install

# Start MongoDB and Redis in Docker
docker-compose up -d mongodb redis

# Start frontend (Terminal 1)
npm run dev:frontend

# Start backend (Terminal 2)
npm run dev:backend
```

Then visit: http://localhost:3000

---

## 📚 Learn More

- **Full README**: See [README.md](./README.md) for complete documentation
- **Docker Guide**: See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for advanced Docker usage
- **Architecture**: See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for system design
- **API Docs**: See [README.md#api-routes](./README.md#api-routes) for all endpoints

---

## 🎯 Next Steps

After you try the demo assessment:

1. **Create a new account** at http://localhost:3000/auth/register
2. **Explore the dashboard** to see assessment management
3. **Check out the code**:
   - Frontend: `frontend/src/`
   - Backend: `backend/src/`
   - Shared types: `shared/src/types/`

---

## ⚠️ Troubleshooting

### Port already in use?
```bash
# Kill process on port 3000
lsof -i :3000 -t | xargs kill -9

# Kill process on port 3001
lsof -i :3001 -t | xargs kill -9

# Restart
docker-compose up
```

### Docker issues?
```bash
# Clean and rebuild
docker-compose down -v
docker system prune -f
docker-compose build --no-cache
docker-compose up
```

### Database locked?
```bash
# Reset MongoDB
docker-compose down -v
docker-compose up
```

### Can't login?
- Confirm email is: `demo@example.com`
- Confirm password is: `Demo@123456`
- Wait a minute and try again (rate limiting may be active)

---

## 🎨 Design Notes

The platform features a **neon cyberpunk theme** with:
- Dark navy backgrounds (`bg-dark-900`)
- Neon blue, purple, pink accents
- Glass-morphism cards with frosted effect
- Smooth animations and hover states
- Fully responsive design

---

## 📊 Current Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | ✅ | JWT with refresh tokens |
| Assessments | ✅ | Create, publish, view |
| Question Types | ✅ | MCQ, Short/Long answer, Multi-select, Coding, File upload |
| Dashboard | ✅ | View assessments and attempt status |
| Assessment Taking | ✅ | Auto-save, all question types |
| Results | 🔄 | In progress |
| Grading | 🔄 | In progress |
| Proctoring | 🔄 | In progress |
| Hackathon Mode | ⏳ | Planned |
| Admin Dashboard | ⏳ | Planned |

---

## 💡 Pro Tips

- **Keyboard shortcuts**: Use Tab to navigate between questions
- **Auto-save**: Responses save every 10 seconds automatically
- **Browser console**: Open dev tools to see API calls and debugging
- **Docker volumes**: Your database persists between restarts
- **Tailwind classes**: The UI uses Tailwind CSS, fully customizable

---

## 🚨 Rate Limiting

The API has rate limiting to prevent abuse:
- 15 login/registration attempts per 15 minutes
- If you see "Too many attempts", wait a few minutes and try again

---

## 📞 Questions?

Check these in order:
1. [README.md](./README.md) - Full documentation
2. [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Docker specific
3. [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Architecture
4. GitHub Issues - Report bugs

---

**Happy assessing! 🚀**
