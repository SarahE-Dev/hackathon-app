# Docker Setup & Containerization

## Quick Start

```bash
# Start all services
docker-compose up

# With rebuild
docker-compose up --build

# In background
docker-compose up -d
```

Services available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## Docker Architecture

### Multi-Stage Builds

Both frontend and backend use multi-stage Docker builds for production:

1. **Builder Stage**: Compile/build the application
2. **Runtime Stage**: Lightweight image with only production files

This keeps production images small and secure.

### Services in docker-compose.yml

```yaml
services:
  frontend:
    image: hackathon-app-frontend
    ports: [3000:3000]
    depends_on: [backend]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001

  backend:
    image: hackathon-app-backend
    ports: [3001:3001]
    depends_on: [mongodb, redis]
    environment:
      MONGODB_URI: mongodb://mongodb:27017/hackathon-platform
      REDIS_URL: redis://redis:6379

  mongodb:
    image: mongo:7
    ports: [27017:27017]
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: mongosh ping
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: [6379:6379]
    volumes:
      - redis_data:/data
    healthcheck:
      test: redis-cli ping
      interval: 10s
      timeout: 5s
      retries: 5
```

## Common Docker Commands

### Start/Stop Services

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (delete data)
docker-compose down -v

# Restart specific service
docker-compose restart backend
```

### View Logs

```bash
# All logs (streaming)
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail=100 backend

# No stream (just print)
docker-compose logs backend
```

### Container Management

```bash
# Check container status
docker-compose ps

# View detailed information
docker-compose logs

# Execute command in container
docker-compose exec backend bash
docker-compose exec mongodb mongosh hackathon-platform

# View container stats
docker stats

# Remove everything (careful!)
docker-compose down -v --remove-orphans
```

### Database Access

```bash
# MongoDB shell
docker-compose exec mongodb mongosh hackathon-platform

# View MongoDB logs
docker-compose logs -f mongodb

# Reset MongoDB (delete all data)
docker-compose down -v
docker-compose up mongodb
```

### Redis Access

```bash
# Redis CLI
docker-compose exec redis redis-cli

# View Redis logs
docker-compose logs -f redis

# Check Redis keys
docker-compose exec redis redis-cli KEYS "*"

# Clear all Redis data
docker-compose exec redis redis-cli FLUSHALL
```

## Building Images

### Build All Images

```bash
# Build with default settings
docker-compose build

# Build with no cache (fresh build)
docker-compose build --no-cache

# Build specific service
docker-compose build frontend
docker-compose build backend
```

### Image Sizes

Multi-stage builds keep images small:
- **Frontend**: ~200MB (Next.js production build)
- **Backend**: ~400MB (Node.js + dependencies)
- **MongoDB**: ~700MB
- **Redis**: ~50MB

## Environment Variables

### Backend (.env in /backend)

```env
NODE_ENV=production
BACKEND_PORT=3001
MONGODB_URI=mongodb://mongodb:27017/hackathon-platform
REDIS_URL=redis://redis:6379
JWT_SECRET=change-in-production
JWT_REFRESH_SECRET=change-in-production
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local in /frontend)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production values.

## Volumes

Data persistence:

```yaml
volumes:
  mongodb_data:           # MongoDB data
  redis_data:             # Redis data
```

These are docker-named volumes. To inspect:

```bash
# List all volumes
docker volume ls

# View volume details
docker volume inspect hackathon-app_mongodb_data

# Remove unused volumes
docker volume prune
```

## Health Checks

All services have health checks that auto-restart failed containers:

```yaml
healthcheck:
  test: ["CMD", "mongosh", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

View health status:

```bash
docker-compose ps

# STATUS column shows: "Up 2 minutes (healthy)" or "(unhealthy)"
```

## Network

All services communicate via Docker network: `hackathon-app_default`

- **Internal**: Services connect via container names (e.g., `mongodb:27017`)
- **External**: Services accessible via `localhost:PORT`

## Troubleshooting

### Port Already in Use

```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or kill all Docker containers
docker-compose down
```

### Service Won't Start

```bash
# Check logs
docker-compose logs backend

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Database Connection Error

```bash
# Make sure MongoDB is healthy
docker-compose ps

# Wait for MongoDB to be ready
docker-compose logs mongodb

# If stuck, reset
docker-compose down -v
docker-compose up mongodb
```

### OutOfMemory Error

```bash
# Check Docker memory usage
docker stats

# Increase Docker memory allocation in Docker Desktop settings
# Or clean up unused images/containers
docker system prune -a
```

### Can't Connect from Host

Make sure ports are mapped correctly:
```yaml
services:
  backend:
    ports: ["3001:3001"]  # host:container
```

Then access as: `http://localhost:3001`

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Environment configuration
- Secret management
- Scaling strategies
- Monitoring setup

## Development Mode

For local development with hot-reload:

```bash
# Uses docker-compose.dev.yml
docker-compose -f docker-compose.dev.yml up
```

This mounts code volumes for hot-reload:
```yaml
volumes:
  - ./frontend/src:/app/src      # Hot-reload frontend
  - ./backend/src:/app/src       # Hot-reload backend
```

---

**[← Back to Index](./INDEX.md)**
