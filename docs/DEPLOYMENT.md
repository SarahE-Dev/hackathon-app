# Production Deployment

> Guide for deploying CodeArena to production environments.

## Pre-Deployment Checklist

- [ ] Generate strong JWT secrets
- [ ] Set up production database (MongoDB Atlas recommended)
- [ ] Set up production cache (Redis Cloud recommended)
- [ ] Configure environment variables
- [ ] Test deployment locally
- [ ] Set up monitoring and logging
- [ ] Configure domain and SSL certificate
- [ ] Set up backups for database

## Environment Configuration

### Critical Environment Variables

Generate strong secrets:

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate refresh secret
openssl rand -base64 32
```

### Backend Production .env

```env
NODE_ENV=production
BACKEND_PORT=3001
FRONTEND_URL=https://yourdomain.com

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hackathon-platform?retryWrites=true&w=majority

# Cache (Redis Cloud)
REDIS_URL=redis://default:password@redis-host:6379

# JWT (USE STRONG VALUES!)
JWT_SECRET=<generate-with-openssl>
JWT_REFRESH_SECRET=<generate-with-openssl>

# Security
CORS_ORIGIN=https://yourdomain.com
API_KEY=<optional-api-key>

# Logging
LOG_LEVEL=info
SENTRY_DSN=<optional-error-tracking>
```

### Frontend Production .env.production

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

## Deployment Strategies

### Option 1: Docker on VPS (AWS EC2, DigitalOcean, Linode)

Most straightforward approach:

1. **Server Setup**
   ```bash
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Deploy Code**
   ```bash
   git clone <repo>
   cd hackathon-app
   ```

3. **Configure Environment**
   ```bash
   # Create .env file with production values
   nano .env
   # Add all variables above

   # Create docker-compose.prod.yml (see below)
   ```

4. **Start Services**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

5. **Set Up Reverse Proxy**
   ```bash
   # Install Nginx
   sudo apt-get install nginx

   # Configure (see Nginx config below)
   sudo systemctl start nginx
   ```

### Option 2: Managed Container Service (ECS, GKE, Fly.io)

For auto-scaling and high availability:

1. Build and push images to registry
2. Configure container service
3. Set environment variables
4. Deploy with auto-scaling rules

### Option 3: Platform as a Service (Heroku, Railway, Render)

Simplest for small projects:

1. Connect Git repository
2. Set environment variables in dashboard
3. Deploy with `git push`

## docker-compose.prod.yml

Production configuration with SSL and scaling:

```yaml
version: '3.8'

services:
  frontend:
    image: hackathon-app-frontend:latest
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    image: hackathon-app-backend:latest
    restart: always
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      MONGODB_URI: ${MONGODB_URI}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongodb:
    image: mongo:7
    restart: always
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    healthcheck:
      test: mongosh ping
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    healthcheck:
      test: redis-cli ping
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend

volumes:
  mongodb_data:
  redis_data:
```

## Nginx Configuration

Production reverse proxy setup:

```nginx
upstream backend {
    server backend:3001;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## SSL Certificate

### Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renew
sudo systemctl enable certbot.timer
```

### Self-Signed (Development)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem
```

## Database Setup

### MongoDB Atlas (Recommended)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string: `mongodb+srv://username:password@...`
4. Use in `MONGODB_URI` environment variable

### Redis Cloud (Recommended)

1. Create account at https://redis.com/cloud
2. Create database
3. Get connection string
4. Use in `REDIS_URL` environment variable

## Monitoring & Logging

### Health Checks

Add health check endpoint:

```typescript
// backend/src/index.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    mongodb: mongodbConnected,
    redis: redisConnected
  });
});
```

### Logging

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# With timestamps
docker-compose -f docker-compose.prod.yml logs -f --timestamps
```

### Monitoring Tools

- **Datadog**: Application monitoring
- **Sentry**: Error tracking
- **New Relic**: Performance monitoring
- **Prometheus + Grafana**: Custom metrics

## Database Backups

### MongoDB Atlas

Automated backups included (30-day retention).

Manual export:

```bash
mongodump --uri="mongodb+srv://user:pass@host" --out=backup
```

### Redis

```bash
# Enable persistence in redis config
redis-cli BGSAVE
```

## Scaling Considerations

### Horizontal Scaling

For multiple instances:

1. Use load balancer (Nginx, AWS ALB)
2. Share MongoDB and Redis
3. Enable session store in Redis
4. Use environment variables for service discovery

### Vertical Scaling

Increase resources for single server:
- More CPU cores
- More RAM
- Faster storage (SSD)

## Performance Optimization

### Frontend

- Enable CDN for static files
- Minify and compress assets
- Use production Next.js build

### Backend

- Enable Redis caching
- Use database indexes
- Implement rate limiting
- Monitor slow queries

### Database

- Add appropriate indexes
- Archive old records
- Monitor query performance

## Security Hardening

- [ ] Enable HTTPS everywhere
- [ ] Set strong JWT secrets
- [ ] Enable MongoDB authentication
- [ ] Enable Redis password
- [ ] Restrict API access (CORS)
- [ ] Add rate limiting
- [ ] Enable CSRF protection
- [ ] Sanitize user inputs
- [ ] Keep dependencies updated
- [ ] Monitor security advisories

## Disaster Recovery

### Backup Strategy

```bash
# Daily MongoDB backup
0 2 * * * mongodump --uri="..." --out=/backup/$(date +%Y%m%d)

# Keep 7 days of backups
find /backup -mtime +7 -exec rm -rf {} \;
```

### Restore from Backup

```bash
mongorestore --drop --uri="mongodb+srv://..." /backup/20240101
```

## Troubleshooting

### App Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Verify environment variables
docker-compose -f docker-compose.prod.yml config | grep MONGODB
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Increase memory limit in docker-compose.yml
```

### Database Connection Issues

```bash
# Test connection
mongo "mongodb+srv://user:pass@host"

# Check network access
nc -zv host port
```

---

**[← Back to Index](./INDEX.md)**
