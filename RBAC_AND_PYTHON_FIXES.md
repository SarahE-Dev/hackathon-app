# RBAC and Python-Only Coding Fixes

## Summary
This document outlines the fixes made to address RBAC routing issues, live coding session errors, and restrict coding assessments to Python only.

## Issues Fixed

### 1. ✅ Docker Automatic Seed Command
**Problem**: Docker wasn't automatically seeding the database on first startup, requiring manual intervention.

**Solution**: 
- Created `/workspace/backend/seed-on-start.sh` script that checks if database is empty
- If no users exist, automatically runs seed script
- Updated `backend/Dockerfile` to copy and execute this script on startup
- Script waits for MongoDB to be ready before checking/seeding

**Files Changed**:
- `backend/Dockerfile` - Added seed script copy and execution
- `backend/seed-on-start.sh` - New startup script with conditional seeding

### 2. ✅ RBAC Role-Based Routing
**Problem**: All users were redirected to `/dashboard` regardless of role. Admins, judges, and proctors should see their specific dashboards.

**Solution**:
Implemented role-based redirects in login and register flows:
- **Admin** → `/admin` (Admin control panel)
- **Proctor** → `/proctor` (Proctoring dashboard)
- **Judge** → `/judge` (Judge scoring interface)
- **Fellow/Student** → `/dashboard` (Student dashboard)

Priority order: admin > proctor > judge > applicant

**Files Changed**:
- `frontend/src/app/(auth)/login/page.tsx` - Added role-based redirect logic
- `frontend/src/app/auth/login/page.tsx` - Added role-based redirect logic
- `frontend/src/app/(auth)/register/page.tsx` - Added role-based redirect logic
- `frontend/src/app/auth/register/page.tsx` - Added role-based redirect logic

**Login Redirect Logic**:
```typescript
// Check roles in priority order
if (roles.some((r: any) => r.role === 'admin')) {
  router.push('/admin');
} else if (roles.some((r: any) => r.role === 'proctor')) {
  router.push('/proctor');
} else if (roles.some((r: any) => r.role === 'judge')) {
  router.push('/judge');
} else {
  router.push('/dashboard');
}
```

### 3. ✅ Live Coding Session - Python Only
**Problem**: Live coding sessions supported multiple languages (Python, JavaScript, Java, C++), causing potential issues and complexity.

**Solution**:
- Removed language dropdown selector
- Hardcoded to Python only
- Display reads "Language: Python" (non-editable)
- Language variable defaults to 'python'

**Files Changed**:
- `frontend/src/app/hackathon/session/[sessionId]/page.tsx`
  - Removed language dropdown
  - Changed to static display: "Language: Python"

### 4. ✅ Assessment Coding Questions - Python Only
**Problem**: Assessment coding questions supported 8+ languages, but only Python should be used initially.

**Solution**:
- Removed language selector dropdown
- Changed to static display: "Language: Python"
- Default language set to 'python'
- Code execution always uses Python regardless of previous language setting
- Updated `supportedLanguages` array to only include Python

**Files Changed**:
- `frontend/src/components/questions/CodingQuestion.tsx`
  - Changed language default from 'javascript' to 'python'
  - Removed language selector dropdown
  - Hardcoded Python in code execution API call
  - Updated `supportedLanguages` to `[{ id: 'python', name: 'Python' }]`

### 5. ✅ Question Builder - Python Only
**Problem**: Admin question creation form allowed selecting multiple languages.

**Solution**:
- Removed language dropdown in question builder
- Changed to static display: "Python (Only Python is supported)"
- Language variable still exists but defaults to 'python'

**Files Changed**:
- `frontend/src/app/admin/questions/new/page.tsx`
  - Removed language selector dropdown
  - Added static text display

## Role Definitions (for reference)

Based on RBAC system:

### Admin
- Full system access
- Can manage assessments, sessions, users, teams
- Access to analytics and system configuration
- Dashboard: `/admin`

### Proctor
- Monitor live assessment sessions
- View proctoring events and flags
- Can pause/resume sessions
- Dashboard: `/proctor`

### Judge
- Evaluate hackathon submissions
- Score team projects
- View submission details
- Dashboard: `/judge`

### Fellow/Student
- Take assessments
- Participate in hackathons
- View their results
- Dashboard: `/dashboard`

## Testing Recommendations

1. **Docker Seed Testing**:
   ```bash
   # Stop containers and remove volumes
   docker-compose down -v
   
   # Rebuild and start
   docker-compose up --build
   
   # Check logs to verify seed ran automatically
   docker logs hackathon-backend
   ```

2. **RBAC Testing**:
   - Login as admin: `admin@codearena.edu` / `password123`
   - Verify redirect to `/admin`
   - Login as proctor: `proctor@codearena.edu` / `password123`
   - Verify redirect to `/proctor`
   - Login as judge: `judge1@codearena.edu` / `password123`
   - Verify redirect to `/judge`
   - Login as student: `student1@codearena.edu` / `password123`
   - Verify redirect to `/dashboard`

3. **Python-Only Testing**:
   - Create a new coding question - verify only Python is shown
   - Start a live coding session - verify no language selector
   - Take an assessment with coding question - verify Python only
   - Run code - verify Python execution works

## Notes

- All coding features now exclusively use Python as requested
- Users can no longer select other languages in any coding interface
- The infrastructure still supports multiple languages in backend (for future expansion if needed)
- Frontend has been restricted to Python-only to simplify user experience and reduce support burden

## Migration Path (if multi-language needed later)

If multi-language support is needed in the future:
1. Update `supportedLanguages` arrays in respective components
2. Re-enable language selector dropdowns (code is still there, just replaced with static display)
3. Update question builder to allow language selection
4. Test each language's code execution thoroughly
5. Update documentation

## Credentials (from seed)

**Admin**:
- Email: `admin@codearena.edu`
- Password: `password123`

**Proctor**:
- Email: `proctor@codearena.edu`
- Password: `password123`

**Judges**:
- Email: `judge1@codearena.edu` (Sarah Johnson)
- Email: `judge2@codearena.edu` (Michael Chen)
- Email: `judge3@codearena.edu` (Emily Rodriguez)
- Password: `password123` (all judges)

**Students**:
- Multiple student accounts created
- Password: `password123` (all students)
