# Backend Deployment Guide

> **Purpose**: This guide covers deploying the LinguaLink NestJS backend to various hosting platforms with Drizzle ORM connecting to Supabase Postgres.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Local Development](#local-development)
4. [Hosting Options](#hosting-options)
5. [Deployment Checklists](#deployment-checklists)

---

## Prerequisites

### Required
- Node.js 18+ 
- npm or yarn
- Access to Supabase project (Postgres database)
- LiveKit Cloud account (for streaming)

### Project Structure
```
services/api/
├── src/
│   ├── main.ts              # Application entry
│   ├── app.module.ts        # Root module
│   ├── database/            # Drizzle config & schema
│   ├── live/                # LiveKit integration
│   └── monetization/        # Business logic
├── dist/                    # Compiled output
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## Environment Variables

### Required Environment Variables

Create `.env` in `services/api/`:

```env
# Database (Supabase Postgres)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# LiveKit (for streaming)
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# Server
PORT=3000
NODE_ENV=development

# Future integrations (add as implemented)
# EXPO_PUSH_ACCESS_TOKEN=
# PAYSTACK_SECRET_KEY=
# POSTHOG_API_KEY=
```

### Getting Supabase Connection String

1. Go to Supabase Dashboard → Project Settings → Database
2. Copy the "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your database password

> ⚠️ **Security**: Use the **service_role** connection for NestJS (bypasses RLS). Never expose this in client code.

---

## Local Development

### Initial Setup

```bash
cd services/api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

### Running Locally

```bash
# Development mode (with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### Verify Connection

```bash
# Check if server starts
curl http://localhost:3000

# Test LiveKit endpoint
curl -X POST http://localhost:3000/live/token \
  -H "Content-Type: application/json" \
  -d '{"roomName": "test", "participantName": "user1"}'
```

---

## Hosting Options

### Option 1: Railway (Recommended for MVP)

**Pros**: Easy setup, free tier, auto-deploys from Git

1. **Create Project**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Select `services/api` as the root directory

2. **Environment Variables**
   - Add all variables from `.env` to Railway dashboard
   - Railway auto-detects Node.js projects

3. **Deploy Settings**
   ```
   Build Command: npm run build
   Start Command: npm run start:prod
   ```

4. **Get URL**
   - Railway provides URL like `https://yourapp.up.railway.app`
   - Update mobile app API URL accordingly

### Option 2: Render

**Pros**: Generous free tier, easy PostgreSQL integration

1. **Create Web Service**
   - Connect GitHub repo
   - Set root directory to `services/api`

2. **Build & Start**
   ```
   Build: npm install && npm run build
   Start: npm run start:prod
   ```

3. **Environment**
   - Add env vars in dashboard
   - Enable auto-deploy on push

### Option 3: DigitalOcean App Platform

**Pros**: Predictable pricing, good for scaling

1. **Create App**
   - Source: GitHub
   - Component: Web Service
   - Source Directory: `services/api`

2. **Configure**
   ```
   Build: npm install && npm run build
   Run: npm run start:prod
   HTTP Port: 3000
   ```

### Option 4: Fly.io

**Pros**: Global edge deployment, great for low latency

1. **Install Fly CLI**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Initialize**
   ```bash
   cd services/api
   fly launch
   ```

3. **Set Secrets**
   ```bash
   fly secrets set DATABASE_URL="your_connection_string"
   fly secrets set LIVEKIT_API_KEY="your_key"
   ```

4. **Deploy**
   ```bash
   fly deploy
   ```

### Option 5: Self-Hosted (VPS)

For full control on Ubuntu/Debian:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and build
git clone your-repo
cd your-repo/services/api
npm install
npm run build

# Use PM2 for process management
npm install -g pm2
pm2 start dist/main.js --name lingualink-api
pm2 save
```

---

## Deployment Checklists

### Pre-Deployment

- [ ] All environment variables documented
- [ ] Database migrations applied to production
- [ ] API endpoints tested locally
- [ ] Error handling in place
- [ ] Logging configured

### Post-Deployment

- [ ] Health check endpoint responding
- [ ] Database connection verified
- [ ] LiveKit token generation working
- [ ] CORS configured for mobile app
- [ ] SSL/HTTPS enabled

### Mobile App Updates

After deploying, update your mobile app:

```typescript
// src/config/api.ts
export const API_URL = __DEV__
    ? 'http://localhost:3000'
    : 'https://your-deployed-url.com';
```

---

## 🔒 Security Considerations

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use service role for backend only** - Client uses anon key
3. **Enable CORS properly** - Restrict to your app domains
4. **Rate limiting** - Implement for production
5. **Validate all inputs** - Use DTOs and validators

---

## 📊 Monitoring (Future)

Planned integrations:
- [ ] Sentry for error tracking
- [ ] PostHog for analytics
- [ ] Uptime monitoring (Upptime, Better Uptime)
