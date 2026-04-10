import redis from '../config/redis.js';

export const idempotencyCheck = async (req, res, next) => {
    // 1. Only intercept mutating requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    // 2. Extract idempotency key
    const idempotencyKey = req.headers['x-idempotency-key'];
    
    // If not provided from older clients, degrade gracefully and process normally
    if (!idempotencyKey) return next();

    // 3. Create a unique cache key based on user and request signature
    // Fallback to IP if user isn't populated yet by `protect` middleware
    const userId = req.user ? req.user._id.toString() : (req.ip || 'anon');
    const cacheKey = `idemp:${userId}:${idempotencyKey}`;

    try {
        const existingStatus = await redis.get(cacheKey);

        if (existingStatus === 'PENDING') {
            // A request is currently being processed by the database right now.
            // Reject this duplicate circuit-breaker retry cleanly to avoid race conditions.
            return res.status(409).json({ 
                message: "Duplicate request detected in progress, ignoring to prevent double write." 
            });
        }

        if (existingStatus) {
            // Request was already fully successful! Return the cached JSON to trick
            // the client into thinking it worked perfectly again, avoiding DB rewrites.
            return res.status(200).json(JSON.parse(existingStatus));
        }

        // --- FIRST TIME SEEING THIS REQUEST ---
        
        // Mark as pending with a 3-minute lock to cover long executing requests
        await redis.set(cacheKey, 'PENDING', 'EX', 180);

        // 4. Temporarily hijack the res.json method so we can cache the final result
        const originalJson = res.json;
        res.json = function(data) {
            // If the database write succeeded (200, 201), cache the response!
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Keep the cached successful response alive for 24 hours
                redis.set(cacheKey, JSON.stringify(data), 'EX', 86400).catch(console.error);
            } else {
                // If the operation failed natively (e.g. 400 Bad Req), delete the lock 
                // so the user can try again legitimately!
                redis.del(cacheKey).catch(console.error);
            }

            // Execute the original res.json behavior perfectly
            return originalJson.call(this, data);
        };

        next();
    } catch (error) {
        // If Redis goes down, fail open natively (process normally but with console warning)
        console.error("Idempotency Redis Error:", error.message);
        next();
    }
};
