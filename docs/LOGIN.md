# Login & Test Accounts

## Demo Accounts

After starting the app with `docker-compose up`, use these credentials to test:

### Primary Demo Account
```
Email:    demo@example.com
Password: Demo@123456
Role:     Admin
```

### Alternative Test Accounts
```
Email:    student@demo.edu
Password: password123
Role:     Student (Applicant)

Email:    admin@demo.edu
Password: password123
Role:     Admin
```

## Where to Login

**Dashboard**: http://localhost:3000/dashboard

The app redirects to login if you're not authenticated.

## Creating Your Own Account

Go to: **http://localhost:3000/auth/register**

Requirements:
- Email address
- Strong password (uppercase, lowercase, numbers, symbols)
- First and last name

Example:
```
Email:     yourself@example.com
Password:  MyPassword@123
First:     John
Last:      Doe
```

## Forgot Password?

Currently there's no password reset. To reset:

```bash
# Stop containers and delete database
docker-compose down -v

# Start fresh with demo accounts recreated
docker-compose up
```

## Session Duration

Your login session lasts:
- **Access Token**: 15 minutes
- **Refresh Token**: 7 days
- **Browser Logout**: Until you close the browser or clear storage

## Rate Limiting

The auth endpoints have rate limiting:
- **15 login/registration attempts per 15 minutes**

If you get "Too many attempts", wait a few minutes and try again.

## Troubleshooting

### "Invalid email or password"
- Double-check the email spelling (case-insensitive)
- Verify you're using the correct password
- If using a custom account, make sure you registered first

### Redirected back to login after login
- Check browser console (F12) for errors
- Make sure backend is running: `docker-compose logs backend`
- Clear localStorage: F12 → Application → Clear Storage → Reload

### Can't access dashboard
- Make sure you're logged in first
- Try: `http://localhost:3000/auth/login` then click "Dashboard"

---

**[← Back to Index](./INDEX.md)**
