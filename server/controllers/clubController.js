import Club from '../models/Club.js';

// GET /api/clubs?college=...
export const getClubs = async (req, res) => {
  try {
    const { college } = req.query;
    if (!college) return res.status(400).json({ message: 'college query param is required' });

    const clubs = await Club.find({ college }).sort({ createdAt: -1 });
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/clubs/my-clubs  — clubs the logged-in user has joined
export const getMyClubs = async (req, res) => {
  try {
    const clubs = await Club.find({ members: req.user._id }).sort({ createdAt: -1 });
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/clubs
export const createClub = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const club = await Club.create({
      name,
      description: description || '',
      category:    category    || 'Default',
      college:     req.user.college,
      createdBy:   req.user._id,
      members:     [req.user._id],   // creator auto-joins
    });

    res.status(201).json(club);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/clubs/:id/join
export const joinClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: 'Club not found' });
    if (club.college !== req.user.college) {
      return res.status(403).json({ message: 'You can only join clubs from your college' });
    }

    const alreadyJoined = club.members.some(m => String(m) === String(req.user._id));
    if (!alreadyJoined) {
      club.members.push(req.user._id);
      await club.save();
    }

    res.json(club);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/clubs/:id/leave
export const leaveClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: 'Club not found' });

    club.members = club.members.filter(m => String(m) !== String(req.user._id));
    await club.save();

    res.json(club);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/clubs/:id  — creator or admin only
export const deleteClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: 'Club not found' });

    const isOwner = String(club.createdBy) === String(req.user._id);
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await club.deleteOne();
    res.json({ message: 'Club deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
