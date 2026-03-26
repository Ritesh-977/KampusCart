import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaSearch, FaUserCircle, FaStore, FaHistory, FaTrashAlt,
  FaHeart, FaPlus, FaSignOutAlt, FaUser, FaList, FaBullhorn,
  FaCommentDots, FaTimes, FaUserShield, FaUniversity, FaExchangeAlt, FaBars
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import API from '../api/axios';
import io from 'socket.io-client';
import { useCollege } from '../context/CollegeContext';

const ENDPOINT = import.meta.env.VITE_SERVER_URL;

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { selectedCollege, clearCollege } = useCollege();

  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [history, setHistory] = useState([]);

  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const navigate = useNavigate();

  // ✅ FIX 1: Rely on 'user' object, not 'token' string
  const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('userInfo'));
  const isLoggedIn = !!user; // Boolean flag for UI

  // --- 1. NOTIFICATION LOGIC ---
  useEffect(() => {
    if (!user) return;
    const fetchUnreadCount = async () => {
      try {
        const { data } = await API.get("/chat");
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
      } catch (error) { console.error(error); }
    };
    fetchUnreadCount();
    const socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("message received", () => fetchUnreadCount());
    const handleChatRead = () => fetchUnreadCount();
    window.addEventListener("chatRead", handleChatRead);
    return () => { socket.disconnect(); window.removeEventListener("chatRead", handleChatRead); };
  }, [user && (user._id || user.id)]);

  // --- 2. LIVE SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length > 0) {
        try {
          const params = { search: searchTerm };
          if (selectedCollege?.name) params.college = selectedCollege.name;
          const { data } = await API.get('/items', { params });
          setSuggestions(Array.isArray(data) ? data.slice(0, 6) : []);
          setShowDropdown(true);
        } catch (error) {
          console.error("Live search failed", error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedCollege]);

  const handleLogout = async () => {
    try {
      await API.get('/auth/logout');

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userInfo');

      toast.success('Logged out successfully!');
      navigate('/login');

    } catch (error) {
      console.error("Logout failed", error);
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const handleSwitchCampus = () => {
    setIsDropdownOpen(false);
    clearCollege();
    navigate('/select-college');
  };

  const handleFullSearch = (e) => {
    if (e) e.preventDefault();
    if (searchTerm.trim()) {
      saveHistory(searchTerm.trim());
      navigate(`/?search=${searchTerm.trim()}`);
      setShowDropdown(false);
    } else {
      setSearchTerm('');
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setShowDropdown(false);
    }
  };

  const saveHistory = (term) => {
    const existingHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const updatedHistory = [term, ...existingHistory.filter(t => t !== term)].slice(0, 5);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
  };

  const handleDeleteHistoryItem = (e, termToDelete) => {
    e.preventDefault();
    e.stopPropagation();

    const updatedHistory = history.filter(t => t !== termToDelete);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
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

  const NavItem = ({ to, icon: Icon, label, badgeCount }) => (
    <Link to={to} className="relative flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold text-slate-300 dark:text-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 hover:text-cyan-400 dark:hover:text-cyan-400 transition-all group">
      <Icon className="text-lg group-hover:scale-110 transition-transform text-slate-400 dark:text-slate-500 group-hover:text-cyan-400 dark:group-hover:text-cyan-400" />
      <span className="hidden xl:block">{label}</span>
      {badgeCount > 0 && (
        <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-slate-900 dark:ring-slate-950">
          {badgeCount}
        </span>
      )}
    </Link>
  );

  const SearchDropdown = () => (
    <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[100] overflow-hidden">
      {searchTerm.trim().length > 0 && suggestions.length > 0 ? (
        <div className="py-2">
          {suggestions.map((item) => (
            <button
              key={item._id}
              onMouseDown={() => {
                saveHistory(item.title);
                navigate(`/item/${item._id}`);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-start transition border-b border-gray-100 dark:border-gray-700 last:border-none"
            >
              <div className="h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 mr-3 border border-gray-200 dark:border-gray-600">
                {item.images && item.images[0] ? (
                  <img src={item.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <img src="/logo.png" alt="fallback" className="h-full w-full p-2 object-contain opacity-50 grayscale" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium line-clamp-1">{item.title}</p>
                {item.category && (
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">in {item.category}</p>
                )}
              </div>
            </button>
          ))}
          <button
            onMouseDown={handleFullSearch}
            className="w-full text-center py-2.5 text-sm text-indigo-700 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700 block bg-gray-50 dark:bg-gray-800"
          >
            See all results for "{searchTerm}"
          </button>
        </div>
      ) : history.length > 0 && searchTerm.trim().length === 0 ? (
        <div className="py-2">
          <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Searches</p>
          {history.map((term, index) => (
            <div key={index} className="flex items-center w-full hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b border-gray-50 dark:border-gray-700 last:border-none group">
              <button
                onMouseDown={() => {
                  setSearchTerm(term);
                  navigate(`/?search=${term}`);
                }}
                className="flex-grow text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 flex items-center"
              >
                <FaHistory className="mr-3 text-gray-300 text-xs group-hover:text-indigo-400 transition-colors" />
                {term}
              </button>
              <button
                onMouseDown={(e) => handleDeleteHistoryItem(e, term)}
                className="px-4 py-2 text-gray-300 hover:text-red-500 transition-colors focus:outline-none"
                title="Remove from history"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center mt-1">
            <span className="text-xs text-gray-400 italic">History is saved locally</span>
            <button onMouseDown={handleClearAllHistory} className="text-[10px] font-bold text-gray-500 hover:text-red-600 transition flex items-center uppercase tracking-wide">
              <FaTrashAlt className="mr-1.5" /> Clear All
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 border-b border-cyan-700/30 dark:border-cyan-700/20 sticky top-0 z-50 transition-colors duration-200 shadow-lg shadow-cyan-500/10">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[95rem] mx-auto">
        <div className="flex justify-between h-20 items-center gap-2 sm:gap-4">

          {/* Logo + College Badge */}
          <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer min-w-fit" onClick={() => navigate('/')}>
            <div className="flex items-center text-xl sm:text-2xl font-black text-cyan-400 tracking-tight">
              <img
                src="/logo.png"
                alt="KampusCart Logo"
                // Reduced the mr (margin-right) classes here:
                className="h-10 w-10 sm:h-12 sm:w-12 mr-0.5 sm:mr-1 object-contain"
              />
              <span className="dark:text-white">kampus<span className="text-slate-300 dark:text-slate-400">Cart</span></span>
            </div>
            {selectedCollege && (
              <button
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all hover:opacity-75"
                style={{
                  background: `${selectedCollege.theme.primary}15`,
                  color: selectedCollege.theme.primary,
                  borderColor: `${selectedCollege.theme.primary}40`,
                }}
                title="Switch campus"
              >
                <FaUniversity className="text-[10px]" />
                <span className="max-w-[80px] truncate">{selectedCollege.shortName}</span>
              </button>
            )}
          </div>

          {/* --- MIDDLE: SEARCH BAR (Hidden on Mobile) --- */}
          <div className="flex-1 max-w-2xl mx-4 lg:mx-8 hidden md:block relative">
            <form onSubmit={handleFullSearch}>
              <div className="relative z-50">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onFocus={handleFocus}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-700 dark:border-slate-700 rounded-lg leading-5 bg-slate-800 dark:bg-slate-800 text-white dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-slate-800 dark:focus:bg-slate-800 transition-all shadow-sm"
                  placeholder="Search for items..."
                  autoComplete="off"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(''); setSuggestions([]); }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </form>

            {/* --- DROPDOWN (Desktop) --- */}
            {showDropdown && <SearchDropdown />}
          </div>

          {/* 3. RIGHT: Actions */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">

            {/* ✅ FIX 2: Use isLoggedIn boolean */}
            <div className={isLoggedIn ? "flex" : "hidden sm:flex"}>
              <NavItem to="/wishlist" icon={FaHeart} label="Wishlist" />
            </div>

            <NavItem to="/lost-and-found" icon={FaBullhorn} label="Lost & Found" />

            {/* --- ADMIN BUTTON (Desktop) --- */}
            {user && user.isAdmin && (
              <Link
                to="/admin"
                className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 border border-transparent text-sm font-bold rounded-full shadow-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all transform hover:-translate-y-0.5 mx-2"
              >
                <FaUserShield className="text-xs" />
                Admin
              </Link>
            )}

            {/* Sell Button: Desktop Only */}
            <Link
              to="/sell"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 border border-transparent text-sm font-bold rounded-full shadow-lg text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 transition-all transform hover:-translate-y-0.5 mx-2"
            >
              <FaPlus className="text-xs" />
              Sell Item
            </Link>

            {/* ✅ FIX 3: Use isLoggedIn boolean */}
            {isLoggedIn && (
              <NavItem to="/chats" icon={FaCommentDots} label="Chats" badgeCount={unreadChatCount} />
            )}

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden lg:block"></div>

            {/* ✅ FIX 4: Use isLoggedIn boolean */}
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 sm:gap-3 px-2 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus:outline-none"
                >
                  {user && user.profilePic ? (
                    <img className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm" src={user.profilePic} alt="" />
                  ) : (
                    <FaUserCircle className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400" />
                  )}
                  <div className="hidden lg:flex flex-col items-start mr-1">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 leading-none">{user?.name?.split(' ')[0] || 'User'}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-0.5">My Profile</span>
                  </div>
                </button>
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="origin-top-right absolute right-0 mt-3 w-64 rounded-2xl shadow-2xl bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden transform transition-all" onMouseLeave={() => setIsDropdownOpen(false)}>
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900">
                      <p className="text-xs text-indigo-500 dark:text-indigo-400 uppercase tracking-wider font-bold mb-1">Signed in as</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
                    </div>
                    <div className="py-2">
                      <Link to="/profile" className="group flex items-center px-6 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><FaUser className="mr-3 text-gray-400 group-hover:text-indigo-500" /> Your Profile</Link>

                      {user && user.isAdmin && (
                        <Link to="/admin" className="md:hidden group flex items-center px-6 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 font-bold bg-red-50/50 dark:bg-red-900/5">
                          <FaUserShield className="mr-3 text-red-500" /> Admin Panel
                        </Link>
                      )}

                      <Link to="/my-listings" className="group flex items-center px-6 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><FaList className="mr-3 text-gray-400 group-hover:text-indigo-500" /> My Listings</Link>

                      {/* Switch Campus */}
                      <button
                        onClick={handleSwitchCampus}
                        className="w-full text-left group flex items-center px-6 py-3 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        <FaExchangeAlt className="mr-3 text-indigo-400" />
                        Switch Campus
                        {selectedCollege && (
                          <span className="ml-auto text-[10px] font-bold text-gray-400 dark:text-gray-500 truncate max-w-[70px]">{selectedCollege.shortName}</span>
                        )}
                      </button>

                      <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                      <div className="lg:hidden">
                        <Link to="/sell" className="group flex items-center px-6 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><FaPlus className="mr-3 text-gray-400 group-hover:text-indigo-500" /> Sell Item</Link>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                      </div>

                      <button onClick={handleLogout} className="w-full text-left group flex items-center px-6 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><FaSignOutAlt className="mr-3 text-red-400 group-hover:text-red-500" /> Sign out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">

                {/* Desktop: full buttons */}
                <div className="hidden sm:flex items-center gap-2">
                  <Link to="/login" className="text-gray-600 dark:text-gray-300 font-bold hover:text-indigo-600 px-3 py-2 text-sm whitespace-nowrap transition-colors">Log in</Link>
                  <Link to="/signup" className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-indigo-700 shadow-lg whitespace-nowrap transition-colors">Sign up</Link>
                  <button
                    onClick={handleSwitchCampus}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Switch campus"
                  >
                    <FaExchangeAlt />
                    <span className="hidden lg:block">Switch Campus</span>
                  </button>
                </div>

                {/* Mobile: hamburger only */}
                <div className="flex sm:hidden items-center gap-1">
                  <button
                    onClick={() => setIsMobileMenuOpen(prev => !prev)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    {isMobileMenuOpen ? <FaTimes className="text-base" /> : <FaBars className="text-base" />}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MOBILE MENU DROPDOWN (non-logged-in only) --- */}
      {!isLoggedIn && isMobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          <Link
            to="/signup"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
          >
            Create Account
          </Link>
          <Link
            to="/login"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center w-full py-3 px-4 border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-sm transition-colors"
          >
            Log in
          </Link>
          <button
            onClick={() => { setIsMobileMenuOpen(false); handleSwitchCampus(); }}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium rounded-xl text-sm transition-colors"
          >
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

      {/* --- MOBILE SEARCH BAR (Visible md:hidden) --- */}
      <div className="md:hidden px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 relative">
        <form onSubmit={handleFullSearch} className="relative">
          <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            // Added handlers here for mobile too
            onFocus={handleFocus}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Search..."
          />
        </form>
        {/* Added Dropdown for Mobile */}
        {showDropdown && <SearchDropdown />}
      </div>
    </nav>
  );
};

export default Navbar;