# Admin & Judge Dashboard Guide

## Overview

This guide covers the new admin dashboard, judging interface, and comprehensive seed data system.

## Features Implemented

### 1. **Admin Dashboard** (`/admin`)

#### Key Features:
- **Real-time Statistics**: Live counts for teams, participants, judges, and submissions
- **System Overview**: Monitor active sessions, participants, and system health
- **Quick Actions**: One-click access to key admin functions
- **Teams Management**: View and manage all hackathon teams
- **Recent Activity Feed**: Track platform activity in real-time

#### Navigation:
- **User Management** (`/admin/users`): Manage users and assign roles
- **Analytics** (`/admin/analytics`): View detailed platform metrics
- **Sessions** (`/admin/sessions`): Control hackathon sessions
- **Leaderboard** (`/admin/leaderboard`): View competition standings

#### Stats Cards (All Clickable):
- Total Teams → Navigate to teams page
- Participants → Navigate to user management
- Judges → Navigate to user management
- Submitted Projects → Navigate to judge dashboard

---

### 2. **User Management** (`/admin/users`)

#### Features:
- **Role Statistics**: Visual breakdown of users by role
- **Search & Filter**: Find users by name, email, or role
- **Role Management**: 
  - Add roles to users
  - Remove roles from users
  - View all roles per user
- **User Status**: See active/inactive and verified/unverified users

#### Supported Roles:
- `admin` - Full platform access
- `judge` - Score hackathon projects
- `proctor` - Monitor assessments
- `grader` - Grade assessments
- `applicant` - Participate in hackathons/assessments

---

### 3. **Analytics Dashboard** (`/admin/analytics`)

#### Metrics Tracked:
- **System Health**:
  - Database status
  - API response time
  - Active connections

- **User Analytics**:
  - Total users by role
  - Active users today
  - New users this week
  - User distribution visualization

- **Assessment Performance**:
  - Total assessments
  - Average scores
  - Completion rates

- **Hackathon Stats**:
  - Active hackathons
  - Completed hackathons
  - Total participants

- **Team Performance**:
  - Team count
  - Submission rate
  - Average team size

#### Time Range Filters:
- Week view
- Month view
- Year view

---

### 4. **Judge Dashboard** (`/judge`)

#### Features:
- **Two-Mode Interface**:
  1. **Assessment Grading** (`/judge/grading`) - Grade student assessments
  2. **Hackathon Judging** - Score team projects

#### Hackathon Scoring:
- **Project Cards**: View all submitted projects with:
  - Team name and track
  - Project title and description
  - Links to repository, demo, and video
  - Submission status

- **Scoring Stats**:
  - Total submitted projects
  - Your completed scores
  - Remaining projects to score

#### Enhanced Rubric System:

**5 Criteria (0-10 points each):**

1. **Impact & Usefulness**
   - Addresses a real problem
   - Practical value to users
   - Potential for real-world impact

2. **Technical Depth**
   - Code quality and architecture
   - Complexity handled well
   - Best practices followed

3. **Execution Quality**
   - Polish and completeness
   - Bug-free experience
   - Professional finish

4. **User Experience**
   - Intuitive interface
   - Accessibility considerations
   - Pleasant to use

5. **Innovation**
   - Novel approach
   - Creative solution
   - Unique implementation

#### Scoring Interface:
- **Visual Sliders**: Smooth 0.5-point increments
- **Scoring Guidelines**: Inline help for each criterion
- **Real-time Total**: See total score as you adjust
- **Score Labels**: "Poor", "Fair", "Good", "Excellent" markers
- **Notes Field**: Add detailed feedback
- **Conflict of Interest**: Flag if you know the team

#### Score Display:
- Individual criterion scores
- Total score out of 50
- Previously submitted scores visible
- Update capability for your own scores

---

### 5. **Assessment Grading** (`/judge/grading`)

#### Features:
- **Statistics Dashboard**:
  - Total submitted
  - Pending review
  - Draft grades
  - Graded submissions
  - Released grades
  - Progress bar

- **Advanced Filtering**:
  - By status (pending, draft, submitted, released)
  - Search by student name, email, or assessment

