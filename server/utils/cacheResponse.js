import redis from "../config/redis.js"; // Note the .js extension!

const getOrSetCache = async (key, cb) => {
    try {
        const data = await redis.get(key);
        if (data) {
           // console.log(`Cache HIT for key: ${key}`);
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Redis Get Error:", error);
    }

    console.log(`Cache MISS for key: ${key}`);
    const freshData = await cb();

    try {
        if (freshData) {
            // Expire in 3600 seconds (1 hr)
            await redis.set(key, JSON.stringify(freshData), "EX", 3600);
        }
    } catch (error) {
        console.error("Redis Set Error:", error);
    }

    return freshData;
};

export default getOrSetCache;