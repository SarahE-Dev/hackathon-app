# Docker Setup Guide - CodeArena

This guide explains how to run the entire CodeArena platform using Docker.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0+
- At least 4GB of RAM allocated to Docker
- ~10GB of disk space for images and volumes

## Quick Start

### Production Build (Recommended for Deployment)

```bash
# Build and start all services
docker compose up

# Or build in the background
docker compose up -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f code-runner
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MongoDB**: mongodb://localhost:27017
- **Redis**: localhost:6379

### Development Mode (With Hot-Reload)

For development with live code reloading:

```bash
# Start all services with hot-reload
docker compose -f docker-compose.dev.yml up

# Or in the background
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services
docker compose -f docker-compose.dev.yml down
```

## Service Breakdown

### 1. MongoDB (Database)
```
Container: hackathon-mongodb
Port: 27017
Volume: mongodb_data (persistent storage)
Image: mongo:7
```

**Features:**
- Automatic initialization of `hackathon-platform` database
- Persistent data storage
- Health checks enabled

**Connection Strings:**
- Docker: `mongodb://mongodb:27017/hackathon-platform`
- Local: `mongodb://localhost:27017/hackathon-platform`

### 2. Redis (Cache & Message Queue)
```
Container: hackathon-redis
Port: 6379
Volume: redis_data (persistent storage)
Image: redis:7-alpine
```

**Features:**
- AOF (Append Only File) persistence
- Health checks enabled
- Alpine Linux for small image size

**Connection Strings:**
- Docker: `redis://redis:6379`
- Local: `redis://localhost:6379`

### 3. Backend API (Express.js)
```
Container: hackathon-backend
Port: 3001
Image: Built from ./backend/Dockerfile
```

**Environment Variables:**
- `NODE_ENV`: production/development
- `MONGODB_URI`: Connection string to MongoDB
- `REDIS_URL`: Connection string to Redis
- `JWT_SECRET`: Secret for JWT signing
- `FRONTEND_URL`: CORS origin

**Features:**
- Multi-stage build for optimized size
- Health checks enabled
- Automatic restart on failure
- Graceful shutdown handling

### 4. Frontend (Next.js)
```
Container: hackathon-frontend
Port: 3000
Image: Built from ./frontend/Dockerfile
```

**Environment Variables:**
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_WS_URL`: WebSocket URL

**Features:**
- Multi-stage build
- Production-optimized build
- Health checks enabled
- Automatic restart on failure

### 5. Code Runner (Worker)
```
Container: hackathon-code-runner
Image: Built from ./code-runner/Dockerfile
```

**Environment Variables:**
- `REDIS_HOST`: Redis hostname
- `REDIS_PORT`: Redis port
- `CODE_RUNNER_TIMEOUT`: Code execution timeout (ms)
- `CODE_RUNNER_MEMORY_LIMIT`: Memory limit (MB)

**Features:**
- Docker-in-Docker capability
- Sandboxed code execution
- Job queue processing
- Health checks enabled

## Docker Compose Commands

### Build Images
```bash
# Build all images
docker compose build

# Build specific service
docker compose build backend
docker compose build frontend

# Rebuild without cache
docker compose build --no-cache
```

### Start Services
```bash
# Start all services (detached)
docker compose up -d

# Start specific services
docker compose up -d mongodb redis

# Start and view logs
docker compose up
```

### Stop Services
```bash
# Stop all services (keep data)
docker compose stop

# Stop and remove containers
docker compose down

# Remove everything including volumes
docker compose down -v
```

### View Logs
```bash
# View all logs
docker compose logs

# Follow logs in real-time
docker compose logs -f

# View specific service
docker compose logs -f backend

# View last 100 lines
docker compose logs --tail=100
```

### Execute Commands
```bash
# Run command in running container
docker compose exec backend npm run seed

# Run new container
docker compose run --rm backend npm run build

# Access MongoDB shell
docker compose exec mongodb mongosh
```

### Health Status
```bash
# View service status
docker compose ps

