/**
 * imageService.js
 * Central service for all Cloudinary operations and platform-wide image deduplication.
 * Every upload/delete in the app should go through these helpers — never call the
 * Cloudinary SDK directly from controllers.
 */

import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import ImageHash from '../models/ImageHash.js';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

// ─── Hash ────────────────────────────────────────────────────────────────────

/**
 * Compute an MD5 hash from a file buffer.
 * Used as the deduplication key before any Cloudinary upload.
 */
export function computeHash(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
}

// ─── Upload / Delete ─────────────────────────────────────────────────────────

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {object} options  - Cloudinary upload options (folder, public_id, overwrite, etc.)
 * @returns {{ url, public_id }}
 */
export async function uploadToCloudinary(buffer, options = {}) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err) return reject(err);
            resolve({ url: result.secure_url, public_id: result.public_id });
        });
        stream.end(buffer);
    });
}

/**
 * Delete a single asset from Cloudinary.
 * Always passes { invalidate: true } to bust CDN edge caches immediately.
 */
export async function deleteFromCloudinary(public_id, extraOptions = {}) {
    try {
        await cloudinary.uploader.destroy(public_id, { invalidate: true, ...extraOptions });
    } catch (err) {
        // Log but never throw — a failed CDN delete must not crash the main flow.
        console.error(`[imageService] deleteFromCloudinary failed for ${public_id}:`, err.message);
    }
}

/**
 * Rename/move a temp/ asset to its permanent path.
 * Called after a successful DB save to promote staged uploads.
 * Cloudinary's "rename" is an atomic server-side move — no re-upload needed.
 * @returns {{ url, public_id }} of the permanent asset
 */
export async function moveTempToPermanent(tempPublicId, permanentPublicId) {
    const result = await cloudinary.uploader.rename(
        tempPublicId,
        permanentPublicId,
        { overwrite: true, invalidate: true }
    );
    return { url: result.secure_url, public_id: result.public_id };
}

// ─── Deduplication ───────────────────────────────────────────────────────────

/**
 * Core deduplication logic for item images.
 *
 * Flow:
 *   1. Compute MD5 of the buffer.
 *   2. If hash exists in ImageHash → reuse existing Cloudinary asset (increment ref).
 *   3. If hash is new → stage to temp/, save DB record, return temp public_id for later promotion.
 *
 * @param {Buffer} buffer       - Raw file buffer from multer memoryStorage
 * @param {string} tempPublicId - Where to stage the file if it's a new upload (e.g. temp/abc123)
 * @returns {{ url, public_id, isNew: boolean }}
 */
export async function deduplicateAndStage(buffer, tempPublicId) {
    const hash = computeHash(buffer);

    // Check if this exact image already lives on Cloudinary
    const existing = await ImageHash.findOneAndUpdate(
        { md5Hash: hash },
        { $inc: { referenceCount: 1 } },
        { new: true }
    );

    if (existing) {
        // Duplicate found — reuse the existing CDN asset, no upload needed
        return { url: existing.cloudinaryUrl, public_id: existing.public_id, isNew: false };
    }

    // New image — upload to temp/ folder first (ghost-upload safety net)
    const { url, public_id } = await uploadToCloudinary(buffer, {
        folder:    'temp',
        public_id: tempPublicId,
    });

    // Persist the hash record with referenceCount: 1
    await ImageHash.create({ md5Hash: hash, cloudinaryUrl: url, public_id });

    return { url, public_id, isNew: true };
}

/**
 * Promote a staged temp/ image to its permanent items/ path.
 * Updates the ImageHash record to reflect the new public_id.
 *
 * @param {string} tempPublicId       - e.g. "temp/abc123"
 * @param {string} permanentPublicId  - e.g. "items/abc123"
 * @returns {{ url, public_id }}
 */
export async function promoteImage(tempPublicId, permanentPublicId) {
    const promoted = await moveTempToPermanent(tempPublicId, permanentPublicId);

    // Keep the hash record in sync with the new permanent public_id
    await ImageHash.findOneAndUpdate(
        { public_id: tempPublicId },
        { public_id: promoted.public_id, cloudinaryUrl: promoted.url }
    );

    return promoted;
}

/**
 * Decrement the reference count for an image.
 * Only destroys the Cloudinary asset when the last reference is removed.
 * This is the single exit point for all image deletions.
 *
 * @param {string} public_id
 */
export async function decrementOrDelete(public_id) {
    const record = await ImageHash.findOneAndUpdate(
        { public_id },
        { $inc: { referenceCount: -1 } },
        { new: true }
    );

    if (!record) {
        // No hash record — asset may have been uploaded before dedup was introduced;
        // delete it directly to avoid orphans.
        await deleteFromCloudinary(public_id);
        return;
    }

    if (record.referenceCount <= 0) {
        // Last reference gone — safe to wipe from Cloudinary and clean up the record
        await deleteFromCloudinary(public_id);
        await ImageHash.deleteOne({ _id: record._id });
    }
}
