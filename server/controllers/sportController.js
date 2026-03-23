import Sport from '../models/Sport.js';
import SportRegistration from '../models/SportRegistration.js';

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, message, status = 500) => res.status(status).json({ success: false, message });

// ── GET /api/sports ───────────────────────────────────────────────────────────
export const getSports = async (req, res) => {
  try {
    const { college } = req.query;
    const filter = {};
    if (college) filter.college = college;

    const sports = await Sport.find(filter).sort({ eventDate: 1 }).lean();

    // Attach registration count to each sport
    const ids = sports.map(s => s._id);
    const counts = await SportRegistration.aggregate([
      { $match: { sport: { $in: ids } } },
      { $group: { _id: '$sport', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
    const enriched = sports.map(s => ({ ...s, registrationCount: countMap[String(s._id)] || 0 }));

    return ok(res, { data: enriched });
  } catch (error) {
    console.error('getSports error:', error);
    return err(res, 'Server error.');
  }
};

// ── GET /api/sports/:id ───────────────────────────────────────────────────────
export const getSport = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id).lean();
    if (!sport) return err(res, 'Sport not found.', 404);

    const registrationCount = await SportRegistration.countDocuments({ sport: sport._id });
    return ok(res, { data: { ...sport, registrationCount } });
  } catch {
    return err(res, 'Server error.');
  }
};

// ── POST /api/sports ──────────────────────────────────────────────────────────
export const createSport = async (req, res) => {
  try {
    const {
      title, sportType, description, venue,
      eventDate, lastRegistrationDate,
      teamSize, maxTeams, registrationFee,
      organizerPhone, rules,
    } = req.body;

    if (!title?.trim())            return err(res, 'Title is required.', 400);
    if (!sportType)                return err(res, 'Sport type is required.', 400);
    if (!venue?.trim())            return err(res, 'Venue is required.', 400);
    if (!eventDate)                return err(res, 'Event date is required.', 400);
    if (!lastRegistrationDate)     return err(res, 'Registration deadline is required.', 400);

    const sport = await Sport.create({
      title:               title.trim(),
      sportType,
      description:         description?.trim() || '',
      venue:               venue.trim(),
      eventDate:           new Date(eventDate),
      lastRegistrationDate: new Date(lastRegistrationDate),
      teamSize:            Number(teamSize) || 1,
      maxTeams:            maxTeams ? Number(maxTeams) : undefined,
      registrationFee:     Number(registrationFee) || 0,
      qrCodeUrl:           req.file?.path || '',
      rules:               rules?.trim() || '',
      organizer: {
        user:  req.user._id,
        name:  req.user.name,
        phone: organizerPhone?.trim() || '',
      },
      college: req.user.college,
    });

    return ok(res, { message: 'Sport event created.', data: sport }, 201);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map(e => e.message).join(', ');
      return err(res, msg, 400);
    }
    console.error('createSport error:', error);
    return err(res, 'Server error.');
  }
};

// ── PUT /api/sports/:id ───────────────────────────────────────────────────────
export const updateSport = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);
    if (!sport) return err(res, 'Sport not found.', 404);

    const isOrganizer = String(sport.organizer.user) === String(req.user._id);
    if (!isOrganizer && !req.user.isAdmin) return err(res, 'Not authorized.', 403);

    const editable = [
      'title', 'sportType', 'description', 'venue',
      'eventDate', 'lastRegistrationDate', 'teamSize',
      'maxTeams', 'registrationFee', 'rules', 'isOpen',
    ];
    editable.forEach(f => { if (req.body[f] !== undefined) sport[f] = req.body[f]; });
    if (req.body.organizerPhone !== undefined) sport.organizer.phone = req.body.organizerPhone;
    if (req.file) sport.qrCodeUrl = req.file.path;

    await sport.save();
    return ok(res, { message: 'Sport event updated.', data: sport });
  } catch (error) {
    console.error('updateSport error:', error);
    return err(res, 'Server error.');
  }
};

