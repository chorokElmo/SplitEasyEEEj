# 🚀 SplitEasy - Deployment Guide

## Prerequisites

- Node.js v16+ and npm
- MongoDB v5.0+
- Git

## Environment Setup

### Backend Environment Variables

Create `backend/.env`:

```env
NODE_ENV=production
PORT=8000
DATABASE_URL=mongodb://localhost:27017/spliteasy
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d
ALLOWED_ORIGINS=https://your-domain.com
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=5242880
LOG_LEVEL=info
```

### Frontend Environment Variables

Create `frontend-react/.env`:

```env
VITE_API_URL=https://api.your-domain.com/api
VITE_APP_NAME=SplitEasy
```

## Production Build

### Backend

```bash
cd backend
npm install --production
npm start
```

### Frontend

```bash
cd frontend-react
npm install
npm run build
```

The build output will be in `frontend-react/dist/`

## Deployment Options

### Option 1: Traditional VPS

1. **Backend**: Run with PM2
   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name spliteasy-backend
   pm2 save
   ```

2. **Frontend**: Serve with Nginx
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       root /path/to/frontend-react/dist;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Option 2: Docker

Create `Dockerfile.backend`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["node", "server.js"]
```

Create `Dockerfile.frontend`:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Option 3: Cloud Platforms

#### Heroku
```bash
# Backend
cd backend
heroku create spliteasy-api
heroku addons:create mongolab
git push heroku main

# Frontend
cd frontend-react
heroku create spliteasy-app
heroku buildpacks:set heroku/nodejs
git push heroku main
```

#### Vercel (Frontend)
```bash
cd frontend-react
vercel
```

#### Railway/Render
- Connect GitHub repository
- Set environment variables
- Deploy automatically

## Security Checklist

- [ ] Change JWT_SECRET to a strong random string
- [ ] Enable HTTPS/SSL
- [ ] Set secure CORS origins
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Database backups
- [ ] Environment variables secured

## Monitoring

### Backend Logs
- Winston logs in `backend/logs/`
- Monitor error.log for issues

### Health Check
```bash
curl http://your-api.com/health
```

## Backup Strategy

### MongoDB Backup
```bash
mongodump --uri="mongodb://localhost:27017/spliteasy" --out=/backup/$(date +%Y%m%d)
```

### Automated Backups
Set up cron job for daily backups.

## Performance Optimization

1. **Enable Gzip compression**
2. **CDN for static assets**
3. **Database indexing**
4. **Redis caching** (optional)
5. **Image optimization**

## Troubleshooting

### Backend won't start
- Check MongoDB is running
- Verify .env file exists
- Check port 8000 is available

### Frontend build fails
- Clear node_modules and reinstall
- Check Node.js version
- Verify all dependencies installed

### CORS errors
- Update ALLOWED_ORIGINS in backend .env
- Check CORS configuration in server.js

---

**For detailed setup, see [SETUP_GUIDE.md](SETUP_GUIDE.md)**
