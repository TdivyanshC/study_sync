# Production Deployment Guide - StudySync App

## 🎯 Overview

This guide provides comprehensive instructions for deploying the StudySync application to production environments. The application consists of a React Native frontend and Python FastAPI backend with Supabase database.

## 📋 Prerequisites

### Required Services
- **Supabase Account**: Database and authentication
- **Domain Name**: For custom domain (optional)
- **SSL Certificate**: For HTTPS (required)
- **Vercel/Netlify**: For frontend hosting (recommended)
- **Railway/Render/Heroku**: For backend hosting (recommended)

### Required Environment Variables

#### Backend (.env.production)
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# Security
SECRET_KEY=your-very-secure-secret-key
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=https://yourdomain.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=INFO

# Feature Flags
ENABLE_METRICS=true
ENABLE_CIRCUIT_BREAKER=true
ENABLE_RETRY_LOGIC=true
```

#### Frontend (.env.production)
```bash
# API Configuration
EXPO_PUBLIC_API_URL=https://your-backend-url.com
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Environment
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_DEBUG_MODE=false

# Analytics (Optional)
EXPO_PUBLIC_ANALYTICS_ID=your-analytics-id

# Feature Flags
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
```

## 🚀 Backend Deployment

### Option 1: Railway Deployment

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

2. **Deploy Backend**
```bash
cd backend
railway init
railway add
railway deploy
```

3. **Configure Environment Variables**
```bash
railway variables set SUPABASE_URL=your-url
railway variables set SUPABASE_ANON_KEY=your-key
# ... set all other variables
```

### Option 2: Render Deployment

1. **Create render.yaml**
```yaml
services:
  - type: web
    name: studysync-backend
    env: python
    plan: starter
    buildCommand: pip install -r requirements.txt
    startCommand: python main.py
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      # Add other environment variables
```

2. **Deploy**
```bash
render deploy
```

### Option 3: Docker Deployment

1. **Create Dockerfile**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "main.py"]
```

2. **Build and Deploy**
```bash
docker build -t studysync-backend .
docker run -p 8000:8000 --env-file .env.production studysync-backend
```

## 📱 Frontend Deployment

### Option 1: Expo EAS Build (Recommended)

1. **Configure EAS**
```bash
cd frontend
npm install -g @expo/eas-cli
eas login
eas build:configure
```

2. **Update app.json**
```json
{
  "expo": {
    "name": "StudySync",
    "slug": "studysync",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1a2e"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.studysync.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a1a2e"
      },
      "package": "com.studysync.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "scheme": "studysync"
  }
}
```

3. **Build for Production**
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
eas build --platform web --profile production
```

### Option 2: Vercel Deployment

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
cd frontend
vercel --prod
```

## 🗄️ Database Setup

### 1. Supabase Production Setup

1. **Create Production Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create new project
   - Note the URL and API keys

2. **Run Migrations**
```bash
# Apply all migrations
psql "postgresql://user:password@host:port/database" -f migrations/*.sql
```

3. **Configure RLS Policies**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (example)
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);
```

### 2. Database Monitoring

```sql
-- Create monitoring views
CREATE VIEW user_metrics AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  SUM(duration_minutes) as total_minutes,
  AVG(duration_minutes) as avg_session_length
FROM study_sessions 
GROUP BY user_id;
```

## 🔐 Security Configuration

### 1. CORS Settings
```python
# backend/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com", "https://www.yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

### 2. Rate Limiting
```python
# backend/middleware/rate_limit.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### 3. Environment Validation
```python
# backend/utils/config.py
from pydantic import BaseSettings, validator

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SECRET_KEY: str
    
    @validator('SUPABASE_URL')
    def validate_supabase_url(cls, v):
        if not v.startswith('https://'):
            raise ValueError('SUPABASE_URL must start with https://')
        return v

settings = Settings()
```

## 📊 Monitoring & Analytics

### 1. Health Check Endpoints
```python
# backend/routes/health_routes.py
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0"
    }

