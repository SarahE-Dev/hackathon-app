# Add HackerRank-Style Live Coding Hackathon Platform with Full Proctoring

## 🎯 Overview

This PR implements a complete, enterprise-grade live coding hackathon platform with HackerRank-style proctoring features. The system supports real-time team coding challenges with comprehensive monitoring and role-based access control.

## 🚀 Major Features

### 1. Live Team Coding Hackathon System
- **Monaco-based code editor** with syntax highlighting for Python, JavaScript, Java, C++
- **Real-time code autosave** (2-second debounce)
- **Test execution engine** with instant feedback
- **Problem navigation** with tabbed interface
- **Multi-team competition** with live scoring
- **Session state management** (not-started, in-progress, submitted)

### 2. HackerRank-Style Proctoring
- **Fullscreen enforcement** with periodic checks
- **Tab switch detection** and logging
- **Copy/paste detection** and logging
- **Idle time monitoring** with configurable timeouts
- **Visual warning system** for violations
- **Real-time event logging** to backend
- **Violation counting** (tab switches, copy/paste, fullscreen exits, idle time)
- **Proctor controls** to pause/resume individual teams

### 3. Proctor Monitoring Dashboard
- **Real-time oversight** of all active team sessions
- **Live statistics**: active sessions, teams, total violations, paused teams
- **Per-team violation tracking** with detailed counts
- **Recent event timeline** with severity indicators (low, medium, high)
- **Proctor controls**: pause/resume teams with reason tracking
- **Auto-refresh** every 5 seconds
- **Problem progress tracking** for each team

### 4. Admin Session Management
- **Create hackathon sessions** with:
  - Title, description, duration
  - Team selection (multi-select)
  - Problem assignment (future: integrate with problem bank)
  - **Comprehensive proctoring configuration**:
    - Enable/disable proctoring
    - Fullscreen requirements
    - Tab switch detection
    - Copy/paste detection
    - Idle detection with timeout settings
- **Session lifecycle controls**:
  - Start (initializes all team sessions)
  - Pause (with reason)
  - Resume
  - Complete (auto-submits all teams)
  - Delete (scheduled sessions only)
- **Live leaderboard access**
- **Session editing and updates**

### 5. Live Leaderboard
- **Real-time rankings** with gold/silver/bronze medals for top 3
- **Visual progress bars** showing score percentages
- **Auto-refresh capability** (10-second intervals)
- **Admin reveal controls** for detailed stats
- **Team scoring** with problem completion tracking
- **Incident tracking** display

### 6. Role-Based Dashboards

#### Proctor Dashboard (`/proctor`)
- Real-time stats dashboard
- Active sessions list
- Quick actions to monitoring, sessions, teams
- Auto-refreshing data

#### Admin Dashboard Enhancements
- New Quick Action cards for Hackathon Sessions and Proctor Monitor
- Enhanced visual hierarchy with gradient styling
- Team and user management
- Statistics overview

#### Main Dashboard Updates
- Role-specific Quick Actions (Admin, Proctor, Judge)
- JTC Hackathon section split into:
  - Live Coding Sessions card
  - Teams & Projects card
- Clean, focused experience per role

### 7. Hackathon Sessions List
- Browse all available sessions
- Team membership detection
- Smart join controls (only if team is registered)
- Session status indicators
- Leaderboard access for all sessions

## 🗂️ File Changes

### Backend (New Files)
- `backend/src/models/HackathonSession.ts` - Session model with proctoring config
- `backend/src/models/TeamSession.ts` - Team participation tracking
- `backend/src/controllers/hackathonSessionController.ts` - Admin/Proctor operations
- `backend/src/controllers/teamSessionController.ts` - Team operations and proctoring
- `backend/src/routes/hackathonSessions.ts` - REST API routes
- `backend/src/models/index.ts` - Export new models
- `backend/src/index.ts` - Register hackathon routes

### Frontend (New Files)
- `frontend/src/app/proctor/page.tsx` - Proctor dashboard
- `frontend/src/app/proctor/monitor/page.tsx` - Real-time monitoring
- `frontend/src/app/admin/sessions/page.tsx` - Session management
- `frontend/src/app/leaderboard/[sessionId]/page.tsx` - Live leaderboard
- `frontend/src/app/hackathon/session/[sessionId]/page.tsx` - Team coding interface
- `frontend/src/app/hackathon/sessions/page.tsx` - Sessions list
- `ROLE_ACCESS_CONTROL.md` - Complete access control documentation

### Frontend (Modified Files)
- `frontend/src/lib/api.ts` - Added hackathonSessionsAPI with all endpoints
- `frontend/src/app/admin/page.tsx` - Enhanced Quick Actions
- `frontend/src/app/dashboard/page.tsx` - Role-specific cards and navigation
- `frontend/src/store/authStore.ts` - Added isProctor() role checker

## 🔒 Security & Access Control

### Multi-Layer Protection
1. **UI Layer**: Role-based conditional rendering
2. **RoleGuard Layer**: Client-side route protection
3. **Backend Middleware**: `requireRole()` on all sensitive routes

### Role-Based Access Matrix

| Feature | Student | Judge | Proctor | Admin |
|---------|---------|-------|---------|-------|
| Join/Code in Sessions | ✅ | ✅ | ✅ | ✅ |
| View Leaderboards | ✅ | ✅ | ✅ | ✅ |
| Judge Dashboard | ❌ | ✅ | ❌ | ✅ |
| Proctor Dashboard | ❌ | ❌ | ✅ | ✅ |
| Monitor Teams (Real-time) | ❌ | ❌ | ✅ | ✅ |
| Create/Manage Sessions | ❌ | ❌ | ✅ | ✅ |
| Manage Users/Teams | ❌ | ❌ | ❌ | ✅ |

