# Deployment Guide - JTC Hackathon Platform

## Quick Start Deployment Options

### Option 1: Railway (Easiest - Recommended)
Railway handles everything and has a generous free tier.

1. **Create Railway account**: https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Add services:
   - MongoDB (add from Railway)
   - Redis (add from Railway)
   - Backend (from your repo, `/backend` directory)
   - Frontend (from your repo, `/frontend` directory)

### Option 2: Vercel (Frontend) + Railway (Backend + DBs)
Good for free hosting with better frontend performance.

### Option 3: Manual Cloud Setup
Most control, but more work.

---

## Required Services

### 1. MongoDB Atlas (Database)
1. Go to https://mongodb.com/atlas
2. Create free account
3. Create a **FREE M0 cluster**
4. Create database user (save username/password!)
5. Network Access → Add `0.0.0.0/0` (allow from anywhere)
6. Get connection string: `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/hackathon-platform`

### 2. Redis (Cache & Socket.IO)
**Option A: Upstash (Serverless - Recommended)**
1. Go to https://upstash.com
2. Create free account
3. Create Redis database
4. Get connection string: `rediss://default:<password>@<endpoint>.upstash.io:6379`

**Option B: Redis Cloud**
1. Go to https://redis.com/try-free
2. Create free account
3. Create database
4. Get connection URL

### 3. Code Runner Service
⚠️ **Security Warning**: The code runner executes user code. For production:
- Run in isolated Docker containers
- Use AWS Lambda or similar serverless functions
- Set strict resource limits

For MVP/demo, you can run it alongside the backend with Docker.

---

## Environment Variables

### Backend (.env)
```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hackathon-platform

# Redis
REDIS_URL=rediss://default:password@endpoint.upstash.io:6379

# Auth (generate secure random strings!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# Server
PORT=3001
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com

# Code Runner (if separate service)
CODE_RUNNER_URL=http://code-runner:3002
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_WS_URL=wss://your-backend-domain.com
```

---

## Database Setup

### Production Seed (Fresh Deployment)
```bash
# Set your MongoDB connection string
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/hackathon-platform"

# Run production seed (creates org, admin, and coding problems only)
npm run seed:production --workspace=backend
```

This creates:
- ✅ Organization (Justice Through Code)
- ✅ Admin user (admin@justicethroughcode.org / ChangeMe123!)
- ✅ 8 coding problems (Two Sum, Reverse String, FizzBuzz, etc.)
- ❌ No demo users
- ❌ No teams (create via admin dashboard)
- ❌ No sessions (create via admin dashboard)

### After Deployment
1. Login as admin
2. **Change the admin password immediately!**
3. Add judges via User Management
4. Pre-register fellows via User Management
5. Create teams
6. Create hackathon session and assign teams/problems

---

## Deployment Steps by Platform

### Railway Deployment

1. **Push to GitHub** (if not already)

2. **Create Railway Project**
   - New Project → Deploy from GitHub

3. **Add MongoDB**
   - New → Database → MongoDB
   - Copy `MONGODB_URL` from Variables tab

4. **Add Redis**
   - New → Database → Redis
   - Copy `REDIS_URL` from Variables tab

5. **Deploy Backend**
   - New → GitHub Repo → Select your repo
   - Settings:
     - Root Directory: `backend`
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
   - Variables: Add all backend env vars

6. **Deploy Frontend**
   - New → GitHub Repo → Select your repo
   - Settings:
     - Root Directory: `frontend`
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
   - Variables: Add frontend env vars

7. **Run Seed**
   - In backend service terminal: `npm run seed:production`

### Vercel + External Backend

1. **Deploy Frontend to Vercel**
   ```bash
   cd frontend
   vercel
   ```
   - Set root directory to `frontend`
   - Add environment variables

2. **Deploy Backend to Railway/Render/Fly.io**
   - Follow platform-specific instructions
   - Ensure WebSocket support is enabled

---

## Post-Deployment Checklist

- [ ] Admin password changed
- [ ] HTTPS enabled on all services
- [ ] CORS configured correctly
- [ ] WebSocket connections working
- [ ] Code execution service secured
- [ ] Database backups configured
- [ ] Monitoring/logging set up (optional but recommended)

---

## Troubleshooting

### "No organization found"
Run the production seed: `npm run seed:production --workspace=backend`

### WebSocket connection failing
- Check `FRONTEND_URL` is set correctly on backend
- Ensure your hosting platform supports WebSockets
- Railway, Render, Fly.io all support WebSockets

### CORS errors
- Verify `FRONTEND_URL` matches your actual frontend URL
- Include the protocol (https://)

### Login failing
- Check JWT_SECRET is set and consistent
- Verify MongoDB connection string is correct
- Check browser console for specific errors

---

## Cost Estimates (Monthly)

| Service | Free Tier | Paid |
|---------|-----------|------|
| MongoDB Atlas | M0 (512MB) - FREE | M10+ from $57 |
| Upstash Redis | 10K commands/day - FREE | From $10 |
| Railway | $5 credit - FREE | From $5 |
| Vercel | 100GB bandwidth - FREE | From $20 |

**For a hackathon with ~20-50 users, free tiers should be sufficient!**

---

## Security Notes

1. **Never commit secrets** - Use environment variables
2. **Change default passwords** immediately after deployment
3. **Code Runner Isolation** - User code should run in sandboxed containers
4. **Rate Limiting** - Already configured, but review limits for production
5. **HTTPS Only** - Most platforms enforce this automatically

