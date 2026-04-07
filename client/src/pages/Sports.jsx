import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import { toast } from 'react-toastify';
import SEOHead from '../components/SEOHead';
import { SEO } from '../utils/seoTemplates';
import { useCollege } from '../context/CollegeContext';
import {
  FaTrophy, FaPlus, FaMapMarkerAlt, FaCalendarAlt, FaUsers,
  FaTimes, FaSpinner, FaTrashAlt, FaRupeeSign, FaQrcode,
  FaClipboardList, FaCheckCircle, FaTimesCircle, FaHourglassHalf,
  FaUpload, FaFileAlt, FaEdit,
} from 'react-icons/fa';

const SPORT_TYPES = [
  'Cricket', 'Football', 'Basketball', 'Volleyball',
  'Badminton', 'Table Tennis', 'Chess', 'Athletics', 'Kabaddi', 'Other',
];

const YEARS = ['1st', '2nd', '3rd', '4th', 'Other'];

const BLANK_SPORT_FORM = {
  title: '', sportType: 'Cricket', description: '', venue: '',
  eventDate: '', lastRegistrationDate: '', teamSize: 1, maxTeams: '',
  registrationFee: 0, rules: '', organizerPhone: '', qrCode: null,
};

const BLANK_REG_FORM = {
  teamName: '', captainName: '', captainContact: '',
  course: '', year: '1st', paymentProof: null,
};