**See `ROLE_ACCESS_CONTROL.md` for complete security documentation.**

### Students Can See:
- ✅ Main dashboard with hackathon section
- ✅ Hackathon sessions list (join if registered)
- ✅ Team coding interface with proctoring
- ✅ Leaderboards
- ✅ Teams page
- ✅ Their own assessments

### Students CANNOT See:
- ❌ Admin dashboard
- ❌ Proctor dashboard/monitoring
- ❌ Session management
- ❌ Judge interface
- ❌ User/team management

All admin/proctor features are **hidden in UI** and **blocked by RoleGuards** and **protected by backend middleware**.

## 📊 API Routes Summary

### Admin/Proctor Routes
```
POST   /api/hackathon-sessions                    Create session
PUT    /api/hackathon-sessions/:id                Update session
POST   /api/hackathon-sessions/:id/start          Start session
POST   /api/hackathon-sessions/:id/pause          Pause session
POST   /api/hackathon-sessions/:id/resume         Resume session
POST   /api/hackathon-sessions/:id/complete       Complete session
DELETE /api/hackathon-sessions/:id                Delete session
GET    /api/hackathon-sessions/monitor/active     Monitor active sessions
POST   /api/hackathon-sessions/:sessionId/team/:teamId/pause    Pause team
POST   /api/hackathon-sessions/:sessionId/team/:teamId/resume   Resume team
```

### Team Routes
```
GET    /api/hackathon-sessions                    View all sessions
GET    /api/hackathon-sessions/:id                View session details
GET    /api/hackathon-sessions/:id/leaderboard    View leaderboard
POST   /api/hackathon-sessions/team/join          Join session
GET    /api/hackathon-sessions/:sessionId/team/:teamId              Get team session
PUT    /api/hackathon-sessions/:sessionId/team/:teamId/problem      Update code
POST   /api/hackathon-sessions/:sessionId/team/:teamId/problem/submit  Submit solution
POST   /api/hackathon-sessions/:sessionId/team/:teamId/submit       Final submission
POST   /api/hackathon-sessions/:sessionId/team/:teamId/event        Log proctoring event
```

## 🧪 Testing

### Build Status
- ✅ Backend: Compiles successfully
- ✅ Frontend: Builds successfully (warnings about SSR for RoleGuards expected)

### Manual Testing Checklist
- [ ] Admin can create hackathon session with proctoring config
- [ ] Admin can start/pause/resume/complete sessions
- [ ] Proctor can view real-time monitoring dashboard
- [ ] Proctor can pause/resume individual teams
- [ ] Teams can join sessions and see coding interface
- [ ] Proctoring events are logged (tab switch, copy/paste, fullscreen, idle)
- [ ] Code autosaves every 2 seconds
- [ ] Test execution works with pass/fail results
- [ ] Leaderboard updates in real-time
- [ ] Students cannot access admin/proctor pages
- [ ] Backend API rejects unauthorized role access

## 🎨 UX/UI Highlights

- **Dark theme** for coding interface (reduces eye strain)
- **Monaco Editor** with professional syntax highlighting
- **Real-time feedback** on test execution
- **Visual warnings** for proctoring violations (animated, dismissible)
- **Progress bars** on leaderboard
- **Medal indicators** for top 3 teams (🥇🥈🥉)
- **Auto-refresh** on monitoring dashboards
- **Gradient cards** for featured actions
- **Clean, modern design** with consistent styling

## 🔄 Navigation Flow

```
ADMINS:
Dashboard → Admin Dashboard → Hackathon Sessions → Create/Manage
         → Admin Dashboard → Proctor Monitor → Real-time oversight

PROCTORS:
Dashboard → Proctor Dashboard → Monitor Teams → Pause/Resume controls

TEAMS:
Dashboard → Live Coding Sessions → Browse → Join Session → Code with Proctoring
         → Teams & Projects → View Teams → Project Showcase

JUDGES:
Dashboard → Judge Dashboard → Score Projects
```

## 📝 Commits in This PR

1. **Initial Setup**: Organize hackathon app with role-based access control
2. **Authentication Fix**: Fix demo login buttons and standardize passwords
3. **Assessment Enhancement**: Add HackerRank-style assessment support with MCQ and coding
4. **Core Implementation**: Add HackerRank-style live coding hackathon with full proctoring
5. **Navigation Enhancement**: Add comprehensive navigation and dashboards

## 🚀 Future Enhancements (Not in This PR)

- [ ] Problem bank integration for admins to select from existing problems
- [ ] WebRTC video proctoring with face detection
- [ ] Snapshot capture at intervals
- [ ] AI-powered plagiarism detection
- [ ] Real-time code collaboration within teams
- [ ] Chat system for team communication
- [ ] Submission replay/playback
- [ ] Advanced analytics dashboard
- [ ] Export proctoring reports

## 📖 Documentation

- Complete access control matrix in `ROLE_ACCESS_CONTROL.md`
- All models, controllers, and routes are fully TypeScript typed
- Inline comments for complex logic
- API endpoints documented in this PR description

## ⚠️ Breaking Changes

None. This is purely additive functionality.

## 🎉 Impact

This PR transforms the app into a **professional, enterprise-ready hackathon platform** comparable to HackerRank, LeetCode, and CodeSignal. It provides:
- Complete proctoring infrastructure
- Real-time monitoring for academic integrity
- Scalable architecture for multiple simultaneous hackathons
- Professional UX for all user roles
- Secure, role-based access control

---

**Ready for Review!** 🚀

Please review `ROLE_ACCESS_CONTROL.md` for complete security verification.
