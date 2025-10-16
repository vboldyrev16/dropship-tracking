# Redis Setup for Development

The worker queue requires Redis to be running. Here are your options:

## Option 1: Local Redis (macOS)

```bash
# Install Redis via Homebrew
brew install redis

# Start Redis
brew services start redis

# Or run in foreground
redis-server
```

## Option 2: Docker

```bash
# Run Redis in Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or use docker-compose:
# Create docker-compose.yml:
# services:
#   redis:
#     image: redis:7-alpine
#     ports:
#       - "6379:6379"

docker-compose up -d
```

## Option 3: Cloud Redis (Upstash) - Recommended for Development

1. Go to https://upstash.com/
2. Create free account
3. Create Redis database
4. Copy the connection URL
5. Update `.env`:
   ```
   REDIS_URL=rediss://default:[password]@[endpoint]:6379
   ```

## Testing the Worker

Once Redis is running:

```bash
npm run worker
```

You should see: "Worker started"

## Production

For production deployment (Railway/Render), use their Redis add-ons or Upstash.
