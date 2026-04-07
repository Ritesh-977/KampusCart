import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FaSearch, FaUserCircle, FaHistory, FaTrashAlt,
  FaHeart, FaPlus, FaSignOutAlt, FaUser, FaList, FaBullhorn,
  FaCommentDots, FaTimes, FaUserShield, FaUniversity, FaExchangeAlt, FaBars,
  FaCalendarCheck, FaTrophy, FaBook, FaStore, FaThLarge, FaChevronDown,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import API from '../api/axios';
import io from 'socket.io-client';
import { useCollege } from '../context/CollegeContext';

const ENDPOINT = import.meta.env.VITE_SERVER_URL;

// Campus features shown in the waffle menu grid
const CAMPUS_FEATURES = [
  { to: '/browse',          icon: FaStore,         label: 'Browse',       color: 'from-purple-500 to-indigo-500', bg: 'bg-purple-50 dark:bg-purple-900/20', ring: 'ring-purple-200 dark:ring-purple-800' },
  { to: '/lost-and-found',  icon: FaBullhorn,      label: 'Lost & Found', color: 'from-cyan-500 to-sky-500',      bg: 'bg-cyan-50 dark:bg-cyan-900/20',     ring: 'ring-cyan-200 dark:ring-cyan-800' },
  { to: '/events',          icon: FaCalendarCheck, label: 'Events',       color: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', ring: 'ring-indigo-200 dark:ring-indigo-800' },
  { to: '/sports',          icon: FaTrophy,        label: 'Sports',       color: 'from-amber-500 to-orange-500',  bg: 'bg-amber-50 dark:bg-amber-900/20',   ring: 'ring-amber-200 dark:ring-amber-800' },
  { to: '/study-materials', icon: FaBook,          label: 'Study',        color: 'from-teal-500 to-emerald-500',  bg: 'bg-teal-50 dark:bg-teal-900/20',     ring: 'ring-teal-200 dark:ring-teal-800' },
];

const Navbar = () => {
  const [isProfileOpen, setIsProfileOpen]   = useState(false);
  const [isCampusMenuOpen, setIsCampusMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [searchTerm, setSearchTerm]   = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [history, setHistory] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const { selectedCollege, clearCollege } = useCollege();
  const navigate  = useNavigate();
  const location  = useLocation();

  const profileRef    = useRef(null);
  const campusMenuRef = useRef(null);

  const user       = JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('userInfo'));
  const isLoggedIn = !!user;

  // Close menus on route change
  useEffect(() => {
    setIsProfileOpen(false);
    setIsCampusMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target))   setIsProfileOpen(false);
      if (campusMenuRef.current && !campusMenuRef.current.contains(e.target)) setIsCampusMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Unread chat count + socket
  useEffect(() => {
    if (!user) return;
    const fetchUnreadCount = async () => {
      try {
        const { data } = await API.get('/chat');
        const currentUserId = user._id || user.id;
        const count = data.reduce((acc, chat) => {
          if (!chat.latestMessage) return acc;
          const senderId = chat.latestMessage.sender._id || chat.latestMessage.sender;
          if (String(senderId) === String(currentUserId)) return acc;
          const readBy = chat.latestMessage.readBy || [];
          if (!readBy.some(id => String(id) === String(currentUserId))) return acc + 1;
          return acc;
        }, 0);
        setUnreadChatCount(count);
      } catch { /* ignore */ }
    };
    fetchUnreadCount();
    const socket = io(ENDPOINT);
    socket.emit('setup', user);
    socket.on('message received', fetchUnreadCount);
    const handleChatRead = () => fetchUnreadCount();
    window.addEventListener('chatRead', handleChatRead);
    return () => { socket.disconnect(); window.removeEventListener('chatRead', handleChatRead); };
  }, [user && (user._id || user.id)]);

  // Live search
  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchTerm.trim().length > 0) {
        try {
          const params = { search: searchTerm };
          if (selectedCollege?.name) params.college = selectedCollege.name;
          const { data } = await API.get('/items', { params });
          setSuggestions(Array.isArray(data) ? data.slice(0, 6) : []);
          setShowDropdown(true);
        } catch { setSuggestions([]); }
      } else { setSuggestions([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, selectedCollege]);

  const handleLogout = async () => {
    try {
      await API.get('/auth/logout');
    } catch { /* ignore */ } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userInfo');
      toast.success('Logged out successfully!');
      navigate('/login');
    }
  };

  const handleSwitchCampus = () => {
    setIsProfileOpen(false);
    clearCollege();
    navigate('/select-college');
  };

  const handleFullSearch = (e) => {
    if (e) e.preventDefault();
    if (searchTerm.trim()) {
      saveHistory(searchTerm.trim());
      navigate(`/browse?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/browse');
    }
    setShowDropdown(false);
  };

  const saveHistory = (term) => {
    const existing = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const updated  = [term, ...existing.filter(t => t !== term)].slice(0, 5);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
    setHistory(updated);
  };

  const handleDeleteHistoryItem = (e, term) => {
    e.preventDefault(); e.stopPropagation();
    const updated = history.filter(t => t !== term);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
    setHistory(updated);
  };

  const handleClearAllHistory = (e) => {
    e.preventDefault();
    localStorage.removeItem('searchHistory');
    setHistory([]);
  };

  const handleFocus = () => {
    const saved = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setHistory(saved);
    setShowDropdown(true);
  };

  // ── SUB-COMPONENTS ──────────────────────────────────────────────────────────

  const SearchDropdown = () => (
    <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[100] overflow-hidden">
      {searchTerm.trim().length > 0 && suggestions.length > 0 ? (
        <div className="py-2">
          {suggestions.map(item => (
            <button key={item._id}
              onMouseDown={() => { saveHistory(item.title); navigate(`/item/${item._id}`); }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition border-b border-gray-100 dark:border-gray-700 last:border-none"
            >
              <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 mr-3 border border-gray-200 dark:border-gray-600">
                {item.images?.[0]
                  ? <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                  : <img src="/logo.png" alt="" className="h-full w-full p-2 object-contain opacity-40 grayscale" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 font-semibold line-clamp-1">{item.title}</p>
                {item.category && <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">in {item.category}</p>}
              </div>
            </button>
          ))}
          <button onMouseDown={handleFullSearch} className="w-full text-center py-2.5 text-sm text-indigo-700 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            See all results for "{searchTerm}"
          </button>
        </div>
      ) : history.length > 0 && searchTerm.trim().length === 0 ? (
        <div className="py-2">
          <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Recent</p>
          {history.map((term, i) => (
            <div key={i} className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 group border-b border-gray-50 dark:border-gray-700 last:border-none">
              <button onMouseDown={() => { setSearchTerm(term); navigate(`/browse?search=${encodeURIComponent(term)}`); }}
                className="flex-grow text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-300 flex items-center">
                <FaHistory className="mr-3 text-gray-300 text-xs group-hover:text-indigo-400 transition-colors" />{term}
              </button>
              <button onMouseDown={e => handleDeleteHistoryItem(e, term)} className="px-3 py-2 text-gray-300 hover:text-red-500 transition-colors">
                <FaTimes size={11} />
              </button>
            </div>
          ))}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <span className="text-xs text-gray-400 italic">Saved locally</span>
            <button onMouseDown={handleClearAllHistory} className="text-[10px] font-bold text-gray-500 hover:text-red-600 flex items-center uppercase tracking-wide">
              <FaTrashAlt className="mr-1" /> Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  // Waffle / Campus Menu popup
  const CampusMenu = () => {
    const visibleFeatures = CAMPUS_FEATURES.filter(f => !f.authOnly || isLoggedIn);
    return (
      <div className="absolute right-0 top-full mt-3 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Campus Features</p>
        </div>
        {/* Grid */}
        <div className="p-3 grid grid-cols-3 gap-2">
          {visibleFeatures.map(({ to, icon: Icon, label, color, bg, ring }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to} to={to}
                onClick={() => setIsCampusMenuOpen(false)}
                className={`group flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-150 hover:scale-[1.04] ${isActive ? `${bg} ring-1 ${ring}` : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                  <Icon className="text-white text-base" />
                </div>
                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white text-center leading-tight transition-colors">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  // Profile dropdown
  const ProfileMenu = () => (
    <div className="absolute right-0 top-full mt-3 w-60 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
      {/* User info header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center gap-3">
          {user?.profilePic
            ? <img className="h-9 w-9 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-700" src={user.profilePic} alt="" />
            : <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
          }
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      <div className="py-1.5">
        <Link to="/profile" onClick={() => setIsProfileOpen(false)}
          className="group flex items-center px-5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <FaUser className="mr-3 text-gray-400 group-hover:text-indigo-500 transition-colors text-sm" /> Your Profile
        </Link>

        <Link to="/my-listings" onClick={() => setIsProfileOpen(false)}
          className="group flex items-center px-5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <FaList className="mr-3 text-gray-400 group-hover:text-indigo-500 transition-colors text-sm" /> My Listings
        </Link>

        <Link to="/wishlist" onClick={() => setIsProfileOpen(false)}
          className="group flex items-center px-5 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <FaHeart className="mr-3 text-gray-400 group-hover:text-rose-500 transition-colors text-sm" /> Wishlist
        </Link>

        {user?.isAdmin && (
          <Link to="/admin" onClick={() => setIsProfileOpen(false)}
            className="group flex items-center px-5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 font-semibold transition-colors">
            <FaUserShield className="mr-3 text-red-400 text-sm" /> Admin Panel
          </Link>
        )}

        <button onClick={handleSwitchCampus}
          className="w-full text-left group flex items-center px-5 py-2.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
          <FaExchangeAlt className="mr-3 text-indigo-400 text-sm" />
          Switch Campus
          {selectedCollege && (
            <span className="ml-auto text-[10px] font-bold text-gray-400 dark:text-gray-500 truncate max-w-[60px]">{selectedCollege.shortName}</span>
          )}
        </button>

        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

        <button onClick={handleLogout}
          className="w-full text-left group flex items-center px-5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <FaSignOutAlt className="mr-3 text-red-400 text-sm" /> Sign out
        </button>
      </div>
    </div>
  );

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 border-b border-cyan-700/30 dark:border-cyan-700/20 sticky top-0 z-50 shadow-lg shadow-cyan-500/10">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[95rem] mx-auto">
        <div className="flex h-16 items-center gap-3">

          {/* ── LOGO ── */}
          <div className="flex-shrink-0 flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.png" alt="KampusCart" className="h-9 w-9 object-contain" />
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent hidden sm:block">
              kampusCart
            </span>
            {selectedCollege && (
              <button
                onClick={e => { e.stopPropagation(); handleSwitchCampus(); }}
                className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all hover:opacity-75"
                style={{
                  background: `${selectedCollege.theme.primary}18`,
                  color: selectedCollege.theme.primary,
                  borderColor: `${selectedCollege.theme.primary}45`,
                }}
                title="Switch campus"
              >
                <FaUniversity className="text-[9px]" />
                <span className="max-w-[72px] truncate">{selectedCollege.shortName}</span>
              </button>
            )}
          </div>

          {/* ── SEARCH BAR (desktop) ── */}
          <div className="flex-1 mx-3 hidden md:block relative max-w-sm">
            <form onSubmit={handleFullSearch}>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                <input
                  type="text" value={searchTerm}
                  onFocus={handleFocus}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search for items..."
                  autoComplete="off"
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-800 dark:bg-slate-800 border border-slate-700 dark:border-slate-700 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
                {searchTerm && (
                  <button type="button" onClick={() => { setSearchTerm(''); setSuggestions([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                    <FaTimes size={13} />
                  </button>
                )}
              </div>
            </form>
            {showDropdown && <SearchDropdown />}
          </div>

          {/* ── RIGHT ACTIONS ── */}
          <div className="flex items-center gap-3 ml-auto">

            {/* Campus Features waffle menu */}
            <div className="relative" ref={campusMenuRef}>
              <button
                onClick={() => { setIsCampusMenuOpen(p => !p); setIsProfileOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isCampusMenuOpen
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="Campus features"
              >
                <FaThLarge className="text-base" />
                <span className="hidden lg:block">Campus</span>
                <FaChevronDown className={`text-[10px] text-slate-400 transition-transform duration-200 ${isCampusMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCampusMenuOpen && <CampusMenu />}
            </div>

            {/* Separator */}
            <div className="h-5 w-px bg-slate-700" />

            {/* Chats (with unread badge) */}
            {isLoggedIn && (
              <Link to="/chats" className="relative p-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-all group" title="Chats">
                <FaCommentDots className="text-lg group-hover:scale-110 transition-transform" />
                {unreadChatCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-slate-900">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </Link>
            )}

            {/* Sell Item CTA */}
            <Link
              to="/sell"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-md hover:shadow-cyan-500/30 transition-all transform hover:-translate-y-px"
            >
              <FaPlus className="text-xs" />
              <span className="hidden md:block">Sell</span>
            </Link>

            {/* Separator */}
            <div className="h-6 w-px bg-slate-700 mx-0.5 hidden sm:block" />

            {/* ── AUTH ── */}
            {isLoggedIn ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setIsProfileOpen(p => !p); setIsCampusMenuOpen(false); }}
                  className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl transition-all ${
                    isProfileOpen ? 'bg-slate-700' : 'hover:bg-slate-800'
                  }`}
                >
                  {user?.profilePic
                    ? <img className="h-8 w-8 rounded-full object-cover border-2 border-slate-600" src={user.profilePic} alt="" />
                    : <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                  }
                  <span className="hidden lg:block text-sm font-semibold text-slate-200 max-w-[80px] truncate">
                    {user?.name?.split(' ')[0] || 'User'}
                  </span>
                  <FaChevronDown className={`text-[10px] text-slate-400 transition-transform duration-200 hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>
                {isProfileOpen && <ProfileMenu />}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="hidden sm:block text-slate-300 hover:text-white font-semibold text-sm px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors whitespace-nowrap">
                  Log in
                </Link>
                <Link to="/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-colors whitespace-nowrap">
                  Sign up
                </Link>
                {/* Mobile hamburger (unauthenticated) */}
                <button
                  onClick={() => setIsMobileMenuOpen(p => !p)}
                  className="sm:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE SEARCH BAR ── */}
      <div className="md:hidden px-4 pb-3 pt-1 relative">
        <form onSubmit={handleFullSearch} className="relative">
          <FaSearch className="absolute left-3 top-3.5 text-slate-400 text-sm" />
          <input
            type="text" value={searchTerm}
            onFocus={handleFocus}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-700 rounded-xl bg-slate-800 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </form>
        {showDropdown && <SearchDropdown />}
      </div>

      {/* ── UNAUTHENTICATED MOBILE MENU ── */}
      {!isLoggedIn && isMobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-2">
          <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors">
            Create Account
          </Link>
          <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center w-full py-3 border-2 border-slate-700 hover:border-indigo-500 text-slate-200 font-bold rounded-xl text-sm transition-colors">
            Log in
          </Link>
          <button onClick={() => { setIsMobileMenuOpen(false); handleSwitchCampus(); }}
            className="flex items-center justify-center gap-2 w-full py-3 text-slate-400 hover:text-indigo-400 font-medium rounded-xl text-sm transition-colors">
            <FaExchangeAlt className="text-xs" />
            Switch Campus
            {selectedCollege && (
              <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${selectedCollege.theme.primary}20`, color: selectedCollege.theme.primary }}>
                {selectedCollege.shortName}
              </span>
            )}
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
