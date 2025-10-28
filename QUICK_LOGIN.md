# Quick Login Guide

## 🔐 Demo Account

Everything is set up to login immediately with a pre-configured demo account.

### Step 1: Start the App
```bash
docker-compose up
```

Wait for the "Ready" messages (about 30 seconds).

### Step 2: Open Dashboard
Go to: **http://localhost:3000/dashboard**

You'll be redirected to login.

### Step 3: Enter Credentials

| Field | Value |
|-------|-------|
| **Email** | `demo@example.com` |
| **Password** | `Demo@123456` |

### Step 4: Click Login

That's it! You're now on your dashboard.

---

## ✨ What You'll See

### Dashboard Page
- **Stats cards** showing Available/In Progress/Completed assessments
- **Tabs** to filter by status
- **Assessment cards** with:
  - Title and description
  - Point value and date
  - "Start", "Continue", or "View Results" button
  - Status badge (Available/In Progress/Completed)

### Available Assessment
- **JavaScript Fundamentals Quiz**
  - 4 questions covering JavaScript basics
  - 100 total points
  - Different question types to explore

---

## 🎯 Quick Test

1. Click **"Start"** on the JavaScript quiz
2. Answer the questions (you can change answers anytime)
3. See **Auto-Save** indicator (saves every 10 seconds)
4. Click **"Submit"** when done
5. View your results

---

## 🔑 Other Test Credentials

You can also create your own account at:
**http://localhost:3000/auth/register**

Example:
- Email: `yourself@example.com`
- Password: `YourPassword@123` (must be strong)
- First Name: `Your`
- Last Name: `Name`

---

## 🚫 Forgot Password?

Currently there's no password reset. To reset:

```bash
# Stop everything
docker-compose down

# Start fresh (resets database)
docker-compose down -v
docker-compose up
```

Then login with the demo credentials again.

---

## 🆘 Can't Login?

### "Invalid email or password"
- ✓ Check email: `demo@example.com` (no typo)
- ✓ Check password: `Demo@123456` (capital D)
- ✓ Wait 1-2 minutes (rate limiting may block repeated attempts)

### Redirects to login after login
- Check browser console (F12) for errors
- Make sure backend is running: `docker-compose logs backend`
- Try clearing localStorage: Open DevTools → Application → Clear Storage

### Backend won't start
```bash
docker-compose logs backend | tail -50
```

### Port already in use
```bash
# Kill existing processes
lsof -i :3000 -t | xargs kill -9
lsof -i :3001 -t | xargs kill -9
docker-compose up
```

---

## 💾 Sessions Last

Your login session lasts until you:
1. Close browser (logout happens)
2. Clear browser storage
3. Tokens expire (24 hours for access token)

After logout, login again with the same credentials.

---

## 🔒 Security Notes

- Passwords are hashed with bcrypt
- JWT tokens secure API calls
- CORS protects cross-site requests
- Rate limiting prevents brute force
- All passwords should be changed in production

---

## 📱 Mobile Testing

The app is fully responsive. Test on mobile:
1. Open http://localhost:3000 on your phone
2. Same login works
3. All features are mobile-friendly

---

## ⚡ Quick Commands

```bash
# View backend logs
docker-compose logs -f backend

# View frontend logs
docker-compose logs -f frontend

# Check all services
docker-compose ps

# Full restart
docker-compose restart

# Database CLI
docker exec hackathon-mongodb mongosh hackathon-platform
```

---

## 🎓 Next Steps

After logging in:
1. Take the JavaScript quiz to see all features
2. Review your dashboard stats
3. Create a new user to test multiple accounts
4. Check out the code in `/frontend` and `/backend`
5. Read [README.md](./README.md) for full documentation

---

**Ready? → http://localhost:3000/dashboard** 🚀
