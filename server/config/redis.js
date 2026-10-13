import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const getRedisUrl = () => {
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL;
    }
    throw new Error("REDIS_URL is not defined in environment variables");
};

// Parse the URL to get details, but add specific connection settings
const rawUrl = getRedisUrl();
// Upstash (and most managed Redis) requires TLS — the URL scheme must be rediss://
// If the env var was saved with redis:// by mistake, fix it at runtime so the
// TLS handshake succeeds without touching the .env file.
const redisUrl = rawUrl.startsWith('redis://') && !rawUrl.startsWith('rediss://')
    ? rawUrl.replace('redis://', 'rediss://')
    : rawUrl;

const redis = new Redis(redisUrl, {
    family: 4,           // Force IPv4 — prevents hangs on Node 17+ dual-stack
    tls: { rejectUnauthorized: false },
    retryStrategy: (times) => Math.min(times * 50, 2000),
    connectTimeout: 10000,
});

redis.on("connect", () => {
    console.log("Redis Connected Successfully! 🚀");
});

redis.on("error", (err) => {
    console.error("Redis Connection Error:", err.message); // Log just the message to keep it clean
});

export default redis;