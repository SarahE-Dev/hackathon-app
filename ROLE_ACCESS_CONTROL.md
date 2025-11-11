# Role-Based Access Control Summary

## Overview
This document outlines what each role can see and access in the hackathon application.

---

## 🎓 STUDENTS/APPLICANTS (Applicant Role)

### What They CAN See:
- ✅ **Main Dashboard** (`/dashboard`)
  - JTC Hackathon 2025 section with:
    - Live Coding Sessions card → `/hackathon/sessions`
    - Teams & Projects card → `/hackathon/teams`
  - Assessments section (Available, In Progress, Completed)
  - Their own profile information

- ✅ **Hackathon Sessions List** (`/hackathon/sessions`)
  - Browse all available hackathon coding sessions
  - Join active sessions (if part of a team and registered)
  - View leaderboards for any session
  - See their team membership status

- ✅ **Team Coding Interface** (`/hackathon/session/[sessionId]`)
  - Monaco code editor with syntax highlighting
  - Problem descriptions and test cases
  - Run code and see test results
  - Submit solutions
  - **With Full Proctoring:**
    - Tab switch detection
    - Copy/paste detection
    - Fullscreen enforcement
    - Idle time monitoring
    - Visual warnings for violations

- ✅ **Teams Page** (`/hackathon/teams`)
  - View all teams and their members
  - See project submissions
  - View their own team details

- ✅ **Leaderboard** (`/leaderboard/[sessionId]`)
  - Live rankings during active sessions
  - Team scores and progress
  - Problem completion status

- ✅ **Assessments** (`/assessment/[attemptId]`)
  - Take MCQ and coding assessments
  - View their own attempts and grades

### What They CANNOT See:
- ❌ Admin Dashboard (`/admin`) - **BLOCKED by RoleGuard(['Admin'])**
- ❌ Proctor Dashboard (`/proctor`) - **BLOCKED by RoleGuard(['Admin', 'Proctor'])**
- ❌ Proctor Monitor (`/proctor/monitor`) - **BLOCKED by RoleGuard(['Admin', 'Proctor'])**
- ❌ Admin Sessions Management (`/admin/sessions`) - **BLOCKED by RoleGuard(['Admin', 'Proctor'])**
- ❌ Judge Dashboard (`/judge`) - **BLOCKED by RoleGuard(['Judge', 'Admin'])**
- ❌ Quick Actions section on dashboard (only visible to Admin/Proctor/Judge)

---

## 👨‍⚖️ JUDGES (Judge Role)

### What They CAN See:
- ✅ All Student Access (above)
- ✅ **Judge Dashboard** (`/judge`)
  - List of all teams and submitted projects
  - Score projects using 5-criteria rubric:
    - Technical Complexity
    - Creativity & Innovation
    - Execution & Presentation
    - Social Impact
    - Technical Challenges Overcome
  - View demo URLs, repo URLs, and video submissions
  - Leave feedback on projects

- ✅ **Quick Actions Card** on main dashboard
  - Direct link to Judge Dashboard

### What They CANNOT See:
- ❌ Admin Dashboard
- ❌ Proctor Dashboard
- ❌ Session Management Controls
- ❌ User/Team Management

---

## 👁️ PROCTORS (Proctor Role)

### What They CAN See:
- ✅ All Student Access (above)
- ✅ **Proctor Dashboard** (`/proctor`)
  - Real-time statistics:
    - Active sessions count
    - Active teams count
    - Total violations across all teams
    - Paused teams count
  - List of active sessions
  - Quick action links to monitoring, sessions, and teams
  - Auto-refreshing data (10 second intervals)

- ✅ **Proctor Monitor** (`/proctor/monitor`)
  - **Real-time monitoring of all active team sessions**
  - Per-team violation counts:
    - Tab switch count
    - Copy/paste count
    - Fullscreen exit count
    - Idle count
  - Recent proctoring events with severity levels
  - Problem progress for each team
  - **Proctor Controls:**
    - Pause individual team sessions (with reason)
    - Resume paused team sessions
    - View detailed team session history
  - Auto-refresh every 5 seconds

- ✅ **Hackathon Sessions Management** (`/admin/sessions`)
  - View all sessions
  - Start, pause, resume, complete sessions
  - View leaderboards
  - Access session details

- ✅ **Quick Actions Card** on main dashboard
  - Direct link to Proctor Dashboard

### What They CANNOT See:
- ❌ Admin Dashboard (full admin features)
- ❌ User role management
- ❌ Team creation/deletion (can view only)
- ❌ Judge Dashboard

---

## 🔧 ADMINS (Admin Role)

### What They CAN See:
- ✅ **EVERYTHING** - Admins have full access to all features

- ✅ **Admin Dashboard** (`/admin`)
  - Statistics: Total teams, participants, judges, submitted projects
  - Team management (view, create, delete)
  - User management (view all users, assign judge roles)
  - Quick Actions:
    - Hackathon Sessions (highlighted)
    - Proctor Monitor (highlighted)
    - View Leaderboard
    - Judge Interface
    - Browse Teams

- ✅ **Hackathon Sessions Management** (`/admin/sessions`)
  - **Create new hackathon sessions** with:
    - Title, description, duration
    - Team selection
    - Problem assignment
    - **Proctoring configuration:**
      - Enable/disable proctoring
      - Fullscreen requirements
      - Tab switch detection
      - Copy/paste detection
      - Idle detection with timeout
  - **Full session lifecycle control:**
    - Start sessions (initializes team sessions)
    - Pause sessions with reason
    - Resume sessions
    - Complete sessions (auto-submits all teams)
    - Delete scheduled sessions
  - Edit session details
  - View session statistics