@app.get("/health/detailed")
async def detailed_health_check():
    # Check database connection
    db_status = await check_database_connection()
    
    # Check external services
    supabase_status = await check_supabase_connection()
    
    return {
        "status": "healthy" if all([db_status, supabase_status]) else "unhealthy",
        "checks": {
            "database": db_status,
            "supabase": supabase_status
        }
    }
```

### 2. Logging Configuration
```python
# backend/utils/logging.py
import logging
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
```

### 3. Error Tracking (Sentry)
```python
# backend/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[
        FastApiIntegration(auto_enabling=True),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=1.0
)
```

## 🧪 Testing in Production

### 1. Smoke Tests
```bash
#!/bin/bash
# test-production.sh

# Test backend health
curl -f https://your-backend-url.com/health || exit 1

# Test database connection
curl -f https://your-backend-url.com/health/detailed || exit 1

# Test frontend
curl -f https://yourdomain.com || exit 1

echo "✅ All smoke tests passed"
```

### 2. Performance Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Create test config
cat > load-test.yml << EOF
config:
  target: 'https://your-backend-url.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Health Check"
    requests:
      - get:
          url: "/health"
EOF

# Run test
artillery run load-test.yml
```

### 3. Security Testing
```bash
# Install security scanner
npm install -g @owasp/zap-api-scan

# Scan API
zap-api-scan.py -t https://your-backend-url.com -f openapi -o scan_results.html
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: |
          npm install -g vercel
          vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

## 📈 Post-Deployment Checklist

### ✅ Application Health
- [ ] Backend health endpoint responds
- [ ] Database connections working
- [ ] Frontend loads without errors
- [ ] API endpoints return expected responses
- [ ] Authentication flow works
- [ ] Real-time features functional

### ✅ Performance
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] Assets properly compressed
- [ ] CDN configured for static assets

### ✅ Security
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Environment variables secure
- [ ] No sensitive data in logs
- [ ] Database RLS policies active

### ✅ Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Log aggregation working
- [ ] Health checks configured
- [ ] Alerting rules set up

### ✅ User Experience
- [ ] App icons and splash screens configured
- [ ] Push notifications working
- [ ] Offline functionality tested
- [ ] Cross-platform compatibility verified
- [ ] Accessibility features working

## 🚨 Rollback Strategy

### Backend Rollback
```bash
# Railway
railway rollback

# Render
render deploy --previous

# Docker
docker pull studysync-backend:previous
docker run -p 8000:8000 studysync-backend:previous
```

### Frontend Rollback
```bash
# Vercel
vercel rollback

# Expo EAS
eas build:submit --previous-build
```

### Database Rollback
```bash
# Run rollback migrations
psql "postgresql://user:password@host:port/database" -f rollback_migrations/*.sql
```

## 📞 Support & Maintenance

### Monitoring Dashboards
- **Backend Health**: `https://your-backend-url.com/health/detailed`
- **Performance Metrics**: Setup in Grafana/Prometheus
- **Error Tracking**: Sentry dashboard
- **Database Monitoring**: Supabase dashboard

### Regular Maintenance Tasks
1. **Weekly**: Review error rates and performance metrics
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Security audit and penetration testing
4. **Annually**: Full disaster recovery testing

### Emergency Contacts
- Backend Issues: [Your Backend Team]
- Frontend Issues: [Your Frontend Team]
- Database Issues: [Your Database Team]
- Infrastructure: [Your DevOps Team]

## 🎉 Launch Checklist

### Pre-Launch
- [ ] All features tested and working
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Support team trained

### Launch Day
- [ ] Monitor all systems closely
- [ ] Have rollback plan ready
- [ ] Customer support available
- [ ] Performance monitoring active
- [ ] Error tracking operational

### Post-Launch (First 48 hours)
- [ ] Monitor user feedback
- [ ] Check error rates and performance
- [ ] Address any critical issues
- [ ] Collect initial user metrics
- [ ] Plan for first iteration

---

## 📞 Getting Help

If you encounter issues during deployment:

1. **Check the logs** for error messages
2. **Verify environment variables** are set correctly
3. **Test locally** with production configuration
4. **Check service status** pages (Railway, Vercel, etc.)
5. **Contact support** with specific error messages

Remember: **Always test in a staging environment first!**