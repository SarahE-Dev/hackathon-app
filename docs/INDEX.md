# CodeArena Documentation

## Quick Navigation

### For First-Time Users
Start here if you're new to the project:
1. **[QUICKSTART.md](./QUICKSTART.md)** - Get the app running in 2 minutes
2. **[LOGIN.md](./LOGIN.md)** - Demo credentials and testing accounts

### For Developers
Building features or understanding the codebase:
1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, tech stack, and data flow
2. **[SETUP.md](./SETUP.md)** - Development environment setup
3. **[API.md](./API.md)** - REST API endpoints and usage

### For Deployment
Deploying to production:
1. **[DOCKER.md](./DOCKER.md)** - Docker setup and containerization
2. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide

### Integrations
Third-party service integrations:
- **[CODEWARS_INTEGRATION.md](./CODEWARS_INTEGRATION.md)** - Import problems from Codewars (1000+ real challenges)

### Reference
Additional reference materials:
- **[FAQ.md](./FAQ.md)** - Common questions and troubleshooting
- **[FEATURES.md](./FEATURES.md)** - Complete feature list and status
- **[../ROLE_ACCESS_CONTROL.md](../ROLE_ACCESS_CONTROL.md)** - Role permissions and access
- **[../REQUIREMENTS_STATUS.md](../REQUIREMENTS_STATUS.md)** - Requirements checklist

---

## Project Overview

**CodeArena** is the Justice Through Code Hackathon & Assessment Platform, built with:
- **Frontend**: Next.js 14 with Tailwind CSS (neon cyberpunk theme)
- **Backend**: Express.js with TypeScript
- **Database**: MongoDB
- **Cache/Queue**: Redis, BullMQ
- **Deployment**: Docker Compose

## Key Features

### Implemented
- User authentication with JWT (5 roles: Admin, Proctor, Judge, Grader, Fellow)
- Assessment creation with 6 question types
- Hackathon mode with team management and live coding sessions
- Judge scoring with configurable rubrics
- Proctoring dashboard with real-time monitoring
- Plagiarism detection and integrity checks
- Auto-grading for coding questions
- Offline support with sync
- Full Docker containerization

### Planned
- Multi-language code execution (Java, C++, Go)
- SSO integration (Google/Microsoft)
- Advanced analytics and reporting
- Screen/webcam recording

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@codearena.edu | password123 |
| Proctor | proctor@codearena.edu | password123 |
| Judge | judge@codearena.edu | password123 |
| Fellow | student@codearena.edu | password123 |

---

**New to the project?** → Start with [QUICKSTART.md](./QUICKSTART.md)

**Want to understand the architecture?** → Read [ARCHITECTURE.md](./ARCHITECTURE.md)

**Running into issues?** → Check [FAQ.md](./FAQ.md)
