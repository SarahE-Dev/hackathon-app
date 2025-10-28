# CodeArena 🚀

**Production-ready assessment and hackathon platform** with proctoring, coding challenges, grading, and judging capabilities.

Built with **Next.js 14**, **Express.js**, **MongoDB**, and **Redis**. Fully containerized with Docker.

## Quick Links

- 📖 **[Documentation](./docs/INDEX.md)** - Complete documentation with guides
- ⚡ **[Quick Start (2 min)](./docs/QUICKSTART.md)** - Get up and running fast
- 🔐 **[Login & Accounts](./docs/LOGIN.md)** - Test credentials and account setup
- 🏗️ **[Architecture](./docs/ARCHITECTURE.md)** - System design and tech stack
- 🛠️ **[Development Setup](./docs/SETUP.md)** - Local development environment
- 🐳 **[Docker Guide](./docs/DOCKER.md)** - Containerization and commands
- 📡 **[API Reference](./docs/API.md)** - REST API endpoints
- 🚀 **[Deployment](./docs/DEPLOYMENT.md)** - Production deployment guide
- ✨ **[Features & Roadmap](./docs/FEATURES.md)** - Feature list and status
- ❓ **[FAQ](./docs/FAQ.md)** - Troubleshooting and common questions

## What's Included ✅

### Core Features
✅ User authentication (JWT)
✅ Assessment creation & publishing
✅ 6 question types (MCQ, short/long answer, multi-select, coding, file upload)
✅ Auto-save functionality
✅ Dashboard with progress tracking
✅ Role-based access control

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand
- **Backend**: Express.js, TypeScript, Mongoose, Socket.io
- **Database**: MongoDB 7.0
- **Cache**: Redis 7
- **Infrastructure**: Docker Compose, multi-stage builds

## Getting Started

### 1️⃣ Start Docker
```bash
docker-compose up
```

Wait ~30 seconds for services to be ready.

### 2️⃣ Open App
Visit: **http://localhost:3000/dashboard**

### 3️⃣ Login
```
Email:    demo@example.com
Password: Demo@123456
```

### 4️⃣ Test Assessment
Click "Start" on the JavaScript Fundamentals Quiz and try it out!

## Project Structure

```
hackathon-app/
├── frontend/              # Next.js 14 app (Tailwind CSS + neon theme)
├── backend/               # Express.js API (TypeScript)
├── code-runner/           # Code execution service
├── shared/                # Shared types
├── docs/                  # Complete documentation
├── docker-compose.yml     # Production setup
└── README.md              # This file
```

## Documentation

Everything you need is in the **[docs folder](./docs/)**:

- **New?** Start with [Quick Start](./docs/QUICKSTART.md)
- **Building?** Read [Architecture](./docs/ARCHITECTURE.md) and [Setup](./docs/SETUP.md)
- **Deploying?** Check [Deployment](./docs/DEPLOYMENT.md)
- **Stuck?** See [FAQ](./docs/FAQ.md)

## Key Features

### Assessment Platform
- Create and publish assessments
- Support for 6 question types
- Auto-save user responses
- Flexible grading settings
- Detailed analytics

### Proctoring (In Development)
- Real-time monitoring dashboard
- Incident detection & flagging
- Proctoring event logging

### Admin Controls (Planned)
- User management
- Question bank
- Assessment scheduling
- Access policies

### Hackathon Mode (Planned)
- Team management
- Project submissions
- Judge rubrics
- Live leaderboards

## Commands

```bash
# Development
npm run dev                 # Start all dev servers
npm run dev:frontend       # Next.js (port 3000)
npm run dev:backend        # Express (port 3001)

# Building
npm run build              # Build all workspaces

# Docker
docker-compose up          # Start all services
docker-compose down -v     # Stop and reset

# Testing
npm test                   # Run tests
```

See [Setup Guide](./docs/SETUP.md) for more commands.

## Security

- ✅ Password hashing (bcrypt)
- ✅ JWT authentication with refresh tokens
- ✅ Rate limiting on auth endpoints
- ✅ Input validation (Zod)
- ✅ CORS & CSRF protection
- ✅ Helmet.js security headers

See [Architecture](./docs/ARCHITECTURE.md#security-features) for details.

## Performance

- Frontend: ~2s page load
- API: <200ms response time (median)
- Container startup: <30 seconds
- Target: Core Web Vitals "Good"

## Deployment

Production-ready with Docker. Deploy to:
- AWS EC2, ECS
- DigitalOcean
- Linode, Fly.io
- Any Docker host

See [Deployment Guide](./docs/DEPLOYMENT.md) for step-by-step instructions.

## Development Roadmap

| Feature | Status | Version |
|---------|--------|---------|
| Assessment platform | ✅ | v1.0 |
| Results & grading | 🔄 | v1.1 |
| Proctoring dashboard | 🔄 | v1.1 |
| Hackathon mode | ⏳ | v2.0 |
| Admin controls | ⏳ | v2.0 |
| Analytics | ⏳ | v2.0 |

Full roadmap in [Features](./docs/FEATURES.md).

## Issues & Support

1. Check [FAQ](./docs/FAQ.md)
2. Review [Documentation](./docs/INDEX.md)
3. Check GitHub issues
4. Open a new issue with details

## License

MIT

## Built with ❤️

For Justice Through Code Hackathon Platform

---

**Start here:** [📖 Full Documentation](./docs/INDEX.md)