- **Submission Cards**:
  - Assessment title
  - Student information
  - Submission time
  - Time spent on assessment
  - Status badges

- **Quick Actions**:
  - "Start Grading" for new submissions
  - "Continue Grading" for drafts
  - "View Grade" for completed

---

### 6. **Comprehensive Database Seed**

#### What's Included:

**Organization:**
- Justice Through Code
- Pre-configured settings

**Users (23 total):**
- 1 Admin (`admin@example.com`)
- 1 Proctor (`proctor@example.com`)
- 3 Judges (`judge1@example.com`, `judge2@example.com`, `judge3@example.com`)
- 1 Grader (`grader@example.com`)
- 20 Fellows (`student1@example.com` - `student20@example.com`)

**All passwords:** `password123`

**Questions (6 types):**
- 2 Multiple Choice (JavaScript, Python)
- 2 Coding Problems (String Reversal, Two Sum)
- 2 Essay Questions (System Design, Algorithm Explanation)

**Assessments (3):**
1. JavaScript Fundamentals Quiz (30 min)
2. Algorithm Challenge (60 min)
3. Technical Interview Prep (45 min)

**Teams (6):**
1. **Code Wizards** - AI-Powered Study Assistant (Education) ✅ Submitted
2. **Data Ninjas** - Community Health Tracker (Healthcare) ✅ Submitted
3. **Tech Titans** - Green Energy Monitor (Sustainability) ✅ Submitted
4. **Innovators** - Local Business Connect (Community) ✅ Submitted
5. **Future Builders** - Skills Marketplace (Education) ✅ Submitted
6. **Debug Squad** - Code Review Assistant (Developer Tools) 🔄 In Progress

**Hackathon Session:**
- Title: Justice Through Code Hackathon 2024
- Duration: 7 days
- Status: Active
- All teams registered
- 2 coding problems available

---

## How to Run the Seed

### Method 1: Docker (Recommended)

```bash
# Rebuild and restart with fresh data
docker-compose down -v
docker-compose up --build
```

### Method 2: Local Development

```bash
cd backend
npm run seed
```

This will:
1. Clear existing data
2. Create organization
3. Create all users with roles
4. Create questions
5. Create assessments
6. Create teams with projects
7. Create active hackathon session

---

## Usage Scenarios

### Scenario 1: Admin Managing Platform

1. Login as admin (`admin@example.com`)
2. View dashboard statistics
3. Navigate to User Management
4. Assign a new judge role to a user
5. Check Analytics for platform health
6. Monitor active sessions

### Scenario 2: Judge Scoring Projects

1. Login as judge (`judge1@example.com`)
2. See dashboard with 5 submitted projects
3. Click "Score Project" on a team
4. Review their:
   - Repository code
   - Live demo
   - Presentation video
5. Score using the 5-criterion rubric
6. Add detailed notes
7. Submit score
8. Repeat for remaining teams

### Scenario 3: Judge Grading Assessments

1. Login as judge or grader
2. Navigate to "Assessment Grading"
3. Filter by "Pending" status
4. Click "Start Grading" on a submission
5. Review student answers
6. Provide scores and feedback
7. Save as draft or submit grade
8. Release grades to students

---

## UI Components (Reusable)

### New Shared Components:

1. **StatsCard** (`/components/shared/StatsCard.tsx`)
   - Displays metrics with optional icons
   - Supports trends and colors
   - Can be clickable

2. **RubricScorer** (`/components/shared/RubricScorer.tsx`)
   - Multi-criterion scoring system
   - Expandable guidelines
   - Real-time total calculation
   - Read-only mode for viewing

3. **LoadingSpinner** (`/components/shared/LoadingSpinner.tsx`)
   - Multiple sizes
   - Full-screen mode
   - Custom colors and messages

4. **PageHeader** (`/components/shared/PageHeader.tsx`)
   - Consistent page headers
   - Back navigation
   - Action buttons

5. **Button** (`/components/shared/Button.tsx`)
   - Multiple variants (primary, secondary, success, danger, ghost)
   - Loading states
   - Icons support

