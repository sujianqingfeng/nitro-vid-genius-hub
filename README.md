# Nitro starter

## Docker Commands

### Run Redis 7 with Authentication


```bash
docker run -d --name redis7 -p 6379:6379 -e REDIS_PASSWORD=123456 redis:7 redis-server --requirepass 123456
docker run --name vid-redis -d -p 6379:6379 redis:7 redis-server --requirepass 123456789 
```
