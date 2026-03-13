# Deployment Guide: APK Builder SaaS

This guide explains how to deploy the APK Builder SaaS platform on a production-ready cloud server (e.g., AWS EC2, DigitalOcean Droplet, Google Cloud VM).

## Prerequisites
- A Linux server (Ubuntu 22.04 recommended)
- Node.js 18+ installed
- Docker installed
- Nginx (for reverse proxy)
- Domain name pointed to your server IP

## Step 1: Clone and Install
```bash
git clone <your-repo-url>
cd APKBuilderSaaS
npm install
```

## Step 2: Configure Environment
Create a `.env` file in the root:
```env
JWT_SECRET=your_secure_random_string
NODE_ENV=production
PORT=3000
```

## Step 3: Build the Frontend
```bash
npm run build
```

## Step 4: Setup Android SDK (Host or Docker)
The platform uses Docker to sandbox builds. Ensure the Docker image is built:
```bash
docker build -t android-builder ./docker/Dockerfile.android
```

## Step 5: Run with PM2
```bash
npm install -g pm2
pm2 start server.ts --interpreter tsx --name apk-builder
```

## Step 6: Nginx Configuration
Configure Nginx to proxy requests to port 3000 and handle SSL (Certbot).

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Scalability
- **Database**: For production, replace SQLite with PostgreSQL.
- **File Storage**: Use AWS S3 or Google Cloud Storage for uploaded projects and generated APKs.
- **Build Workers**: Implement a distributed task queue (e.g., BullMQ with Redis) to run builds on separate worker nodes.
