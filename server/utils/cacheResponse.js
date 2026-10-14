import redis from "../config/redis.js";

const getOrSetCache = async (key, cb) => {
    try {
        const data = await redis.get(key);
        if (data) {
            const parsed = JSON.parse(data);
            // Don't serve empty arrays from cache — re-fetch so stale empty results don't persist
            // Also reject cached item lists if items are missing the 'images' field (stale pre-migration cache)
            const isStaleItemCache = Array.isArray(parsed) && parsed.length > 0 && parsed.some(item => item && typeof item === 'object' && !item.images);

            if (!isStaleItemCache && (!Array.isArray(parsed) || parsed.length > 0)) {
                return parsed;
            }

            if (isStaleItemCache) {
                console.warn(`[Redis Cache] Detected stale cache missing images for key: ${key}. Refreshing from DB.`);
            }
        }
    } catch (error) {
        // Redis is unavailable — fall through to DB query silently
        console.error("Redis Get Error:", error.message);
    }

    const freshData = await cb();

    try {
        const shouldCache = Array.isArray(freshData) ? freshData.length > 0 : Boolean(freshData);
        if (shouldCache) {
            await redis.set(key, JSON.stringify(freshData), "EX", 3600);
        }
    } catch (error) {
        console.error("Redis Set Error:", error.message);
    }

    return freshData;
};

export default getOrSetCache;