6. **EmptyState** (`/components/shared/EmptyState.tsx`)
   - Consistent empty state design
   - Optional call-to-action

---

## API Endpoints Used

### Judge Scores:
- `GET /api/judge-scores/judge/:judgeId` - Get judge's scores
- `POST /api/judge-scores` - Submit new score

### Users:
- `GET /api/users` - Get all users
- `POST /api/users/:userId/roles` - Add role to user
- `DELETE /api/users/:userId/roles/:role` - Remove role

### Teams:
- `GET /api/teams` - Get all teams
- `DELETE /api/teams/:id` - Delete team

### Grading:
- `GET /api/grades/ungraded` - Get ungraded submissions
- `GET /api/grades/statistics` - Get grading stats

---

## Design System

### Colors:
- **Neon Blue** (`#00ffff`) - Primary actions, technology
- **Neon Purple** (`#a855f7`) - Scores, highlights
- **Neon Pink** (`#ff00ff`) - Special actions
- **Neon Green** (`#00ff00`) - Success, completion
- **Neon Yellow** (`#ffff00`) - Analytics, warnings
- **Orange** (`#ff6b35`) - Proctoring, monitoring
- **Red** (`#ff0000`) - Admin, critical

### Typography:
- Headings: Bold, gradient text
- Body: Light gray (400)
- Labels: Medium gray (400)

### Components:
- Glass morphism effect
- Rounded corners (xl, 2xl)
- Border animations on hover
- Scale transforms for interactivity

---

## Testing Checklist

### Admin Dashboard:
- ✅ Stats load correctly
- ✅ All navigation links work
- ✅ Teams list displays
- ✅ Activity feed shows events
- ✅ Quick actions accessible

### User Management:
- ✅ User search works
- ✅ Role filters work
- ✅ Add role modal opens
- ✅ Roles can be added
- ✅ Roles can be removed
- ✅ Statistics update

### Analytics:
- ✅ All metrics display
- ✅ Time range selector works
- ✅ Charts/progress bars render
- ✅ System health indicators

### Judge Dashboard:
- ✅ Projects load correctly
- ✅ Scoring modal opens
- ✅ Sliders work smoothly
- ✅ Notes can be added
- ✅ Scores can be submitted
- ✅ Previously scored projects show scores
- ✅ Update score works

### Judge Grading:
- ✅ Submissions load
- ✅ Statistics accurate
- ✅ Search/filter works
- ✅ Pagination works
- ✅ Grading interface accessible

---

## Future Enhancements

### Potential Additions:
1. **Export Functionality**: Download scores as CSV/PDF
2. **Judge Calibration**: Compare scores across judges
3. **Rubric Templates**: Customizable scoring criteria
4. **Batch Operations**: Assign multiple roles at once
5. **Real-time Notifications**: When new projects submitted
6. **Score Analytics**: Distribution, averages per criterion
7. **Comments System**: Judges can discuss submissions
8. **Audit Trail**: Track all admin actions

---

## Troubleshooting

### Issue: Seed data not loading
**Solution**: 
```bash
# Clear MongoDB volume
docker-compose down -v
docker-compose up --build
```

### Issue: Users can't be found
**Solution**: Check organization ID matches in database

### Issue: Scores not saving
**Solution**: Check judge authentication and API endpoint

### Issue: Stats showing zero
**Solution**: Ensure seed data ran successfully, check browser console

---

## Login Credentials Quick Reference

```
Admin:     admin@example.com     | password123
Proctor:   proctor@example.com   | password123
Judge 1:   judge1@example.com    | password123
Judge 2:   judge2@example.com    | password123
Judge 3:   judge3@example.com    | password123
Grader:    grader@example.com    | password123
Student:   student1@example.com  | password123
          (student1-20 available)
```

---

## Summary

The admin and judge interfaces now provide:

✅ **Comprehensive admin controls**
✅ **Professional judging system with rubrics**
✅ **Complete seed data for testing**
✅ **Reusable UI components**
✅ **Consistent design system**
✅ **Intuitive navigation**
✅ **Real-time statistics**
✅ **Role-based access control**

Everything is Docker-ready and fully functional! 🚀
