# Environment Setup Guide

## Quick Setup

### Option 1: Use the setup script (Recommended)
```bash
./setup.sh
```

### Option 2: Manual setup
1. Copy the environment example file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your values:
   ```bash
   nano .env  # or use your preferred editor
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

### Required Variables
| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DATABASE_URL` | Database connection string | `./dev.db` | `./dev.db` |
| `PORT` | Server port | `3001` | `3001` |
| `NODE_ENV` | Environment mode | `development` | `development` |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:3000` | `http://localhost:3000` |

### Optional Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | `your-super-secret-key` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |

## Production Setup

For production, create a `.env.production` file with:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/support_db
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
JWT_SECRET=your-production-secret
```

## Security Notes

- ⚠️ **Never commit `.env` files to git**
- ✅ Always use strong, unique secrets in production
- ✅ Use environment-specific files (`.env.development`, `.env.production`)
- ✅ Keep sensitive keys in your deployment platform's secret management
