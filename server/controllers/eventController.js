import Event from '../models/Event.js';
import { sendPushToCollege }    from '../utils/expoPush.js';
import { sendWebPushToCollege } from '../utils/webPushService.js';

// GET /api/events?college=...
// Returns upcoming events (events that ended less than 1 hour ago are still shown)
export const getEvents = async (req, res) => {
  try {
    const { college } = req.query;
    const since = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const filter = {
      startTime: { $gte: since },
      ...(college ? { college } : {}),
    };
    const events = await Event.find(filter).sort({ startTime: 1 }).limit(50);
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/events
export const createEvent = async (req, res) => {
  try {
    const { title, description, location, startTime, duration, color } = req.body;
    if (!title || !location || !startTime) {
      return res.status(400).json({ message: 'title, location and startTime are required' });
    }
    const event = await Event.create({
      title,
      description: description || '',
      location,
      startTime: new Date(startTime),
      duration: duration ? Number(duration) : 60,
      organizer: {
        user:  req.user._id,
        name:  req.user.name,
        phone: req.user.phone || '',
      },
      college: req.user.college,
      color:   color || '#6366f1',
    });
    const college       = req.user.college;
    const excludeUserId = req.user._id;
    const notifTitle    = 'New campus event 🎉';
    const notifBody     = `${title} · ${location}`;
    const notifData     = { type: 'event', eventId: String(event._id) };

    // Mobile Expo push
    sendPushToCollege({ college, excludeUserId, prefKey: 'events', title: notifTitle, body: notifBody, data: notifData });

    // Web browser push
    sendWebPushToCollege({ college, excludeUserId, prefKey: 'events', title: notifTitle, body: notifBody, url: '/events' });

    // Socket.io in-app banner
    const io = req.app.get('io');
    if (io) io.to(`college:${college}`).emit('campus_notification', { title: notifTitle, body: notifBody, data: notifData });

    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/events/:id  — organizer only
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const isOwner = String(event.organizer.user) === String(req.user._id);
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { title, description, location, startTime, duration, color } = req.body;
    if (title)       event.title       = title;
    if (description !== undefined) event.description = description;
    if (location)    event.location    = location;
    if (startTime)   event.startTime   = new Date(startTime);
    if (duration)    event.duration    = Number(duration);
    if (color)       event.color       = color;
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/events/:id  — organizer or admin only
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const isOwner = String(event.organizer.user) === String(req.user._id);
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await event.deleteOne();
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
