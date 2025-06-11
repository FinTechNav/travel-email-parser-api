# Travel Email Parser API

AI-powered travel email parsing API that extracts structured data from airline, hotel, car rental, and other travel confirmation emails.

## Features

- 🤖 AI-powered email parsing using OpenAI GPT-3.5-turbo
- 📧 Support for flights, hotels, car rentals, trains, cruises, and more
- 🎯 Smart trip grouping and itinerary management
- 🔍 Missing booking detection
- 🔐 JWT and API key authentication
- 📊 Usage tracking and rate limiting
- 🚀 Production-ready with comprehensive error handling

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free tier)
- OpenAI API account

### 1. Setup Project
```bash
# Clone/create project
# Run setup script
./scripts/setup.sh
```

### 2. Configure Supabase Database

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Create new project** (if needed)
3. **Get connection strings**:
   - Settings → Database → Connect
   - Copy **Transaction pooler** (port 6543) for DATABASE_URL
   - Copy **Session pooler** (port 5432) for DIRECT_URL

### 3. Update .env File
```env
# Transaction pooler for app runtime
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Session pooler for migrations
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# OpenAI API key
OPENAI_API_KEY="sk-your_openai_key_here"

# JWT secret (generate long random string)
JWT_SECRET="your_super_long_jwt_secret_at_least_32_characters_long"
```

### 4. Initialize Database
```bash
npx prisma migrate dev --name init
```

### 5. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000 for API documentation.

## 🔧 Troubleshooting

### Migration Hangs
- **Cause**: Missing DIRECT_URL for migrations
- **Fix**: Ensure both DATABASE_URL (port 6543) and DIRECT_URL (port 5432) are set

### Connection Errors
- **Cause**: Using Direct connection on IPv4 network
- **Fix**: Use Session/Transaction poolers (they support IPv4)

### "Can't reach database server"
- **Cause**: Wrong connection string or network issues
- **Fix**: Copy exact strings from Supabase dashboard

## 📚 API Documentation

- **Health Check**: `GET /api/v1/health`
- **Parse Email**: `POST /api/v1/parse/email`
- **Get Itineraries**: `GET /api/v1/parse/itineraries`
- **Authentication**: `POST /api/v1/auth/register`

## 🚀 Deployment

### Railway (Recommended)
```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

### Docker
```bash
docker build -t travel-email-parser .
docker run -p 3000:3000 --env-file .env travel-email-parser
```

## 💰 Cost Estimate (1000 emails/month)
- OpenAI API: $2-5
- Supabase: $0 (free tier)
- Hosting: $5-15
- **Total**: $7-20/month

## 🎯 What This Replaces

This API provides the same functionality as the discontinued WorldMate API that powered hundreds of travel apps, but with modern AI that's more flexible and accurate.

## 📖 Learn More

- [OpenAPI Documentation](docs/openapi.yaml)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting Guide](docs/troubleshooting.md)

## License

MIT License
