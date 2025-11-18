# 🐳 Docker Setup Guide

## ✅ Docker Compatibility Status

**All implemented features work with Docker!** ✨

---

## 🚀 Quick Start

### 1. **Start All Services:**
```bash
docker-compose up -d
```

This starts:
- MongoDB (port 27017)
- Redis (port 6379)
- Backend API (port 3001)
- Frontend (port 3000)

### 2. **Check Service Health:**
```bash
docker-compose ps
```

All services should show "healthy" status.

### 3. **View Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. **Access the Platform:**
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **MongoDB:** mongodb://localhost:27017
- **Redis:** redis://localhost:6379

---

## 🔧 Environment Variables

The following environment variables are configured in `docker-compose.yml`:

### Backend:
```yaml
NODE_ENV=production
BACKEND_PORT=3001
MONGODB_URI=mongodb://mongodb:27017/hackathon-platform
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
FRONTEND_URL=http://localhost:3000
```

### Frontend:
```yaml
NODE_ENV=development
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

**⚠️ IMPORTANT:** Change JWT secrets before production deployment!

---

## 🧪 Testing Features in Docker

### 1. **Test Error Handling:**
```bash
# Frontend error boundaries work
# Try throwing an error in browser console
# Your work should auto-save
```

### 2. **Test Plagiarism Detection:**
```bash
# From your host machine
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -X POST http://localhost:3001/api/plagiarism/similarity \
  -H "Content-Type: application/json" \
  -d '{"questionId":"q123","assessmentId":"a456"}'
```

### 3. **Test Offline Support:**
```bash
# 1. Start assessment in browser
# 2. Pause Docker container: docker-compose pause backend
# 3. Answer questions (saved offline)
# 4. Resume: docker-compose unpause backend
# 5. Answers auto-sync
```

### 4. **Test WebSocket Connections:**
```bash
# Check if Socket.io is working
curl http://localhost:3001/socket.io/

# Should return: {"code":0,"message":"Transport unknown"}
# This means Socket.io is running
```

### 5. **Test Collaborative Editor:**
```bash
# 1. Open http://localhost:3000/hackathon/session/SESSION_ID in two browser tabs
# 2. Type in one tab, should appear in the other
# 3. Check team chat
# 4. Check cursor positions
```

---

## 🔍 Troubleshooting

### Issue: Services won't start
```bash
# Check what's using the ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :27017 # MongoDB
lsof -i :6379  # Redis

# Kill processes if needed
kill -9 <PID>

# Restart Docker
docker-compose down
docker-compose up -d
```

### Issue: Frontend can't connect to backend
```bash
# Check backend health
curl http://localhost:3001/health

# Check backend logs
docker-compose logs backend

# Verify network
docker network ls
docker network inspect hackathon_hackathon-network
```

### Issue: MongoDB connection fails
```bash
# Check MongoDB health
docker exec hackathon-mongodb mongosh --eval "db.adminCommand('ping')"

# Check logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Issue: WebSocket connections fail
```bash
# Check Socket.io paths
# Make sure your frontend uses:
const socket = io('http://localhost:3001', {
  path: '/collaboration',  // or '/proctoring'
  transports: ['websocket']
});

# Test connection
wscat -c ws://localhost:3001/socket.io/?EIO=4&transport=websocket
```

### Issue: Redis connection fails
```bash
# Test Redis
docker exec hackathon-redis redis-cli ping
# Should return: PONG

# Check logs
docker-compose logs redis
```

### Issue: Build fails
```bash
# Clean and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## 📦 Managing Dependencies

### Adding New npm Packages:

#### Frontend:
```bash
# 1. Add to package.json
cd frontend
npm install new-package

# 2. Rebuild Docker image
docker-compose build frontend

# 3. Restart container
docker-compose restart frontend
```

#### Backend:
```bash
# 1. Add to package.json
cd backend
npm install new-package

# 2. Rebuild Docker image
docker-compose build backend

# 3. Restart container
docker-compose restart backend
```

---

## 🔄 Update & Rebuild

### After code changes:
```bash
# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose up -d --build backend
```

### Clean slate rebuild:
```bash
# Stop all containers
docker-compose down

# Remove volumes (⚠️ deletes database!)
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

---

## 💾 Data Persistence

Docker volumes persist data:
- `mongodb_data` - Database data
- `redis_data` - Cache data

### Backup MongoDB:
```bash
# Backup
docker exec hackathon-mongodb mongodump --out=/data/backup

# Copy to host
docker cp hackathon-mongodb:/data/backup ./mongodb-backup

# Restore
docker exec hackathon-mongodb mongorestore /data/backup
```

---

## 🌐 Production Deployment

### 1. **Update Environment Variables:**
```bash
# Create .env file
cat > .env << EOF
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
EOF
```

### 2. **Use Production Compose File:**
```bash
# Create docker-compose.prod.yml
cp docker-compose.yml docker-compose.prod.yml

# Edit to:
# - Use production environment variables
# - Enable SSL/TLS
# - Set proper resource limits
# - Configure logging
```

