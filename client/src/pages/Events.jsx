import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import { toast } from 'react-toastify';
import SEOHead from '../components/SEOHead';
import { SEO } from '../utils/seoTemplates';
import { useCollege } from '../context/CollegeContext';
import {
  FaCalendarAlt, FaPlus, FaMapMarkerAlt, FaClock,
  FaTimes, FaSpinner, FaTrashAlt, FaEdit, FaCalendarCheck,
} from 'react-icons/fa';

const COLOR_OPTIONS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Violet', value: '#8b5cf6' },
];

const BLANK_FORM = {
  title: '', description: '', location: '',
  startTime: '', duration: 60, color: '#6366f1',
};

const Events = () => {
  const { selectedCollege } = useCollege();
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // event being edited
  const [form, setForm] = useState(BLANK_FORM);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const params = {};
      if (currentUser?.college) params.college = currentUser.college;
      const { data } = await API.get('/events', { params });
      setEvents(data);
    } catch {
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (ev) => {
    setEditTarget(ev);
    setForm({
      title: ev.title,
      description: ev.description || '',
      location: ev.location,
      startTime: new Date(ev.startTime).toISOString().slice(0, 16),
      duration: ev.duration,
      color: ev.color || '#6366f1',
    });
    setIsModalOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editTarget) {
        const { data } = await API.put(`/events/${editTarget._id}`, form);
        setEvents(events.map(ev => ev._id === editTarget._id ? data : ev));
        toast.success('Event updated!');
      } else {
        const { data } = await API.post('/events', form);
        setEvents([data, ...events]);
        toast.success('Event created!');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ev) => {
    if (!window.confirm(`Delete "${ev.title}"?`)) return;
    try {
      await API.delete(`/events/${ev._id}`);
      setEvents(events.filter(e => e._id !== ev._id));
      toast.success('Event deleted.');
    } catch {
      toast.error('Failed to delete event.');
    }
  };

  const isOwner = (ev) => {
    const uid = currentUser._id || currentUser.id;
    return String(ev.organizer?.user) === String(uid);
  };

  const canManage = (ev) => isOwner(ev) || currentUser.isAdmin;

  const formatDate = (d) =>
    new Date(d).toLocaleString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans transition-colors duration-300">
      <SEOHead {...SEO.events(selectedCollege)} />
      <Navbar />

      {/* HERO */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-center shadow-lg border-b border-indigo-700/30">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center justify-center gap-3">
          <FaCalendarCheck /> Campus Events
        </h1>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Discover upcoming events happening on your campus and share your own.
        </p>
      </div>

      {/* CONTROLS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-full font-bold shadow-md transition transform hover:-translate-y-0.5"
        >
          <FaPlus className="mr-2" /> Add Event
        </button>
      </div>

      {/* EVENT GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <FaCalendarAlt className="text-4xl text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No upcoming events</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Be the first to add one!</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {events.map(ev => (
              <div
                key={ev._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col"
              >
                {/* Color bar */}
                <div className="h-1.5 w-full" style={{ background: ev.color || '#6366f1' }} />

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{ev.title}</h3>
                    {canManage(ev) && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(ev)}
                          className="p-1.5 text-gray-400 hover:text-indigo-500 transition rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          title="Edit"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(ev)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <FaTrashAlt size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {ev.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{ev.description}</p>
                  )}

                  <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400 mt-auto">
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt className="text-indigo-500 flex-shrink-0" />
                      <span>{ev.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className="text-indigo-500 flex-shrink-0" />
                      <span>{formatDate(ev.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaClock className="text-indigo-500 flex-shrink-0" />
                      <span>{ev.duration} min</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      By <span className="font-semibold text-gray-700 dark:text-gray-300">{ev.organizer?.name}</span>
                    </span>
                    {ev.organizer?.phone && (
                      <a
                        href={`tel:${ev.organizer.phone}`}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        {ev.organizer.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-indigo-200 dark:border-indigo-700/50 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-900 dark:to-slate-800">
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                {editTarget ? 'Edit Event' : 'Create Event'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Title *</label>
                <input
                  required type="text" name="title" value={form.title}
                  onChange={handleChange} placeholder="e.g. Annual Cultural Fest"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
                  <input
                    required type="text" name="location" value={form.location}
                    onChange={handleChange} placeholder="e.g. Main Auditorium"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (min)</label>
                  <input
                    type="number" name="duration" value={form.duration} min="5"
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date & Time *</label>
                <input
                  required type="datetime-local" name="startTime" value={form.startTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  name="description" rows="3" value={form.description}
                  onChange={handleChange} placeholder="Details about the event..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value} type="button"
                      onClick={() => setForm({ ...form, color: c.value })}
                      className={`w-8 h-8 rounded-full border-4 transition ${form.color === c.value ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'}`}
                      style={{ background: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit" disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-lg font-bold shadow-md hover:from-indigo-600 hover:to-violet-600 transition flex items-center justify-center"
              >
                {submitting ? <><FaSpinner className="animate-spin mr-2" /> Saving...</> : (editTarget ? 'Update Event' : 'Create Event')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