- ✅ **Proctor Monitor** (`/proctor/monitor`)
  - Full access to all proctor monitoring features
  - Can pause/resume any team session
  - View all proctoring events in real-time

- ✅ **Quick Actions Section** on main dashboard with:
  - Admin Dashboard card
  - Hackathon Sessions card (highlighted with gradient)
  - Judge Dashboard card

### Admin-Only Backend Permissions:
- Create/delete teams
- Assign/remove user roles
- Create/delete hackathon sessions
- Access all user data
- Modify system settings

---

## 🔒 Backend API Protection

All sensitive routes are protected with `requireRole()` middleware:

### Admin/Proctor Only Routes:
```typescript
POST   /api/hackathon-sessions                    // Create session
PUT    /api/hackathon-sessions/:id                // Update session
POST   /api/hackathon-sessions/:id/start          // Start session
POST   /api/hackathon-sessions/:id/pause          // Pause session
POST   /api/hackathon-sessions/:id/resume         // Resume session
POST   /api/hackathon-sessions/:id/complete       // Complete session
DELETE /api/hackathon-sessions/:id                // Delete session
GET    /api/hackathon-sessions/monitor/active     // Get active sessions for monitoring
```

### Proctor Controls:
```typescript
POST   /api/hackathon-sessions/:sessionId/team/:teamId/pause    // Pause team
POST   /api/hackathon-sessions/:sessionId/team/:teamId/resume   // Resume team
```

### Team/Student Access Routes:
```typescript
GET    /api/hackathon-sessions                    // View all sessions (read-only)
GET    /api/hackathon-sessions/:id                // View session details
GET    /api/hackathon-sessions/:id/leaderboard    // View leaderboard
POST   /api/hackathon-sessions/team/join          // Join session (requires team membership)
GET    /api/hackathon-sessions/:sessionId/team/:teamId           // Get team session
PUT    /api/hackathon-sessions/:sessionId/team/:teamId/problem   // Update code (autosave)
POST   /api/hackathon-sessions/:sessionId/team/:teamId/problem/submit  // Submit solution
POST   /api/hackathon-sessions/:sessionId/team/:teamId/submit    // Final submission
POST   /api/hackathon-sessions/:sessionId/team/:teamId/event     // Log proctoring event
```

---

## 🛡️ Multi-Layer Protection

### Layer 1: Frontend UI
- Role-based conditional rendering
- Students don't see admin/proctor/judge links
- Clean, focused user experience per role

### Layer 2: React RoleGuard
- Client-side route protection with `<RoleGuard allowedRoles={[...]}>`
- Redirects or blocks unauthorized users
- Prevents UI rendering for unauthorized roles

### Layer 3: Backend Middleware
- `requireRole()` middleware on all sensitive API routes
- JWT token validation with role checking
- Returns 403 Forbidden for unauthorized access
- Server-side validation ensures security even if frontend is bypassed

---

## 📊 Summary Matrix

| Feature | Student | Judge | Proctor | Admin |
|---------|---------|-------|---------|-------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Hackathon Sessions List | ✅ | ✅ | ✅ | ✅ |
| Join/Code in Sessions | ✅ | ✅ | ✅ | ✅ |
| View Leaderboards | ✅ | ✅ | ✅ | ✅ |
| View Teams | ✅ | ✅ | ✅ | ✅ |
| Take Assessments | ✅ | ✅ | ✅ | ✅ |
| Judge Dashboard | ❌ | ✅ | ❌ | ✅ |
| Score Projects | ❌ | ✅ | ❌ | ✅ |
| Proctor Dashboard | ❌ | ❌ | ✅ | ✅ |
| Monitor Teams (Real-time) | ❌ | ❌ | ✅ | ✅ |
| Pause/Resume Teams | ❌ | ❌ | ✅ | ✅ |
| Admin Dashboard | ❌ | ❌ | ❌ | ✅ |
| Create Sessions | ❌ | ❌ | ✅ | ✅ |
| Manage Sessions | ❌ | ❌ | ✅ | ✅ |
| Manage Users/Teams | ❌ | ❌ | ❌ | ✅ |
| Assign Roles | ❌ | ❌ | ❌ | ✅ |

---

## ✅ Security Verification Checklist

- [x] All admin pages wrapped in `RoleGuard(['Admin'])`
- [x] All proctor pages wrapped in `RoleGuard(['Admin', 'Proctor'])`
- [x] All judge pages wrapped in `RoleGuard(['Judge', 'Admin'])`
- [x] Dashboard Quick Actions only shown to Admin/Proctor/Judge
- [x] All sensitive backend routes protected with `requireRole()`
- [x] Team join operations verify team membership
- [x] Proctoring event logging tied to authenticated user
- [x] Session operations validate user permissions
- [x] No direct database access from frontend
- [x] JWT tokens include role information
- [x] Middleware validates roles on every request

---

## 🎯 Conclusion

**Students (Applicants) are properly isolated** and can only access:
1. Their own dashboard with hackathon and assessment features
2. Hackathon sessions they can join (with team membership)
3. Live coding interface with proctoring
4. Leaderboards and team listings
5. Their own assessments and grades

They have **ZERO visibility** into administrative, proctoring, or judging features. All sensitive features are protected by **3 layers of security** (UI, RoleGuard, Backend Middleware).