// ── DELETE /api/sports/:id ────────────────────────────────────────────────────
export const deleteSport = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);
    if (!sport) return err(res, 'Sport not found.', 404);

    const isOrganizer = String(sport.organizer.user) === String(req.user._id);
    if (!isOrganizer && !req.user.isAdmin) return err(res, 'Not authorized.', 403);

    await SportRegistration.deleteMany({ sport: sport._id });
    await sport.deleteOne();
    return ok(res, { message: 'Sport event deleted.' });
  } catch {
    return err(res, 'Server error.');
  }
};

// ── POST /api/sports/:id/register ─────────────────────────────────────────────
export const registerForSport = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);
    if (!sport) return err(res, 'Sport not found.', 404);
    if (!sport.isOpen) return err(res, 'Registration is closed for this sport.', 400);
    if (new Date(sport.lastRegistrationDate) < new Date())
      return err(res, 'Registration deadline has passed.', 400);

    // Duplicate check
    const existing = await SportRegistration.findOne({ sport: sport._id, registeredBy: req.user._id });
    if (existing) return err(res, 'You have already registered for this sport.', 400);

    // Max teams cap
    if (sport.maxTeams) {
      const count = await SportRegistration.countDocuments({ sport: sport._id });
      if (count >= sport.maxTeams) return err(res, 'Maximum registrations reached.', 400);
    }

    const { teamName, captainName, captainContact, course, year } = req.body;
    if (!teamName?.trim())       return err(res, 'Team name is required.', 400);
    if (!captainName?.trim())    return err(res, 'Captain name is required.', 400);
    if (!captainContact?.trim()) return err(res, 'Captain contact is required.', 400);
    if (!course?.trim())         return err(res, 'Course is required.', 400);
    if (!year)                   return err(res, 'Year is required.', 400);

    let paymentProofUrl  = '';
    let paymentProofType = '';
    if (req.file) {
      paymentProofUrl  = req.file.path;
      paymentProofType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
    } else if (sport.registrationFee > 0) {
      return err(res, 'Payment proof is required for paid registrations.', 400);
    }

    const registration = await SportRegistration.create({
      sport:          sport._id,
      teamName:       teamName.trim(),
      captainName:    captainName.trim(),
      captainContact: captainContact.trim(),
      course:         course.trim(),
      year,
      paymentProofUrl,
      paymentProofType,
      registeredBy:   req.user._id,
      college:        req.user.college,
    });

    return ok(res, { message: 'Registered successfully!', data: registration }, 201);
  } catch (error) {
    if (error.code === 11000) return err(res, 'You have already registered for this sport.', 400);
    console.error('registerForSport error:', error);
    return err(res, 'Server error.');
  }
};

// ── GET /api/sports/:id/registrations ────────────────────────────────────────
// Organizer / admin only
export const getRegistrations = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);
    if (!sport) return err(res, 'Sport not found.', 404);

    const isOrganizer = String(sport.organizer.user) === String(req.user._id);
    if (!isOrganizer && !req.user.isAdmin) return err(res, 'Not authorized.', 403);

    const regs = await SportRegistration
      .find({ sport: sport._id })
      .populate('registeredBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return ok(res, { data: regs, sport: { title: sport.title, teamSize: sport.teamSize } });
  } catch {
    return err(res, 'Server error.');
  }
};

// ── PATCH /api/sports/:id/registrations/:regId ────────────────────────────────
export const updateRegistrationStatus = async (req, res) => {
  try {
    const sport = await Sport.findById(req.params.id);
    if (!sport) return err(res, 'Sport not found.', 404);

    const isOrganizer = String(sport.organizer.user) === String(req.user._id);
    if (!isOrganizer && !req.user.isAdmin) return err(res, 'Not authorized.', 403);

    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status))
      return err(res, 'Invalid status.', 400);

    const reg = await SportRegistration.findByIdAndUpdate(
      req.params.regId, { status }, { new: true }
    );
    if (!reg) return err(res, 'Registration not found.', 404);

    return ok(res, { message: 'Status updated.', data: reg });
  } catch {
    return err(res, 'Server error.');
  }
};