const Sports = () => {
  const { selectedCollege } = useCollege();
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  const currentUserId = currentUser._id || currentUser.id;

  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  // today's date as YYYY-MM-DD for min/max constraints
  const today = new Date().toISOString().split('T')[0];

  // Create / Edit sport modal
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [editSportTarget, setEditSportTarget] = useState(null); // null = create
  const [sportForm, setSportForm] = useState(BLANK_SPORT_FORM);
  const [qrPreview, setQrPreview] = useState(null);
  const [submittingSport, setSubmittingSport] = useState(false);

  // Register modal
  const [registerTarget, setRegisterTarget] = useState(null);
  const [regForm, setRegForm] = useState(BLANK_REG_FORM);
  const [proofPreview, setProofPreview] = useState(null);
  const [submittingReg, setSubmittingReg] = useState(false);

  // Registrations viewer
  const [regsTarget, setRegsTarget] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  useEffect(() => { fetchSports(); }, []);

  const fetchSports = async () => {
    try {
      const params = {};
      if (currentUser?.college) params.college = currentUser.college;
      if (currentUserId) params.userId = currentUserId;
      const { data } = await API.get('/sports', { params });
      setSports(data.data || []);
    } catch {
      toast.error('Failed to load sports events.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Create / Edit Sport ────────────────────────────────────────────────────
  const handleSportChange = (e) => {
    const { name, value } = e.target;
    setSportForm(prev => {
      const updated = { ...prev, [name]: value };
      // If event date changes and deadline is now after it, clear the deadline
      if (name === 'eventDate' && prev.lastRegistrationDate && prev.lastRegistrationDate > value) {
        updated.lastRegistrationDate = '';
      }
      return updated;
    });
  };

  const openCreateSport = () => {
    setEditSportTarget(null);
    setSportForm(BLANK_SPORT_FORM);
    setQrPreview(null);
    setIsSportModalOpen(true);
  };

  const openEditSport = (sport) => {
    setEditSportTarget(sport);
    setSportForm({
      title:                sport.title,
      sportType:            sport.sportType,
      description:          sport.description || '',
      venue:                sport.venue,
      eventDate:            new Date(sport.eventDate).toISOString().split('T')[0],
      lastRegistrationDate: new Date(sport.lastRegistrationDate).toISOString().split('T')[0],
      teamSize:             sport.teamSize,
      maxTeams:             sport.maxTeams || '',
      registrationFee:      sport.registrationFee,
      rules:                sport.rules || '',
      organizerPhone:       sport.organizer?.phone || '',
      qrCode:               null,
    });
    setQrPreview(sport.qrCodeUrl || null);
    setIsSportModalOpen(true);
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSportForm(prev => ({ ...prev, qrCode: file }));
      setQrPreview(URL.createObjectURL(file));
    }
  };

  const handleSportSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSport(true);
    try {
      const fd = new FormData();
      Object.keys(sportForm).forEach(k => {
        if (k === 'qrCode') { if (sportForm.qrCode) fd.append('qrCode', sportForm.qrCode); }
        else if (sportForm[k] !== '' && sportForm[k] !== null) fd.append(k, sportForm[k]);
      });

      if (editSportTarget) {
        const { data } = await API.put(`/sports/${editSportTarget._id}`, fd);
        setSports(prev => prev.map(s => s._id === editSportTarget._id ? { ...s, ...data.data } : s));
        toast.success('Sports event updated!');
      } else {
        const { data } = await API.post('/sports', fd);
        setSports(prev => [data.data, ...prev]);
        toast.success('Sports event created!');
      }
      setIsSportModalOpen(false);
      setSportForm(BLANK_SPORT_FORM);
      setQrPreview(null);
      setEditSportTarget(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save sports event.');
    } finally {
      setSubmittingSport(false);
    }
  };

  const handleDeleteSport = async (sport) => {
    if (!window.confirm(`Delete "${sport.title}"?`)) return;
    try {
      await API.delete(`/sports/${sport._id}`);
      setSports(sports.filter(s => s._id !== sport._id));
      toast.success('Sports event deleted.');
    } catch {
      toast.error('Failed to delete sports event.');
    }
  };

  // ─── Registration ───────────────────────────────────────────────────────────
  const openRegister = (sport) => {
    setRegisterTarget(sport);
    setRegForm(BLANK_REG_FORM);
    setProofPreview(null);
  };

  const handleRegChange = (e) => setRegForm({ ...regForm, [e.target.name]: e.target.value });

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRegForm({ ...regForm, paymentProof: file });
      setProofPreview(file.name);
    }
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReg(true);
    try {
      const fd = new FormData();
      fd.append('teamName', regForm.teamName);
      fd.append('captainName', regForm.captainName);
      fd.append('captainContact', regForm.captainContact);
      fd.append('course', regForm.course);
      fd.append('year', regForm.year);
      if (regForm.paymentProof) fd.append('paymentProof', regForm.paymentProof);

      await API.post(`/sports/${registerTarget._id}/register`, fd);
      // Mark as registered locally
      setSports(sports.map(s =>
        s._id === registerTarget._id ? { ...s, hasRegistered: true, registrationCount: s.registrationCount + 1 } : s
      ));
      setRegisterTarget(null);
      toast.success('Registered successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed.');
    } finally {
      setSubmittingReg(false);
    }
  };

  // ─── View Registrations ─────────────────────────────────────────────────────
  const openRegistrations = async (sport) => {
    setRegsTarget(sport);
    setLoadingRegs(true);
    try {
      const { data } = await API.get(`/sports/${sport._id}/registrations`);
      setRegistrations(data.data || []);
    } catch {
      toast.error('Failed to load registrations.');
    } finally {
      setLoadingRegs(false);
    }
  };

  const handleUpdateStatus = async (sportId, regId, status) => {
    try {
      await API.patch(`/sports/${sportId}/registrations/${regId}`, { status });
      setRegistrations(regs => regs.map(r => r._id === regId ? { ...r, status } : r));
      toast.success(`Status updated to ${status}.`);
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const isOrganizer = (sport) => String(sport.organizer?.user) === String(currentUserId);
  const canManage = (sport) => isOrganizer(sport) || currentUser.isAdmin;

  const filteredSports = filterType === 'all'
    ? sports
    : sports.filter(s => s.sportType === filterType);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const statusIcon = (status) => {
    if (status === 'approved') return <FaCheckCircle className="text-green-500" />;
    if (status === 'rejected') return <FaTimesCircle className="text-red-500" />;
    return <FaHourglassHalf className="text-amber-500" />;
  };

  const INPUT = "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white dark:bg-slate-700 dark:text-white text-sm";
  const LABEL = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans transition-colors duration-300">
      <SEOHead {...SEO.sports(selectedCollege)} />
      <Navbar />

      {/* HERO */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-center shadow-lg border-b border-amber-700/30">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center justify-center gap-3">
          <FaTrophy className="text-amber-400" /> Campus Sports
        </h1>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Register for sports tournaments and competitions on your campus.
        </p>
      </div>

      {/* CONTROLS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Sport type filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${filterType === 'all' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
          >All</button>
          {SPORT_TYPES.map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${filterType === t ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
            >{t}</button>
          ))}
        </div>
        <button
          onClick={openCreateSport}
          className="flex items-center px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full font-bold shadow-md transition transform hover:-translate-y-0.5 flex-shrink-0"
        >
          <FaPlus className="mr-2" /> Create Sport Event
        </button>
      </div>

      {/* SPORT CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading sports events...</div>
        ) : filteredSports.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <FaTrophy className="text-4xl text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No sports events found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Create one to get started!</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSports.map(sport => (
              <div key={sport._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 mb-1 inline-block">{sport.sportType}</span>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{sport.title}</h3>
                    </div>
                    {canManage(sport) && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditSport(sport)} className="p-1.5 text-gray-400 hover:text-amber-500 transition rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Edit">
                          <FaEdit size={13} />
                        </button>
                        <button onClick={() => handleDeleteSport(sport)} className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-md hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                          <FaTrashAlt size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {sport.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{sport.description}</p>
                  )}

                  <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-2"><FaMapMarkerAlt className="text-amber-500 flex-shrink-0" /><span>{sport.venue}</span></div>
                    <div className="flex items-center gap-2"><FaCalendarAlt className="text-amber-500 flex-shrink-0" /><span>Event: {formatDate(sport.eventDate)}</span></div>
                    <div className="flex items-center gap-2"><FaCalendarAlt className="text-amber-500 flex-shrink-0" /><span>Deadline: {formatDate(sport.lastRegistrationDate)}</span></div>
                    <div className="flex items-center gap-2"><FaUsers className="text-amber-500 flex-shrink-0" /><span>Team size: {sport.teamSize} · {sport.registrationCount} registered</span></div>
                    <div className="flex items-center gap-2">
                      <FaRupeeSign className="text-amber-500 flex-shrink-0" />
                      <span>{sport.registrationFee > 0 ? `₹${sport.registrationFee} fee` : 'Free'}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 flex-wrap">
                    {!sport.isOpen || new Date(sport.lastRegistrationDate) < new Date() ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Registration Closed</span>
                    ) : sport.hasRegistered ? (
                      <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <FaCheckCircle /> Registered
                      </span>
                    ) : (
                      <button
                        onClick={() => openRegister(sport)}
                        className="text-sm font-bold px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition"
                      >
                        Register
                      </button>
                    )}

                    {canManage(sport) && (
                      <button
                        onClick={() => openRegistrations(sport)}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
                      >
                        <FaClipboardList size={11} /> View Registrations
                      </button>
                    )}

                    {sport.qrCodeUrl && (
                      <a href={sport.qrCodeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-amber-600 flex items-center gap-1" title="Payment QR">
                        <FaQrcode /> QR
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CREATE SPORT MODAL ── */}
      {isSportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-700/50 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400">
                {editSportTarget ? 'Edit Sports Event' : 'Create Sports Event'}
              </h3>
              <button onClick={() => { setIsSportModalOpen(false); setEditSportTarget(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><FaTimes size={20} /></button>
            </div>
            <form onSubmit={handleSportSubmit} className="p-6 space-y-4">
              <div>
                <label className={LABEL}>Title *</label>
                <input required type="text" name="title" value={sportForm.title} onChange={handleSportChange} placeholder="e.g. Inter-Hostel Cricket Tournament" className={INPUT} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Sport Type *</label>
                  <select required name="sportType" value={sportForm.sportType} onChange={handleSportChange} className={INPUT}>
                    {SPORT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Venue *</label>
                  <input required type="text" name="venue" value={sportForm.venue} onChange={handleSportChange} placeholder="e.g. Sports Ground" className={INPUT} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Event Date *</label>
                  <input
                    required type="date" name="eventDate"
                    value={sportForm.eventDate} onChange={handleSportChange}
                    min={today}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Reg. Deadline *</label>
                  <input
                    required type="date" name="lastRegistrationDate"
                    value={sportForm.lastRegistrationDate} onChange={handleSportChange}
                    min={today}
                    max={sportForm.eventDate || undefined}
                    disabled={!sportForm.eventDate}
                    title={!sportForm.eventDate ? 'Select event date first' : ''}
                    className={`${INPUT} ${!sportForm.eventDate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {sportForm.eventDate && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Must be on or before {new Date(sportForm.eventDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={LABEL}>Team Size</label>
                  <input type="number" name="teamSize" value={sportForm.teamSize} min="1" onChange={handleSportChange} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Max Teams</label>
                  <input type="number" name="maxTeams" value={sportForm.maxTeams} min="1" onChange={handleSportChange} placeholder="∞" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Fee (₹)</label>
                  <input type="number" name="registrationFee" value={sportForm.registrationFee} min="0" onChange={handleSportChange} className={INPUT} />
                </div>
              </div>

              <div>
                <label className={LABEL}>Organizer Phone</label>
                <input type="text" name="organizerPhone" value={sportForm.organizerPhone} onChange={handleSportChange} placeholder="+91..." className={INPUT} />
              </div>

              <div>
                <label className={LABEL}>Rules / Description</label>
                <textarea name="rules" rows="3" value={sportForm.rules} onChange={handleSportChange} placeholder="Event rules and details..." className={INPUT} />
              </div>

              {/* QR Code upload */}
              <div>
                <label className={LABEL}>Payment QR Code (optional)</label>
                <div className="border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg p-4 text-center cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10 relative">
                  <input type="file" accept="image/*" onChange={handleQrUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {qrPreview ? (
                    <img src={qrPreview} alt="QR Preview" className="h-24 mx-auto object-contain rounded" />
                  ) : (
                    <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center gap-1">
                      <FaQrcode size={28} />
                      <span className="text-xs">Upload payment QR image</span>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={submittingSport} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold shadow-md hover:from-amber-600 hover:to-orange-600 transition flex items-center justify-center">
                {submittingSport
                  ? <><FaSpinner className="animate-spin mr-2" /> {editSportTarget ? 'Saving...' : 'Creating...'}</>
                  : editSportTarget ? 'Save Changes' : 'Create Sports Event'
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── REGISTER MODAL ── */}
      {registerTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-700/50 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
              <div>
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400">
                  Register for {registerTarget.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Team size: {registerTarget.teamSize}</p>
              </div>
              <button onClick={() => setRegisterTarget(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><FaTimes size={20} /></button>
            </div>

            {registerTarget.qrCodeUrl && registerTarget.registrationFee > 0 && (
              <div className="mx-6 mt-5 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">Pay ₹{registerTarget.registrationFee} via QR</p>
                <img src={registerTarget.qrCodeUrl} alt="Payment QR" className="h-36 mx-auto object-contain rounded" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Upload proof after payment</p>
              </div>
            )}

            <form onSubmit={handleRegSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Team Name *</label>
                  <input required type="text" name="teamName" value={regForm.teamName} onChange={handleRegChange} placeholder="Team Alpha" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Captain Name *</label>
                  <input required type="text" name="captainName" value={regForm.captainName} onChange={handleRegChange} placeholder="Your name" className={INPUT} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Captain Contact *</label>
                  <input required type="text" name="captainContact" value={regForm.captainContact} onChange={handleRegChange} placeholder="+91..." className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Course *</label>
                  <input required type="text" name="course" value={regForm.course} onChange={handleRegChange} placeholder="B.Tech CSE" className={INPUT} />
                </div>
              </div>

              <div>
                <label className={LABEL}>Year *</label>
                <select required name="year" value={regForm.year} onChange={handleRegChange} className={INPUT}>
                  {YEARS.map(y => <option key={y} value={y}>{y} Year</option>)}
                </select>
              </div>

              {registerTarget.registrationFee > 0 && (
                <div>
                  <label className={LABEL}>Payment Proof *</label>
                  <div className="border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg p-4 text-center cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10 relative">
                    <input type="file" accept="image/*,application/pdf" onChange={handleProofUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {proofPreview ? (
                      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                        <FaFileAlt /> <span className="text-sm font-medium">{proofPreview}</span>
                      </div>
                    ) : (
                      <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center gap-1">
                        <FaUpload size={22} />
                        <span className="text-xs">Upload screenshot or PDF</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button type="submit" disabled={submittingReg} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold shadow-md hover:from-amber-600 hover:to-orange-600 transition flex items-center justify-center">
                {submittingReg ? <><FaSpinner className="animate-spin mr-2" /> Registering...</> : 'Submit Registration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── REGISTRATIONS VIEWER ── */}
      {regsTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registrations — {regsTarget.title}</h3>
              <button onClick={() => setRegsTarget(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><FaTimes size={20} /></button>
            </div>
            <div className="p-6">
              {loadingRegs ? (
                <div className="text-center py-8 text-gray-500"><FaSpinner className="animate-spin mx-auto text-2xl mb-2" /> Loading...</div>
              ) : registrations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No registrations yet.</p>
              ) : (
                <div className="space-y-3">
                  {registrations.map(reg => (
                    <div key={reg._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{reg.teamName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Captain: {reg.captainName} · {reg.captainContact}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{reg.course} · {reg.year} Year</p>
                          {reg.registeredBy?.name && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">By: {reg.registeredBy.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {statusIcon(reg.status)}
                          <select
                            value={reg.status}
                            onChange={e => handleUpdateStatus(regsTarget._id, reg._id, e.target.value)}
                            className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 dark:text-white focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                      {reg.paymentProofUrl && (
                        <a href={reg.paymentProofUrl} target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold">
                          <FaFileAlt /> View Payment Proof
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sports;
