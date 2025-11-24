# Login & Test Accounts

## Demo Accounts

After starting the app with `docker-compose up`, use these credentials to test:

### Primary Test Accounts

All accounts use password: `password123`

| Role | Email | Description |
|------|-------|-------------|
| **Admin** | admin@codearena.edu | Full platform access |
| **Proctor** | proctor@codearena.edu | Monitor sessions, handle incidents |
| **Judge** | judge@codearena.edu | Score hackathon projects |
| **Fellow** | student@codearena.edu | Take assessments, join teams |

### Legacy Demo Accounts (also available)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.edu | password123 |
| Student | student@demo.edu | password123 |

### Organization

All demo accounts belong to:
- **Organization**: Demo University
- **Slug**: jtc-demo

## Where to Login

**Dashboard**: http://localhost:3000/dashboard

The app redirects to login if you're not authenticated.

## Role Capabilities

### Admin (admin@codearena.edu)
- Access admin dashboard (`/admin`)
- Manage users, teams, assessments
- Create/manage hackathon sessions
- View all proctoring data
- Assign roles to users

### Proctor (proctor@codearena.edu)
- Access proctor dashboard (`/proctor`)
- Real-time session monitoring (`/proctor/monitor`)
- Pause/resume team sessions
- View proctoring incidents
- Start/pause/complete hackathon sessions

### Judge (judge@codearena.edu)
- Access judge dashboard (`/judge`)
- Score team projects with rubrics
- View project submissions
- See team code and explanations

### Fellow (student@codearena.edu)
- View dashboard with available assessments
- Take timed assessments
- Join hackathon teams
- Participate in live coding sessions
- View own results when released

## Creating Your Own Account

Go to: **http://localhost:3000/auth/register**

Requirements:
- Email address
- Password (8+ characters with uppercase, lowercase, numbers)
- First and last name

New accounts are created with the Fellow role by default.

## Forgot Password?

Currently there's no password reset. To reset:

```bash
# Stop containers and delete database
docker-compose down -v

# Start fresh with demo accounts recreated
docker-compose up
```

## Session Duration

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days
- Tokens auto-refresh when expired

## Rate Limiting

Auth endpoints have rate limiting:
- **15 login/registration attempts per 15 minutes**

If you get "Too many attempts", wait a few minutes and try again.

## Troubleshooting

### "Invalid email or password"
- Double-check the email spelling (case-insensitive)
- Verify you're using `password123` for demo accounts
- If using a custom account, make sure you registered first

### Redirected back to login after login
- Check browser console (F12) for errors
- Make sure backend is running: `docker-compose logs backend`
- Clear localStorage: F12 → Application → Clear Storage → Reload

### Can't access a feature
- Check your role - some features are role-restricted
- Admin has full access, other roles have limited access
- See [ROLE_ACCESS_CONTROL.md](../ROLE_ACCESS_CONTROL.md) for details

---

**[← Back to Index](./INDEX.md)**