### 3. **Enable SSL (Optional):**
```bash
# Add nginx reverse proxy
# See: docs/DEPLOYMENT.md for full guide
```

---

## 🔒 Security Checklist for Docker

- [ ] Change JWT secrets from defaults
- [ ] Use `.env` file for secrets (not in docker-compose.yml)
- [ ] Don't expose MongoDB/Redis ports in production
- [ ] Use Docker secrets for sensitive data
- [ ] Enable Docker content trust
- [ ] Scan images for vulnerabilities: `docker scan`
- [ ] Use non-root users in containers
- [ ] Enable AppArmor/SELinux
- [ ] Set resource limits (CPU, memory)
- [ ] Enable Docker logging

---

## 📊 Monitoring in Docker

### View Resource Usage:
```bash
# All containers
docker stats

# Specific container
docker stats hackathon-backend
```

### Check Container Health:
```bash
# View health status
docker inspect --format='{{.State.Health.Status}}' hackathon-backend

# View health logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' hackathon-backend
```

---

## 🐛 Debug Mode

### Run with debug logging:
```bash
# Stop services
docker-compose down

# Start with verbose logging
docker-compose up

# Or specific service
docker-compose up backend
```

### Access container shell:
```bash
# Backend
docker exec -it hackathon-backend sh

# MongoDB
docker exec -it hackathon-mongodb mongosh

# Redis
docker exec -it hackathon-redis redis-cli
```

---

## ✅ Feature Compatibility Matrix

| Feature | Docker Compatible | Notes |
|---------|-------------------|-------|
| Error Handling | ✅ Yes | Works out of the box |
| Plagiarism Detection | ✅ Yes | All APIs work |
| Audit Trail | ✅ Yes | Events stored in MongoDB |
| Auto-Grading | ✅ Yes | Code execution works |
| Offline Support | ✅ Yes | Client-side feature |
| Question Navigator | ✅ Yes | Frontend component |
| Keyboard Shortcuts | ✅ Yes | Client-side feature |
| Collaborative Editor | ✅ Yes | WebSocket works through Docker |

**All features are 100% compatible with Docker!** 🎉

---

## 🚢 Development Workflow

### Typical workflow:
```bash
# 1. Start services
docker-compose up -d

# 2. Make code changes
# (Files are mounted, changes reflect automatically in dev mode)

# 3. View logs
docker-compose logs -f

# 4. Restart if needed
docker-compose restart backend  # or frontend

# 5. Stop when done
docker-compose down
```

### Hot reload:
- **Frontend:** Hot reload works automatically (Next.js)
- **Backend:** Use `tsx watch` in dev mode (already configured)

---

## 📈 Performance Tuning

### Optimize build times:
```dockerfile
# frontend/Dockerfile - use multi-stage build
FROM node:20-alpine AS deps
# Install dependencies

FROM node:20-alpine AS builder
# Build application

FROM node:20-alpine AS runner
# Run production build
```

### Resource limits:
```yaml
# Add to docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

---

## 🔄 CI/CD with Docker

### GitHub Actions example:
```yaml
name: Docker Build & Test

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build images
        run: docker-compose build
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Run tests
        run: docker-compose exec -T backend npm test
      
      - name: Stop services
        run: docker-compose down
```

---

## 📚 Additional Resources

- **Docker Compose Docs:** https://docs.docker.com/compose/
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/
- **MongoDB in Docker:** https://hub.docker.com/_/mongo
- **Redis in Docker:** https://hub.docker.com/_/redis
- **Next.js in Docker:** https://nextjs.org/docs/deployment#docker-image

---

## ❓ FAQ

### Q: Do I need to rebuild after every code change?
**A:** No! In development mode, files are mounted and changes reflect automatically.

### Q: Can I use docker-compose for production?
**A:** Yes, but use `docker-compose.prod.yml` with production settings.

### Q: How do I scale services?
**A:** Use `docker-compose up -d --scale backend=3` to run multiple backend instances.

### Q: What about code execution security?
**A:** Use Docker-in-Docker for sandboxed code execution (see code-runner service).

### Q: Can I use Kubernetes instead?
**A:** Yes! Convert docker-compose to K8s with `kompose convert`.

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] Test all features in Docker locally
- [ ] Update JWT secrets
- [ ] Configure proper CORS
- [ ] Set up SSL/TLS
- [ ] Configure logging
- [ ] Set resource limits
- [ ] Enable health checks
- [ ] Test backup/restore
- [ ] Load test with docker-compose scale
- [ ] Review security settings
- [ ] Test failover scenarios
- [ ] Configure monitoring
- [ ] Document deployment process

---

## 🎉 Summary

**Everything works with Docker!** All 8 implemented features are fully compatible:

✅ Error handling  
✅ Plagiarism detection  
✅ Audit trail  
✅ Auto-grading  
✅ Offline support  
✅ Question navigator  
✅ Keyboard shortcuts  
✅ Collaborative editor  

Just run `docker-compose up -d` and you're ready to go! 🚀
