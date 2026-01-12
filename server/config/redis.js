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
const redis = new Redis(getRedisUrl(), {
    // 1. Force IPv4 (Fixes the timeout/retry error on Node 17+)
    family: 4, 
    
    // 2. Explicitly tell ioredis this is a TLS connection (Secure)
    tls: {
        rejectUnauthorized: false // Helps avoid SSL verification issues on some networks
    },

    // 3. Retry Strategy: If it fails, wait 2 seconds and try again
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    
    // 4. Increase the timeout for the initial connection
    connectTimeout: 10000, 
});

redis.on("connect", () => {
    console.log("Redis Connected Successfully! 🚀");
});

redis.on("error", (err) => {
    console.error("Redis Connection Error:", err.message); // Log just the message to keep it clean
});

export default redis;