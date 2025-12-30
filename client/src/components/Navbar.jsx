import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaSearch, FaUserCircle, FaStore, FaHistory, FaTrashAlt, 
  FaHeart, FaPlus, FaSignOutAlt, FaUser, FaList, FaBullhorn, 
  FaCommentDots, FaTimes, FaSun, FaMoon 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import API from '../api/axios'; 
import io from 'socket.io-client'; 
import { useTheme } from '../context/ThemeContext'; 

const ENDPOINT = import.meta.env.VITE_SERVER_URL;

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { theme, toggleTheme } = useTheme(); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]); 
  const [showDropdown, setShowDropdown] = useState(false); 
  const [history, setHistory] = useState([]);
  
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(localStorage.getItem('userInfo'));

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
          const { data } = await API.get(`/items?search=${searchTerm}`);
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
  }, [searchTerm]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userInfo');
    toast.success('Logged out successfully!');
    navigate('/login');
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
    <Link to={to} className="relative flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group">
       <Icon className="text-lg group-hover:scale-110 transition-transform text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
       <span className="hidden xl:block">{label}</span>
       {badgeCount > 0 && (
         <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
           {badgeCount}
         </span>
       )}
    </Link>
  );

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[95rem] mx-auto">
        <div className="flex justify-between h-20 items-center gap-2 sm:gap-4">

          {/* Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer min-w-fit" onClick={() => navigate('/')}>
            <div className="flex items-center text-xl sm:text-2xl font-black text-indigo-600 tracking-tight">
              <FaStore className="h-6 w-6 sm:h-8 sm:w-8 mr-1.5 sm:mr-2.5" />
              <span className="dark:text-white">kampus<span className="text-gray-900 dark:text-gray-400">Cart</span></span>
            </div>
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
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all shadow-sm"
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

            {/* --- DROPDOWN --- */}
            {showDropdown && (
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
                                <FaStore className="h-full w-full p-2 text-gray-300" />
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
            )}
          </div>

          {/* 3. RIGHT: Actions */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            
            {/* FIX 1: Wishlist Logic
               - Logged In (token exists): Show everywhere ("flex")
               - Logged Out (!token): Hide on mobile ("hidden sm:flex")
            */}
            <div className={token ? "flex" : "hidden sm:flex"}>
                <NavItem to="/wishlist" icon={FaHeart} label="Wishlist" />
            </div>

            {/* Always show Lost & Found */}
            <NavItem to="/lost-and-found" icon={FaBullhorn} label="Lost & Found" />
            
            {/* Sell Button: Desktop Only */}
            <Link
                to="/sell"
                className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 border border-transparent text-sm font-bold rounded-full shadow-lg text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 transition-all transform hover:-translate-y-0.5 mx-2"
            >
                <FaPlus className="text-xs" />
                Sell Item
            </Link>

            {/* Only show Chats if User is Logged In */}
            {token && (
                <NavItem to="/chats" icon={FaCommentDots} label="Chats" badgeCount={unreadChatCount} />
            )}

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden lg:block"></div>
            
            {token ? (
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
                      <span className="text-[10px] font-medium text-gray-400 leading-none mt-0.5">My Profile</span>
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
                      <Link to="/my-listings" className="group flex items-center px-6 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><FaList className="mr-3 text-gray-400 group-hover:text-indigo-500" /> My Listings</Link>
                      
                      <button 
                        onClick={toggleTheme}
                        className="w-full text-left group flex items-center px-6 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {theme === 'dark' ? (
                            <><FaSun className="mr-3 text-yellow-500" /> Light Mode</>
                        ) : (
                            <><FaMoon className="mr-3 text-indigo-500" /> Dark Mode</>
                        )}
                      </button>
                      
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                      
                      <div className="lg:hidden">
                          {/* Mobile Menu: Add Sell Item back here for easy access */}
                          <Link to="/sell" className="group flex items-center px-6 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><FaPlus className="mr-3 text-gray-400 group-hover:text-indigo-500" /> Sell Item</Link>
                          <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                      </div>

                      <button onClick={handleLogout} className="w-full text-left group flex items-center px-6 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><FaSignOutAlt className="mr-3 text-red-400 group-hover:text-red-500" /> Sign out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Improved Mobile Layout for Logged Out State
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-gray-600 dark:text-gray-300 font-bold hover:text-indigo-600 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">Log in</Link>
                <Link to="/signup" className="bg-indigo-600 text-white px-3 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-indigo-700 shadow-lg whitespace-nowrap">Sign up</Link>
                
                <button 
                  onClick={toggleTheme}
                  className="ml-1 sm:ml-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-yellow-400 transition-colors"
                >
                   {theme === 'dark' ? <FaSun className="text-sm sm:text-base" /> : <FaMoon className="text-sm sm:text-base" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
        <form onSubmit={handleFullSearch} className="relative">
          <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Search..."
          />
        </form>
      </div>
    </nav>
  );
};

export default Navbar;