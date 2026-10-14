/**
 * migrate-images.mjs
 *
 * One-shot migration: converts every item's images array from legacy formats
 * (plain strings OR objects missing public_id) to { url: String, public_id: String }.
 *
 * Safe to re-run — already-migrated documents are skipped automatically.
 *
 * Usage:
 *   node migrate-images.mjs
 *   node migrate-images.mjs --dry-run   ← preview without writing anything
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// ─── CLI flags ────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('🔍  DRY-RUN mode — no writes will be made.\n');

// ─── Cloudinary public_id extractor ──────────────────────────────────────────
/**
 * Extracts the Cloudinary public_id from a full secure URL.
 *
 * Handles all of these patterns:
 *   https://res.cloudinary.com/<cloud>/image/upload/v1234567/folder/file.jpg
 *   https://res.cloudinary.com/<cloud>/image/upload/folder/file.jpg   (no version)
 *   https://res.cloudinary.com/<cloud>/image/upload/v1234567/file.png
 *   https://res.cloudinary.com/<cloud>/image/upload/a_transform/v1/folder/file.jpg
 *
 * Returns null if the URL is not a recognisable Cloudinary URL.
 */
function extractPublicId(url) {
    if (!url || typeof url !== 'string') return null;

    // Everything after /upload/ — may start with a version token (v + digits)
    // or go straight into the path.
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]{2,4})?$/i);
    if (!match) return null;

    // Strip any leading transformation segments (e.g. "w_500,c_fill/").
    // Transformations are segments that match "key_value" format (letter(s) + underscore + value).
    // Folder names like "college_marketplace", "user_ids", "items" are NOT transformations
    // because they either contain no underscore-prefixed pattern or are known folder names.
    const raw = match[1];
    const parts = raw.split('/');
    // A transformation segment looks like: w_500  c_fill  f_auto  q_auto  fl_progressive
    // It always starts with 1-3 lowercase letters followed by an underscore then a value.
    // Real folder names never match this tight pattern.
    const isTransformation = (seg) => /^[a-z]{1,3}_[^/]+$/.test(seg) && !seg.includes('.');
    const cleaned = parts.filter(seg => !isTransformation(seg));

    return cleaned.join('/');
}

// ─── Determine whether a single image entry needs migration ──────────────────
function needsMigration(img) {
    if (typeof img === 'string') return true;               // plain URL string
    if (img && typeof img === 'object' && !img.public_id) return true;  // object missing public_id
    return false;
}

// ─── Convert one image entry to { url, public_id } ───────────────────────────
function normalise(img) {
    const url = typeof img === 'string' ? img : img.url;
    const public_id = extractPublicId(url);

    if (!public_id) {
        // URL is unrecognisable — preserve as-is with a placeholder public_id
        // so the document is still valid and won't crash the app.
        console.warn(`  ⚠️  Could not extract public_id from: ${url}`);
        return { url, public_id: url }; // fallback: use the URL itself
    }

    return { url, public_id };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function migrate() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  Connected to MongoDB.\n');

    const collection = mongoose.connection.db.collection('items');

    // Count total items for progress reporting
    const totalItems = await collection.countDocuments();
    console.log(`📦  Total items in collection: ${totalItems}`);

    // Only fetch documents that actually need work:
    //   - images array contains at least one plain string, OR
    //   - images array contains at least one object without a public_id field
    const filter = {
        $or: [
            { 'images': { $elemMatch: { $type: 'string' } } },
            { 'images': { $elemMatch: { public_id: { $exists: false } } } },
        ]
    };

    const needsMigrationCount = await collection.countDocuments(filter);
    console.log(`🔧  Items needing migration:   ${needsMigrationCount}`);

    if (needsMigrationCount === 0) {
        console.log('\n🎉  Nothing to migrate. All items are already in the new format.');
        await mongoose.disconnect();
        return;
    }

    console.log('\nStarting migration...\n');

    // Use a cursor so only one document is in memory at a time — safe for any
    // collection size without hitting Node.js heap limits.
    const cursor = collection.find(filter);

    const BATCH_SIZE = 100;
    let batch = [];         // accumulates bulkWrite operations
    let processed = 0;
    let modified = 0;
    let skipped = 0;
    let errors = 0;

    const flushBatch = async () => {
        if (batch.length === 0) return;
        if (!DRY_RUN) {
            const result = await collection.bulkWrite(batch, { ordered: false });
            modified += result.modifiedCount;
        } else {
            modified += batch.length; // count as-if in dry-run
        }
        batch = [];
    };

    for await (const doc of cursor) {
        processed++;

        try {
            // Check each image in this document
            const hasLegacy = doc.images?.some(needsMigration);
            if (!hasLegacy) {
                skipped++;
                continue;
            }

            const newImages = (doc.images || []).map(img => {
                // Already correct format — leave untouched
                if (!needsMigration(img)) return img;
                return normalise(img);
            });

            batch.push({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: { images: newImages } },
                }
            });

            // Log a sample of what's being converted (first 5 only to avoid spam)
            if (modified + batch.length <= 5) {
                const sample = doc.images[0];
                const converted = newImages[0];
                console.log(`  📄  "${doc.title}"`);
                console.log(`      Before: ${JSON.stringify(sample)}`);
                console.log(`      After:  ${JSON.stringify(converted)}\n`);
            }

        } catch (err) {
            errors++;
            console.error(`  ❌  Error processing doc ${doc._id}: ${err.message}`);
        }

        // Flush every BATCH_SIZE operations to keep memory flat
        if (batch.length >= BATCH_SIZE) {
            await flushBatch();
            process.stdout.write(`  ⏳  Processed ${processed}/${needsMigrationCount}...\r`);
        }
    }

    // Flush any remaining operations
    await flushBatch();

    console.log('\n─────────────────────────────────────────');
    console.log(`✅  Migration complete.`);
    console.log(`   Total scanned : ${processed}`);
    console.log(`   Modified      : ${modified}${DRY_RUN ? ' (dry-run, not written)' : ''}`);
    console.log(`   Already clean : ${skipped}`);
    console.log(`   Errors        : ${errors}`);
    console.log('─────────────────────────────────────────\n');

    if (errors > 0) {
        console.warn('⚠️  Some documents had errors. Check the logs above and re-run to retry.');
    }

    if (!DRY_RUN) {
        try {
            const { default: redis } = await import('./config/redis.js');
            const keys = await redis.keys('items:*');
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`🧹  Cleared ${keys.length} cached item query key(s) in Redis.`);
            }
            await redis.quit();
        } catch (cacheErr) {
            console.warn('⚠️  Could not clear Redis cache:', cacheErr.message);
        }
    }

    await mongoose.disconnect();
    console.log('🔌  Disconnected from MongoDB.');
}

migrate().catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
});
