# FAQ - Frequently Asked Questions

## Getting Started

### Q: How do I get the app running?
**A:** Follow [QUICKSTART.md](./QUICKSTART.md) - it takes 2 minutes with Docker.

### Q: Do I need Docker installed?
**A:** Yes, Docker & Docker Compose are required for the easiest setup. Alternatively, see [SETUP.md](./SETUP.md) for local development without Docker.

### Q: What are the login credentials?
**A:** Check [LOGIN.md](./LOGIN.md) for demo accounts and how to create your own.

### Q: Where's the documentation?
**A:** You're reading it! Start at [INDEX.md](./INDEX.md) for navigation.

## Technical Questions

### Q: What's the tech stack?
**A:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete tech stack overview.

### Q: How do I set up development environment?
**A:** See [SETUP.md](./SETUP.md) - local development with hot-reload is easy.

### Q: What API endpoints are available?
**A:** Full API documentation in [API.md](./API.md).

### Q: How is authentication handled?
**A:** JWT tokens with refresh tokens. See [ARCHITECTURE.md](./ARCHITECTURE.md#authentication-flow) for details.

### Q: How does auto-save work?
**A:** Answers are auto-saved to Redis/MongoDB every 10 seconds. See [ARCHITECTURE.md](./ARCHITECTURE.md#assessment-taking-flow).

## Troubleshooting

### Q: "Port already in use" error
**A:** Kill the process using the port:
```bash
lsof -i :3000 -t | xargs kill -9
lsof -i :3001 -t | xargs kill -9
```
Then restart: `docker-compose up`

### Q: "Can't connect to MongoDB"
**A:** Make sure MongoDB is running:
```bash
docker-compose ps  # Check status
docker-compose logs mongodb  # View logs
docker-compose restart mongodb  # Restart
```

### Q: "Invalid email or password" even though I used correct credentials
**A:**
- Check email spelling (case-insensitive)
- Make sure password is correct (case-sensitive)
- If you created custom account, verify you registered first
- Check rate limiting - wait 5 minutes if you tried too many times

### Q: "Redirected back to login after login"
**A:**
1. Open browser console (F12)
2. Check for errors
3. Check backend is running: `docker-compose logs backend`
4. Clear localStorage: F12 → Application → Clear Storage → Reload

### Q: Frontend won't load
**A:**
- Make sure frontend container is running: `docker-compose ps`
- Check logs: `docker-compose logs frontend`
- Try hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache

### Q: Backend returning 500 errors
**A:**
- Check backend logs: `docker-compose logs backend`
- Verify database connection: `docker-compose logs mongodb`
- Verify Redis connection: `docker-compose logs redis`
- Restart backend: `docker-compose restart backend`

### Q: Database is locked/corrupted
**A:** Reset everything:
```bash
docker-compose down -v  # Delete all data
docker-compose up       # Fresh start
```

## Feature Questions

### Q: How many question types are supported?
**A:** 6 types: MCQ (single), Multi-select, Short answer, Long answer, Coding, File upload.

### Q: Can I export assessments?
**A:** Not yet - coming in v1.1.0. Currently you can create assessments manually or via API.

### Q: Can multiple students take the same assessment?
**A:** Yes! Each student gets their own attempt with independent answers and grades.

### Q: How long are login sessions?
**A:** Access token: 15 minutes. Refresh token: 7 days. Closing browser logs you out.

### Q: Can I create teams for hackathons?
**A:** Hackathon mode with team support is planned for v2.0.0.

### Q: Is there offline support?
**A:** Not yet - planned for future release.

## Security Questions

### Q: Is my password secure?
**A:** Yes! Passwords are hashed with bcrypt and never stored in plaintext. See [ARCHITECTURE.md](./ARCHITECTURE.md#security-features).

### Q: Is the connection encrypted?
**A:** Yes with HTTPS (in production). See [DEPLOYMENT.md](./DEPLOYMENT.md) for SSL setup.

### Q: Can I export student data?
**A:** Not yet - coming in v1.1.0. See [FEATURES.md](./FEATURES.md) for roadmap.

### Q: How is proctoring monitored?
**A:** Proctoring dashboard coming in v1.1.0. Currently basic monitoring is available. See [FEATURES.md](./FEATURES.md#in-progress).

## Deployment Questions

### Q: How do I deploy to production?
**A:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step guide.

### Q: What's the recommended hosting?
**A:** AWS EC2, DigitalOcean, or Linode for VPS approach. See [DEPLOYMENT.md](./DEPLOYMENT.md#deployment-strategies).

### Q: How do I set up SSL certificate?
**A:** See [DEPLOYMENT.md](./DEPLOYMENT.md#ssl-certificate) for Let's Encrypt or self-signed options.

### Q: Can I scale to thousands of users?
**A:** Yes! Use load balancers, database clusters, and auto-scaling. See [DEPLOYMENT.md](./DEPLOYMENT.md#scaling-considerations).

### Q: What about database backups?
**A:** MongoDB Atlas has automatic backups. See [DEPLOYMENT.md](./DEPLOYMENT.md#database-backups) for manual backup strategies.

## Performance Questions

### Q: Why is the app slow?
**A:**
1. Check Docker container resources: `docker stats`
2. Check browser network tab (F12 → Network)
3. Verify backend is running: `docker-compose logs backend`
4. Check database performance: `docker-compose logs mongodb`

### Q: How can I optimize performance?
**A:** See [DEPLOYMENT.md](./DEPLOYMENT.md#performance-optimization) for caching, indexing, and compression strategies.

## Development Questions

### Q: How do I add a new API endpoint?
**A:**
1. Create controller method in `/backend/src/controllers/`
2. Add route in `/backend/src/routes/`
3. Update [API.md](./API.md) documentation
4. Test with curl or Thunder Client

### Q: How do I add a new page to the frontend?
**A:**
1. Create folder in `/frontend/src/app/`
2. Add `page.tsx` file
3. Next.js automatically creates the route
4. Build components in `/frontend/src/components/`

### Q: Where do I modify the theme?
**A:** Edit Tailwind config in `/frontend/tailwind.config.ts` and custom colors in `/frontend/src/app/globals.css`.

### Q: How do I debug the backend?
**A:** Use Chrome DevTools: chrome://inspect (see [SETUP.md](./SETUP.md#debugging)).

### Q: How do I run tests?
**A:**
```bash
npm test                           # Run all tests
npm test --workspace=backend      # Test specific workspace
```

## Database Questions

### Q: How do I access the database?
**A:** See [DOCKER.md](./DOCKER.md#database-access) for MongoDB shell and Redis CLI access.

### Q: Can I migrate from one database to another?
**A:** MongoDB native tools: `mongodump` and `mongorestore`. See [DEPLOYMENT.md](./DEPLOYMENT.md#disaster-recovery).

### Q: What's the data model?
**A:** See [ARCHITECTURE.md](./ARCHITECTURE.md#database-schema) for complete schema documentation.

## Common Issues

### Q: "EADDRINUSE: address already in use"
**A:** Another process is using the port. Kill it:
```bash
lsof -i :{PORT} -t | xargs kill -9
```

### Q: "Cannot find module" error
**A:** Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Q: "CORS error"
**A:** Check backend CORS config. In [DEPLOYMENT.md](./DEPLOYMENT.md), verify `CORS_ORIGIN` matches frontend URL.

### Q: Containers keep crashing
**A:** Check logs: `docker-compose logs` and restart: `docker-compose up --force-recreate`

### Q: Out of memory
**A:** Increase Docker memory allocation in Docker Desktop settings or use `docker-compose down -v && docker system prune -a`

## Getting Help

1. **Check Documentation**: Start at [INDEX.md](./INDEX.md)
2. **Search Issues**: Look at GitHub issues
3. **Check Logs**: `docker-compose logs` shows detailed errors
4. **Test in Isolation**: Test individual services separately
5. **Ask on Forums**: Stack Overflow, GitHub Discussions

## Still Stuck?

1. Read through this FAQ completely
2. Check all documentation links above
3. Verify you followed [QUICKSTART.md](./QUICKSTART.md) exactly
4. Open an issue on GitHub with:
   - Error message (full text)
   - Steps to reproduce
   - System info (OS, Docker version)
   - Logs from `docker-compose logs`

---

**[← Back to Index](./INDEX.md)**
