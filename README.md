# CodeArena

**Justice Through Code Hackathon & Assessment Platform** - A production-ready platform with proctoring, live coding sessions, team collaboration, grading, and judging capabilities.

Built with **Next.js 14**, **Express.js**, **MongoDB**, and **Redis**. Fully containerized with Docker.

## Quick Links

- [Documentation](./docs/INDEX.md) - Complete documentation with guides
- [Quick Start (2 min)](./docs/QUICKSTART.md) - Get up and running fast
- [Login & Accounts](./docs/LOGIN.md) - Test credentials and account setup
- [Architecture](./docs/ARCHITECTURE.md) - System design and tech stack
- [Development Setup](./docs/SETUP.md) - Local development environment
- [Docker Guide](./docs/DOCKER.md) - Containerization and commands
- [API Reference](./docs/API.md) - REST API endpoints
- [Deployment](./docs/DEPLOYMENT.md) - Production deployment guide
- [Features & Roadmap](./docs/FEATURES.md) - Feature list and status
- [FAQ](./docs/FAQ.md) - Troubleshooting and common questions

## What's Included

### Core Platform
- User authentication (JWT with refresh tokens)
- 5 user roles: Admin, Proctor, Judge, Grader, Fellow
- Multi-organization support with cohorts
- Role-based access control (RBAC)
- Dashboard with progress tracking

### Assessment System
- 6 question types (MCQ single/multi, short/long answer, coding, file upload)
- Assessment builder with sections and time limits
- Draft → Review → Published workflow with versioning
- Auto-save functionality (every 10 seconds)
- Offline support with sync when reconnected

### Hackathon Mode
- Team management and registration
- Live coding sessions with real-time collaboration
- Project submissions (repo, demo, video links)
- Judge scoring with configurable rubrics
- Live leaderboard with tie-break rules
- Proctoring during hackathon sessions

### Proctoring & Integrity
- Real-time monitoring dashboard
- Tab switch & blur detection
- Copy/paste/print detection
- Fullscreen enforcement
- Idle time monitoring
- Device fingerprinting & IP logging
- Incident flagging and resolution
- Plagiarism detection (code similarity, timing anomalies, AI detection)

### Grading System
- Manual grading interface with rubrics
- Advanced auto-grading for coding questions
- Inline comments and feedback
- Grade release workflow
- Multi-dimensional scoring (correctness, quality, efficiency, style)

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand
- **Backend**: Express.js, TypeScript, Mongoose, Socket.io
- **Database**: MongoDB 7.0
- **Cache/Queue**: Redis 7, BullMQ
- **Infrastructure**: Docker Compose, multi-stage builds

## Getting Started

### 1. Start Docker
```bash
docker-compose up
```

Wait ~30 seconds for services to be ready.

### 2. Open App
Visit: **http://localhost:3000/dashboard**

### 3. Login
```
Admin:    admin@codearena.edu / password123
Proctor:  proctor@codearena.edu / password123
Judge:    judge@codearena.edu / password123
Fellow:   student@codearena.edu / password123
```

### 4. Explore
- Take an assessment from the dashboard
- View hackathon teams and sessions
- (Admin) Manage users, sessions, and assessments

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

## User Roles

| Role | Description |
|------|-------------|
| **Admin** | Full platform control - manage users, assessments, sessions, settings |
| **Proctor** | Monitor live sessions, pause/resume, handle incidents |
| **Judge** | Score hackathon projects via rubrics, view submissions |
| **Grader** | Grade assessment submissions (reserved for TAs) |
| **Fellow** | Take assessments, join hackathon teams, view results |

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

## Feature Status

| Feature | Status |
|---------|--------|
| Assessment platform | Implemented |
| 6 question types | Implemented |
| Results & grading | Implemented |
| Proctoring system | Implemented |
| Hackathon mode | Implemented |
| Team management | Implemented |
| Judge scoring | Implemented |
| Admin dashboard | Implemented |
| Plagiarism detection | Implemented |
| Offline support | Implemented |
| Multi-language code execution | Planned |
| SSO integration | Planned |
| Advanced analytics | Planned |

Full details in [Features](./docs/FEATURES.md).

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
