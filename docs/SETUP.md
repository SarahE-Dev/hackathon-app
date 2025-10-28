# Development Setup

> Run the app locally without Docker for faster development with hot-reload.

## Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB 5.0+ (local or Atlas)
- Redis 6.0+ (local or cloud)
- Git

## Option 1: Local Development (Recommended)

### 1. Install Dependencies

```bash
npm install
```

This installs dependencies for all workspaces (frontend, backend, shared).

### 2. Start Services in Docker

```bash
# Start only MongoDB and Redis (not the app servers)
docker-compose up -d mongodb redis
```

This keeps database services containerized while you run the app locally.

### 3. Start Development Servers

Open 3 terminal tabs:

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```
API runs on: `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```
App runs on: `http://localhost:3000`

**Terminal 3 - Code Runner (Optional):**
```bash
npm run dev:runner
```
Only needed if testing code execution features.

### 4. Login

Go to: `http://localhost:3000/auth/login`

Use demo credentials from [LOGIN.md](./LOGIN.md)

## Option 2: Docker (Production-like)

For testing production-like setup:

```bash
docker-compose up
```

All services run containerized with hot-reload (dev mode).

## Available Scripts

```bash
# Development
npm run dev              # Start all dev servers
npm run dev:frontend    # Next.js dev server (port 3000)
npm run dev:backend     # Express dev server (port 3001)
npm run dev:runner      # Code execution service

# Building
npm run build           # Build all workspaces
npm run build:frontend  # Build Next.js (production)
npm run build:backend   # Compile TypeScript

# Linting
npm run lint           # Lint all workspaces
npm run lint:fix       # Fix linting issues

# Testing
npm run test           # Run all tests
npm test --workspace=backend

# Docker
docker-compose up      # Start all services
docker-compose down    # Stop all services
docker-compose logs -f # View logs
```

## Environment Variables

### Backend (.env in /backend)

```env
NODE_ENV=development
BACKEND_PORT=3001
MONGODB_URI=mongodb://localhost:27017/hackathon-platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local in /frontend)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Troubleshooting Development

### Port Already in Use
```bash
# Kill process on port 3000
lsof -i :3000 -t | xargs kill -9

# Kill process on port 3001
lsof -i :3001 -t | xargs kill -9
```

### MongoDB Connection Error
```bash
# Make sure MongoDB is running
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Redis Connection Error
```bash
# Check Redis is running
docker-compose ps

# View Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### TypeScript Errors
```bash
# Clear build cache and rebuild
rm -rf backend/dist
npm run build:backend
```

### Node Modules Issues
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

## Hot-Reload

Both frontend and backend support hot-reload:
- **Frontend**: Changes to components auto-refresh (Next.js Fast Refresh)
- **Backend**: Changes to TypeScript files auto-reload (tsx watch)

Save a file and see changes immediately without restarting!

## Database Reset

To reset the database during development:

```bash
# Delete all data but keep containers running
docker-compose down -v

# Restart with fresh database
docker-compose up mongodb redis
```

Demo accounts are recreated automatically on first run.

## Debugging

### Backend Debugging
The backend runs with `tsx watch` which supports debugging:
```bash
# Add a debugger statement in code
debugger;

# Then inspect with Chrome DevTools
# chrome://inspect
```

### Frontend Debugging
Next.js dev server includes React DevTools browser extension support.

### Viewing Logs
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

## IDE Setup

### VS Code

Install extensions:
- **ESLint** - Error checking
- **Prettier** - Code formatting
- **Thunder Client** - API testing
- **MongoDB for VS Code** - Database management

Create `.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Next Steps

- 📖 Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase
- 🧪 Write tests as you develop
- 📝 Check [API.md](./API.md) for API documentation
- 🐛 Use [FAQ.md](./FAQ.md) if you encounter issues

---

**[← Back to Index](./INDEX.md)**
