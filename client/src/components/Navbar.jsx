import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { unsubscribeFromPush } from '../utils/pushSubscription';
import {
  FaSearch, FaUserCircle,
  FaHeart, FaPlus, FaSignOutAlt, FaUser, FaList, FaBullhorn,
  FaCommentDots, FaTimes, FaUserShield, FaUniversity, FaBars,
  FaCalendarCheck, FaTrophy, FaBook, FaStore, FaThLarge, FaChevronDown, FaBell,
  FaSun, FaMoon,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import API from '../api/axios';
import io from 'socket.io-client';
import { useCollege } from '../context/CollegeContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import NotificationDropdown from './NotificationDropdown';

const ENDPOINT = import.meta.env.VITE_SERVER_URL;

// Campus features shown in the waffle menu grid
const CAMPUS_FEATURES = [
  { to: '/browse', icon: FaStore, label: 'Browse', color: 'from-cat-browse to-cat-events', bg: 'bg-cat-browse/10', ring: 'ring-cat-browse/30' },
  { to: '/lost-and-found', icon: FaBullhorn, label: 'Lost & Found', color: 'from-cat-lost to-info', bg: 'bg-cat-lost/10', ring: 'ring-cat-lost/30' },
  { to: '/events', icon: FaCalendarCheck, label: 'Events', color: 'from-cat-events to-cat-browse', bg: 'bg-cat-events/10', ring: 'ring-cat-events/30' },
  { to: '/sports', icon: FaTrophy, label: 'Sports', color: 'from-cat-sports to-warning', bg: 'bg-cat-sports/10', ring: 'ring-cat-sports/30' },
  { to: '/study-materials', icon: FaBook, label: 'Study', color: 'from-cat-study to-primary', bg: 'bg-cat-study/10', ring: 'ring-cat-study/30' },
];

const Navbar = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCampusMenuOpen, setIsCampusMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('search') || '';
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const isFocused = useRef(false);

  const { selectedCollege } = useCollege();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const profileRef = useRef(null);
  const campusMenuRef = useRef(null);
  const notificationRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(() => {
    return JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('userInfo')) || null;
  });
  const user = currentUser;
  const isLoggedIn = !!user;
  const { unreadCount } = useNotifications();

  // Listen for user profile updates from UserProfile or other components
  useEffect(() => {
    const handleUserSync = () => {
      const freshUser = JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('userInfo')) || null;
      setCurrentUser(freshUser);
    };
    window.addEventListener('userUpdated', handleUserSync);
    window.addEventListener('storage', handleUserSync);
    return () => {
      window.removeEventListener('userUpdated', handleUserSync);
      window.removeEventListener('storage', handleUserSync);
    };
  }, []);

  // Sync search input with URL on route changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('search') || '');
  }, [location.pathname, location.search]);

  // Close menus on route change
  useEffect(() => {
    setIsProfileOpen(false);
    setIsCampusMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsNotificationOpen(false);
  }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false);
      if (campusMenuRef.current && !campusMenuRef.current.contains(e.target)) setIsCampusMenuOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setIsNotificationOpen(false);
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

    // ── In-app notification banners ──────────────────────────────────────────
    // Direct message notifications removed (handled by unread badge only)
    socket.on('notification', fetchUnreadCount);

    // Campus-wide broadcasts (new listing, event, sport, lost & found)
    socket.on('campus_notification', ({ title, body, excludeUserId }) => {
      const currentUserId = String(user._id || user.id);
      if (excludeUserId && currentUserId === excludeUserId) return;
      toast.info(`${title}: ${body}`, {
        position: 'top-right',
        autoClose: 5000,
        toastId: `campus-${Date.now()}`,
      });
    });
    // ─────────────────────────────────────────────────────────────────────────

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
          if (isFocused.current) setShowDropdown(true);
        } catch { setSuggestions([]); setShowDropdown(false); }
      } else { setSuggestions([]); setShowDropdown(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, selectedCollege]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const syncProfile = async () => {
      try {
        const { data } = await API.get('/users/profile');

        // Check which key you are using
        const storageKey = localStorage.getItem('userInfo') ? 'userInfo' : 'user';
        const localData = JSON.parse(localStorage.getItem(storageKey) || '{}');

        // Merge the fresh DB data into localStorage
        const updatedUser = { ...localData, ...data };
        localStorage.setItem(storageKey, JSON.stringify(updatedUser));

        // Update the Navbar state
        setCurrentUser(updatedUser);

        // Tell other components (like the Profile page) to update too
        window.dispatchEvent(new Event('userUpdated'));
      } catch (error) {
        console.error("Failed to background sync profile:", error);
      }
    };

    syncProfile();
  }, [isLoggedIn]);

  const handleLogout = async () => {
    unsubscribeFromPush().catch(() => { });
    try {
      await API.get('/auth/logout');
    } catch { /* ignore */ } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userInfo');

      // Dispatch custom event to notify NotificationContext
      window.dispatchEvent(new Event('user-logout'));

      toast.success('Logged out successfully!');
      navigate('/login');
    }
  };

  // const handleSwitchCampus = () => {
  //   setIsProfileOpen(false);
  //   clearCollege();
  //   navigate('/select-college');
  // };

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
    const updated = [term, ...existing.filter(t => t !== term)].slice(0, 5);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
  };

  const handleFocus = () => {
    isFocused.current = true;
    if (searchTerm.trim().length > 0) setShowDropdown(true);
  };

  // ── SUB-COMPONENTS ──────────────────────────────────────────────────────────

  const SearchDropdown = () => (
    <div className="absolute top-full left-0 mt-1 w-full bg-surface rounded-xl shadow-2xl border border-border z-[100] overflow-hidden">
      {suggestions.length > 0 ? (
        <div className="py-2">
          {suggestions.map(item => (
            <button key={item._id}
              onMouseDown={() => { saveHistory(item.title); navigate(`/item/${item._id}`); }}
              className="w-full text-left px-4 py-3 hover:bg-surface-2 dark:hover:bg-surface-muted flex items-center transition border-b border-border last:border-none"
            >
              <div className="h-12 w-12 rounded-lg bg-surface-muted overflow-hidden flex-shrink-0 mr-3 border border-border">
                {item.images?.[0]
                  ? <img src={item.images[0]?.url || item.images[0]} alt="" className="h-full w-full object-cover" />
                  : <img src="/logo.png" alt="" className="h-full w-full p-2 object-contain opacity-40 grayscale" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm text-foreground font-semibold line-clamp-1">{item.title}</p>
                {item.category && <p className="text-xs text-primary mt-0.5">in {item.category}</p>}
              </div>
            </button>
          ))}
          <button onMouseDown={handleFullSearch} className="w-full text-center py-2.5 text-sm text-primary font-bold hover:bg-primary-muted dark:hover:bg-surface-muted border-t border-border bg-surface-2">
            See all results for "{searchTerm}"
          </button>
        </div>
      ) : null}
    </div>
  );

  // Waffle / Campus Menu popup
  // Waffle / Campus Menu popup
  const CampusMenu = () => {
    const visibleFeatures = CAMPUS_FEATURES.filter(f => !f.authOnly || isLoggedIn);
    return (
      <div className="fixed top-[4.5rem] left-1/2 -translate-x-1/2 sm:absolute sm:top-full sm:left-auto sm:translate-x-0 sm:right-0 sm:mt-3 w-[92vw] sm:w-72 bg-surface rounded-2xl shadow-2xl border border-border z-50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-surface-muted to-surface-muted  ">
          <p className="text-xs font-bold text-subtle uppercase tracking-widest">Campus Features</p>
        </div>
        {/* Grid */}
        <div className="p-3 grid grid-cols-3 gap-2">
          {visibleFeatures.map(({ to, icon: Icon, label, color, bg, ring }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to} to={to}
                onClick={() => setIsCampusMenuOpen(false)}
                className={`group flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-150 hover:scale-[1.04] ${isActive ? `${bg} ring-1 ${ring}` : 'hover:bg-surface-2 dark:hover:bg-surface-muted'}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                  <Icon className="text-white text-base" />
                </div>
                <span className="text-[11px] font-semibold text-muted group-hover:text-foreground dark:group-hover:text-white text-center leading-tight transition-colors">
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
    <div className="absolute right-0 top-full mt-3 w-60 bg-surface rounded-2xl shadow-2xl border border-border z-50 overflow-hidden">
      {/* User info header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-br from-primary-muted to-white  ">
        <div className="flex items-center gap-3">
          {user?.profilePic
            ? <img className="h-9 w-9 rounded-full object-cover border-2 border-primary" src={user.profilePic} alt="" />
            : <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-tertiary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          }
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-primary truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      <div className="py-1.5">
        <Link to="/profile" onClick={() => setIsProfileOpen(false)}
          className="group flex items-center px-5 py-2.5 text-sm text-muted hover:bg-surface-2 dark:hover:bg-surface-muted transition-colors">
          <FaUser className="mr-3 text-subtle group-hover:text-primary transition-colors text-sm" /> Your Profile
        </Link>

        <Link to="/my-listings" onClick={() => setIsProfileOpen(false)}
          className="group flex items-center px-5 py-2.5 text-sm text-muted hover:bg-surface-2 dark:hover:bg-surface-muted transition-colors">
          <FaList className="mr-3 text-subtle group-hover:text-primary transition-colors text-sm" /> My Listings
        </Link>

        <Link to="/wishlist" onClick={() => setIsProfileOpen(false)}
          className="group flex items-center px-5 py-2.5 text-sm text-muted hover:bg-surface-2 dark:hover:bg-surface-muted transition-colors">
          <FaHeart className="mr-3 text-subtle group-hover:text-danger transition-colors text-sm" /> Wishlist
        </Link>

        {user?.isAdmin && (
          <Link to="/admin" onClick={() => setIsProfileOpen(false)}
            className="group flex items-center px-5 py-2.5 text-sm text-danger hover:bg-danger-muted dark:hover:bg-danger/10 font-semibold transition-colors">
            <FaUserShield className="mr-3 text-danger text-sm" /> Admin Panel
          </Link>
        )}

        {/* Switch Campus button commented out */}
        {/* <button onClick={handleSwitchCampus}
          className="w-full text-left group flex items-center px-5 py-2.5 text-sm text-primary hover:bg-primary-muted dark:hover:bg-primary/20 transition-colors">
          <FaExchangeAlt className="mr-3 text-primary text-sm" />
          Switch Campus
          {selectedCollege && (
            <span className="ml-auto text-[10px] font-bold text-subtle truncate max-w-[60px]">{selectedCollege.shortName}</span>
          )}
        </button> */}

        <div className="my-1 border-t border-border" />

        <button onClick={handleLogout}
          className="w-full text-left group flex items-center px-5 py-2.5 text-sm text-danger hover:bg-danger-muted dark:hover:bg-danger/20 transition-colors">
          <FaSignOutAlt className="mr-3 text-danger text-sm" /> Sign out
        </button>
      </div>
    </div>
  );

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <nav className="bg-gradient-to-r from-surface-inverse via-surface-inverse to-surface-inverse    border-b border-accent/30 sticky top-0 z-50 shadow-lg shadow-accent/10">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[95rem] mx-auto">
        <div className="flex h-16 items-center gap-3">

          {/* ── LOGO ── */}
          <div className="flex-shrink-0 flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.png" alt="KampusCart" className="h-9 w-9 object-contain" />
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-tertiary to-info bg-clip-text text-transparent hidden sm:block">
              KampusCart
            </span>
            {/* College badge commented out */}
            {/* {selectedCollege && (
              <button
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
            )} */}
          </div>

          {/* ── SEARCH BAR (desktop) ── */}
          <div className="flex-1 mx-3 hidden md:block relative max-w-sm">
            <form onSubmit={handleFullSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-subtle" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onFocus={handleFocus}
                onBlur={() => { isFocused.current = false; setShowDropdown(false); }}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search for items..."
                autoComplete="off"
                className="block w-full pl-10 pr-24 py-2.5 bg-surface rounded-full border-none shadow-xl focus:ring-2 focus:ring-primary focus:outline-none text-foreground bg-surface placeholder-subtle text-sm transition-all"
              />
              <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary hover:bg-primary text-white text-sm font-bold rounded-full transition">
                Search
              </button>
            </form>
            {showDropdown && <SearchDropdown />}
          </div>


          {/* ── RIGHT ACTIONS ── */}
          <div className="flex items-center gap-4 sm:gap-4 ml-auto">

            {/* Theme toggle (light / dark) */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 rounded-xl text-inverse-foreground hover:bg-white/10 hover:text-accent transition-all"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {isDark ? <FaSun className="text-lg" /> : <FaMoon className="text-lg" />}
            </button>

            {/* Chats (with unread badge) */}
            {isLoggedIn && (
              <Link to="/chats" className="relative p-2 sm:p-2.5 rounded-xl text-inverse-foreground hover:bg-white/10 hover:text-accent transition-all group" title="Chats">
                <FaCommentDots className="text-lg group-hover:scale-110 transition-transform" />
                {unreadChatCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white ring-2 ring-surface-inverse">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </Link>
            )}

            {/* Sell Item CTA */}
            <Link
              to="/sell"
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-primary hover:from-accent hover:to-primary shadow-md hover:shadow-accent/30 transition-all transform hover:-translate-y-px"
            >
              <FaPlus className="text-xs" />
              <span className="hidden md:block">Sell</span>
            </Link>

            {/* Separator */}
            <div className="h-5 w-px bg-white/15 hidden sm:block mx-1" />

            {/* Campus Features waffle menu */}
            <div className={`relative ${!isLoggedIn ? 'hidden sm:block' : ''}`} ref={campusMenuRef}>
              <button
                onClick={() => { setIsCampusMenuOpen(p => !p); setIsProfileOpen(false); }}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl text-sm font-semibold transition-all ${isCampusMenuOpen
                    ? 'bg-white/10 text-white'
                    : 'text-inverse-foreground hover:bg-white/10 hover:text-white'
                  }`}
                title="Campus features"
              >
                <FaThLarge className="text-base" />
                <span className="hidden lg:block">Campus</span>
                <FaChevronDown className={`text-[10px] text-inverse-muted transition-transform duration-200 hidden sm:block ${isCampusMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCampusMenuOpen && <CampusMenu />}
            </div>

            {/* Notifications Bell */}
            {isLoggedIn && (
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => { setIsNotificationOpen(p => !p); setIsProfileOpen(false); setIsCampusMenuOpen(false); }}
                  className="relative p-2 sm:p-2.5 rounded-xl text-inverse-foreground hover:bg-white/10 hover:text-accent transition-all group"
                  title="Notifications"
                >
                  <FaBell className="text-lg group-hover:scale-110 transition-transform" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white ring-2 ring-surface-inverse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {isNotificationOpen && <NotificationDropdown onClose={() => setIsNotificationOpen(false)} />}
              </div>
            )}

            {/* ── AUTH ── */}
            {isLoggedIn ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setIsProfileOpen(p => !p); setIsCampusMenuOpen(false); }}
                  className={`flex items-center gap-2 pl-1 pr-1 sm:pr-2.5 py-1 rounded-xl transition-all ${isProfileOpen ? 'bg-white/10' : 'hover:bg-white/10'
                    }`}
                >
                  {user?.profilePic
                    ? <img
                      className="h-8 w-8 rounded-full object-cover border-2 border-white/25"
                      src={`${user.profilePic}${user.profilePic.includes('cloudinary') ? `?t=${Date.now()}` : ''}`}
                      alt=""
                    /> : <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-tertiary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  }
                  <span className="hidden lg:block text-sm font-semibold text-inverse-foreground max-w-[80px] truncate">
                    {user?.name?.split(' ')[0] || 'User'}
                  </span>
                  <FaChevronDown className={`text-[10px] text-inverse-muted transition-transform duration-200 hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>
                {isProfileOpen && <ProfileMenu />}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="hidden sm:block text-inverse-foreground hover:text-white font-semibold text-sm px-3 py-2 rounded-xl hover:bg-white/10 transition-colors whitespace-nowrap">
                  Log in
                </Link>
                <Link to="/signup" className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-colors whitespace-nowrap">
                  Sign up
                </Link>
                {/* Mobile hamburger (unauthenticated) */}
                <button
                  onClick={() => setIsMobileMenuOpen(p => !p)}
                  className="sm:hidden p-2 rounded-xl text-inverse-foreground hover:bg-white/10 transition-colors"
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
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-subtle" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onFocus={handleFocus}
            onBlur={() => { isFocused.current = false; setShowDropdown(false); }}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="block w-full pl-10 pr-24 py-3 bg-surface rounded-full border-none shadow-xl focus:ring-2 focus:ring-primary focus:outline-none text-foreground bg-surface placeholder-subtle text-sm transition-all"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary hover:bg-primary text-white text-sm font-bold rounded-full transition">
            Search
          </button>
        </form>
        {showDropdown && <SearchDropdown />}
      </div>

      {/* ── UNAUTHENTICATED MOBILE MENU ── */}
      {!isLoggedIn && isMobileMenuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-surface-inverse px-4 py-3 space-y-2">
          <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center w-full py-3 bg-primary hover:bg-primary text-white font-bold rounded-xl text-sm transition-colors">
            Create Account
          </Link>
          <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center w-full py-3 border-2 border-white/15 hover:border-primary text-inverse-foreground font-bold rounded-xl text-sm transition-colors">
            Log in
          </Link>
          {/* Switch Campus button commented out */}
          {/* <button onClick={() => { setIsMobileMenuOpen(false); handleSwitchCampus(); }}
            className="relative flex items-center justify-center w-full py-3 border border-border-strong hover:border-primary text-subtle hover:text-primary font-semibold rounded-xl text-sm transition-colors">
            
            Switch Campus
            
            <div className="absolute right-4 flex items-center gap-2">
              {selectedCollege && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${selectedCollege.theme.primary}20`, color: selectedCollege.theme.primary }}>
                  {selectedCollege.shortName}
                </span>
              )}
              <FaExchangeAlt className="text-xs opacity-70" />
            </div>
            
          </button> */}
        </div>
      )}
    </nav>
  );
};

export default Navbar;