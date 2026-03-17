import redis from "../config/redis.js"; // Note the .js extension!

const getOrSetCache = async (key, cb) => {
    try {
        const data = await redis.get(key);
        if (data) {
            const parsed = JSON.parse(data);
            // Don't serve empty arrays from cache — re-fetch so stale empty results don't persist
            if (!Array.isArray(parsed) || parsed.length > 0) {
                // console.log(`Cache HIT for key: ${key}`);
                return parsed;
            }
        }
    } catch (error) {
        console.error("Redis Get Error:", error);
    }

    console.log(`Cache MISS for key: ${key}`);
    const freshData = await cb();

    try {
        // Only cache non-empty results to prevent stale empty responses
        const shouldCache = Array.isArray(freshData) ? freshData.length > 0 : Boolean(freshData);
        if (shouldCache) {
            // Expire in 3600 seconds (1 hr)
            await redis.set(key, JSON.stringify(freshData), "EX", 3600);
        }
    } catch (error) {
        console.error("Redis Set Error:", error);
    }

    return freshData;
};

export default getOrSetCache;