# Inspect specific service
docker compose inspect backend
```

## Development Workflows

### Debugging Backend
```bash
# View backend logs
docker compose -f docker-compose.dev.yml logs -f backend

# Access backend container
docker compose -f docker-compose.dev.yml exec backend sh

# Restart backend service
docker compose -f docker-compose.dev.yml restart backend
```

### Database Operations
```bash
# Access MongoDB shell
docker compose exec mongodb mongosh

# Import data
docker compose exec -T mongodb mongoimport --uri="mongodb://localhost:27017/hackathon-platform" --collection=questions --file=/data/questions.json

# Export data
docker compose exec mongodb mongoexport --uri="mongodb://localhost:27017/hackathon-platform" --collection=questions --out=/data/questions.json
```

### Redis Operations
```bash
# Access Redis CLI
docker compose exec redis redis-cli

# Monitor Redis commands
docker compose exec redis redis-cli MONITOR

# Clear all data
docker compose exec redis redis-cli FLUSHALL
```

## Production Deployment

### Environment Configuration
Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://mongodb:27017/hackathon-platform

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-very-secure-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com

# AWS S3 (if using file uploads)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket

# Security
CORS_ORIGIN=https://yourdomain.com
```

### Scaling Considerations

**For multiple backend instances:**
```bash
# Use docker-compose scaling
docker compose up -d --scale backend=3
```

**For load balancing:**
- Use Nginx or HAProxy in front of backend services
- Configure sticky sessions for Socket.IO connections
- Use Redis as shared session store

### Monitoring & Logging

**Docker Stats:**
```bash
docker stats
docker compose stats
```

**Centralized Logging:**
- Consider ELK Stack (Elasticsearch, Logstash, Kibana)
- Or CloudWatch, Datadog, etc.

**Health Checks:**
All services have built-in health checks:
```bash
docker compose ps  # Shows health status
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Change port in docker-compose.yml
# - "8000:3000"  # Use 8000 instead
```

### Container Won't Start
```bash
# Check logs
docker compose logs backend

# Check image exists
docker images | grep hackathon

# Remove and rebuild
docker compose down -v
docker compose build --no-cache
docker compose up
```

### Database Connection Issues
```bash
# Check MongoDB is running
docker compose ps mongodb

# Test connection
docker compose exec backend npm run test:db

# Restart MongoDB
docker compose restart mongodb
```

### Memory Issues
```bash
# Increase Docker memory in settings
# Docker Desktop → Preferences → Resources → Memory

# Or rebuild with memory limits
docker compose up --memory=2g
```

## Cleanup

### Remove Unused Resources
```bash
# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes
```

### Fresh Start
```bash
# Remove all containers, volumes, and networks
docker compose down -v

# Rebuild everything
docker compose build --no-cache

# Start fresh
docker compose up -d
```

## Performance Tips

1. **Use .dockerignore** - Already configured to exclude unnecessary files
2. **Multi-stage builds** - Optimizes image size
3. **Alpine images** - Smaller base images for Redis
4. **Volume optimization** - Don't mount node_modules in production
5. **Build caching** - Docker reuses layers for faster builds

## Security Best Practices

1. **Change default secrets** - Update JWT_SECRET in production
2. **Use secrets management** - Don't commit .env files
3. **Network isolation** - Services only accessible through ports
4. **Image scanning** - `docker scan` to check for vulnerabilities
5. **Read-only filesystems** - Consider adding to Dockerfile for hardening

## Useful Commands Reference

```bash
# Quick start
docker compose up -d

# Check status
docker compose ps

# View all logs
docker compose logs -f

# Stop everything
docker compose down

# Remove everything
docker compose down -v

# Seed database
docker compose exec backend npm run seed

# Access backend shell
docker compose exec backend sh

# Restart single service
docker compose restart frontend

# Build specific service
docker compose build backend
```

## Further Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

**Need Help?** Check logs with `docker compose logs -f [service-name]`
