import StudyMaterial from '../models/StudyMaterial.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ok  = (res, data, status = 200) =>
  res.status(status).json({ success: true, ...data });

const err = (res, message, status = 500) =>
  res.status(status).json({ success: false, message });

// ── POST /api/materials/upload ────────────────────────────────────────────────
// Protected – uploads a file to Cloudinary and saves metadata in MongoDB.
export const uploadMaterial = async (req, res) => {
  try {
    // multer has already validated + uploaded the file to Cloudinary at this point
    if (!req.file) return err(res, 'No file uploaded.', 400);

    const { title, subjectName, semester, category } = req.body;

    // Manual field validation (avoids extra dependency)
    // Title is now optional, so the validation check has been removed.
    if (!subjectName?.trim()) return err(res, 'Subject name is required.', 400);
    if (!semester)            return err(res, 'Semester is required.', 400);
    if (!category)            return err(res, 'Category is required.', 400);

    const semNum = Number(semester);
    if (!Number.isInteger(semNum) || semNum < 1 || semNum > 8)
      return err(res, 'Semester must be a number between 1 and 8.', 400);

    const allowed = ['Exam Paper', 'Note', 'Book'];
    if (!allowed.includes(category))
      return err(res, `Category must be one of: ${allowed.join(', ')}.`, 400);

    const isImage = req.file.mimetype.startsWith('image/');

    const material = await StudyMaterial.create({
      title:       title ? title.trim() : '', // Handles optional title securely
      subjectName: subjectName.trim(),
      semester:    semNum,
      category,
      fileUrl:     req.file.path,   // Cloudinary secure_url is stored in req.file.path
      fileType:    isImage ? 'image' : 'pdf',
      uploadedBy:  req.user._id,
      college:     req.user.college,
    });

    return ok(res, { message: 'Material uploaded successfully.', data: material }, 201);
  } catch (error) {
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map(e => e.message).join(', ');
      return err(res, msg, 400);
    }
    console.error('uploadMaterial error:', error);
    return err(res, 'Server error. Please try again.');
  }
};

// ── GET /api/materials ────────────────────────────────────────────────────────
// Public – returns filtered + paginated study materials.
// Query params: semester, category, subject, college, page, limit
export const getMaterials = async (req, res) => {
  try {
    const {
      semester,
      category,
      subject,
      college,
      page  = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (college)  filter.college  = college;
    if (category) filter.category = category;
    if (semester) {
      const s = Number(semester);
      if (!isNaN(s)) filter.semester = s;
    }
    if (subject?.trim()) {
      // Case-insensitive partial match on subjectName
      filter.subjectName = { $regex: subject.trim(), $options: 'i' };
    }

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(50, parseInt(limit, 10) || 20); // cap at 50
    const skip     = (pageNum - 1) * limitNum;

    const [materials, total] = await Promise.all([
      StudyMaterial.find(filter)
        .populate('uploadedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StudyMaterial.countDocuments(filter),
    ]);

    return ok(res, {
      data: materials,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore:    pageNum * limitNum < total,
      },
    });
  } catch (error) {
    console.error('getMaterials error:', error);
    return err(res, 'Server error. Please try again.');
  }
};

// ── DELETE /api/materials/:id ─────────────────────────────────────────────────
// Protected – uploader or admin can delete.
export const deleteMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return err(res, 'Material not found.', 404);

    const isOwner = String(material.uploadedBy) === String(req.user._id);
    if (!isOwner && !req.user.isAdmin)
      return err(res, 'Not authorized.', 403);

    await material.deleteOne();
    return ok(res, { message: 'Material deleted.' });
  } catch (error) {
    console.error('deleteMaterial error:', error);
    return err(res, 'Server error. Please try again.');
  }
};