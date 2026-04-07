import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import ItemCard from '../components/ItemCard';
import API from '../api/axios.js';
import { toast } from 'react-toastify';
import { useCollege } from '../context/CollegeContext';
import SEOHead from '../components/SEOHead';
import { SEO } from '../utils/seoTemplates';
import { FiArrowRight, FiSearch, FiTag, FiMessageCircle, FiCheckCircle, FiShield, FiUsers, FiStar } from 'react-icons/fi';

// --- SKELETON COMPONENT ---
const SkeletonItemCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full animate-pulse">
    <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 w-full"></div>
    <div className="p-4 flex flex-col flex-1 gap-3">
      <div className="flex justify-between">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-auto"></div>
      <div className="flex items-center gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      </div>
    </div>
  </div>
);

// --- HOW IT WORKS DATA ---
const steps = [
  {
    number: '01',
    icon: <FiSearch className="w-7 h-7" />,
    title: 'Browse Listings',
    description: 'Explore hundreds of items listed by students at your campus — from books to electronics to cycles.',
  },
  {
    number: '02',
    icon: <FiMessageCircle className="w-7 h-7" />,
    title: 'Connect with Sellers',
    description: 'Chat directly with sellers within the platform. No middlemen, no delays — just quick, easy communication.',
  },
  {
    number: '03',
    icon: <FiCheckCircle className="w-7 h-7" />,
    title: 'Close the Deal',
    description: 'Meet on campus and exchange. Safe, simple, and entirely within your college community.',
  },
];

// --- WHY CAMPUS TRADE DATA ---
const features = [
  {
    icon: <FiShield className="w-6 h-6" />,
    title: 'Campus-Only Safety',
    description: 'Every buyer and seller is a verified student from your institution. Trade with confidence.',
  },
  {
    icon: <FiUsers className="w-6 h-6" />,
    title: 'Trusted Community',
    description: 'Built for and by students. Real profiles, real people, real trust within your college network.',
  },
  {
    icon: <FiTag className="w-6 h-6" />,
    title: 'Fair Prices',
    description: 'Student-to-student pricing means you always get a fair deal — no retail markups, no hidden fees.',
  },
  {
    icon: <FiStar className="w-6 h-6" />,
    title: 'Zero Commission',
    description: 'List and sell for free. Every rupee goes directly to the seller, always.',
  },
];

// --- CATEGORY SHORTCUTS ---
const categoryLinks = [
  { name: 'Cycles', emoji: '🚲', color: 'from-green-500 to-emerald-600' },
  { name: 'Books & Notes', emoji: '📚', color: 'from-blue-500 to-indigo-600' },
  { name: 'Electronics', emoji: '💻', color: 'from-purple-500 to-violet-600' },
  { name: 'Hostel Essentials', emoji: '🛏️', color: 'from-orange-500 to-amber-600' },
  { name: 'Stationery', emoji: '✏️', color: 'from-pink-500 to-rose-600' },
  { name: 'Others', emoji: '📦', color: 'from-cyan-500 to-teal-600' },
];

const PREVIEW_COUNT = 8;

const Home = () => {
  const [items, setItems] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('search') || '';

  const { selectedCollege } = useCollege();

  const user = JSON.parse(localStorage.getItem('user'));
  const isViewingOtherCollege = !!(user && selectedCollege && user.college !== selectedCollege.name);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await API.get('/items', {
        params: {
          search: searchQuery,
          college: selectedCollege?.name || '',
        },
      });
      const fetchedItems = Array.isArray(response.data)
        ? response.data
        : response.data.items || response.data.data || [];
      setItems(fetchedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  const fetchWishlist = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    try {
      const response = await API.get('/users/wishlist');
      setWishlist(response.data.map((item) => item._id));
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const handleToggleWishlist = async (e, itemId) => {
    e.preventDefault();
    e.stopPropagation();
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      toast.warning('Please login to save items to wishlist!');
      return;
    }
    try {
      if (wishlist.includes(itemId)) {
        setWishlist((prev) => prev.filter((id) => id !== itemId));
      } else {
        setWishlist((prev) => [...prev, itemId]);
      }
      await API.post('/users/wishlist', { itemId });
    } catch (error) {
      console.error('Failed to update wishlist', error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [searchQuery, selectedCollege]);

  useEffect(() => {
    fetchWishlist();
  }, []);

  useEffect(() => {
    if (searchQuery && !loading) {
      const timer = setTimeout(() => {
        const itemsSection = document.getElementById('items');
        if (itemsSection) {
          const elementPosition = itemsSection.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: elementPosition - 100, behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, loading]);

  const seo = SEO.home(selectedCollege);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white dark:bg-slate-950 transition-colors duration-300">
      <SEOHead {...seo} />

      {/* Animated Gradient Background */}
      <div className="fixed inset-0 gradient-dark-cyan-animated opacity-15 dark:opacity-30 pointer-events-none z-0"></div>
      <div className="fixed top-20 right-10 w-72 h-72 bg-cyan-400 rounded-full blur-3xl opacity-20 dark:opacity-15 float-animation pointer-events-none z-0"></div>
      <div className="fixed bottom-20 left-10 w-80 h-80 bg-teal-500 rounded-full blur-3xl opacity-20 dark:opacity-15 float-animation pointer-events-none z-0" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10">
        <Navbar />

        <main className="flex-grow">
          <HeroSection />

          {/* ── FRESH PICKS SECTION ── */}
          <section className="py-12 min-h-[400px]" id="items">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

              {/* Tourist Banner */}
              {isViewingOtherCollege && (
                <div className="mb-6 flex items-start gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-300 dark:border-amber-700/50 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300 shadow-sm">
                  <span className="text-lg leading-snug">👀</span>
                  <p>
                    You are viewing <strong>{selectedCollege.name}</strong>. Your home campus is{' '}
                    <strong>{user.college}</strong>. You can browse, but cannot contact sellers here.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-500 dark:from-cyan-400 dark:to-teal-300">
                    {searchQuery
                      ? `Results for "${searchQuery}"`
                      : selectedCollege
                      ? `Fresh Picks at ${selectedCollege.shortName}`
                      : 'Fresh Picks'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Recently listed by students on your campus
                  </p>
                </div>
                <Link
                  to="/browse"
                  className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors group"
                >
                  View all
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Items Grid — capped at PREVIEW_COUNT */}
              {loading ? (
                <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                  {[...Array(PREVIEW_COUNT)].map((_, index) => (
                    <div key={index} style={{ animationDelay: `${index * 0.1}s` }} className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                      <SkeletonItemCard />
                    </div>
                  ))}
                </div>
              ) : items.length > 0 ? (
                <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                  {items.slice(0, PREVIEW_COUNT).map((item, index) => (
                    <div key={item._id} style={{ '--animation-delay': `${index * 0.08}s` }}>
                      <ItemCard
                        item={item}
                        isWishlisted={wishlist.includes(item._id)}
                        onToggleWishlist={(e) => handleToggleWishlist(e, item._id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No items found.</p>
                </div>
              )}

              {/* Browse All Button */}
              {!loading && items.length > 0 && (
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/browse"
                    className="inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold text-sm shadow-lg hover:shadow-cyan-500/30 hover:from-cyan-400 hover:to-teal-400 transition-all duration-200 group"
                  >
                    Browse All Items
                    <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Filter by category, sort by price, and more
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ── CATEGORY SHORTCUTS ── */}
          <section className="py-14 bg-slate-50 dark:bg-slate-900/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Shop by Category
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Jump straight to what you're looking for
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {categoryLinks.map((cat) => (
                  <Link
                    key={cat.name}
                    to={`/browse?category=${encodeURIComponent(cat.name)}`}
                    className="group flex flex-col items-center justify-center p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-600 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform duration-200`}>
                      {cat.emoji}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 text-center leading-tight">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section className="py-20 bg-white dark:bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-14">
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-cyan-500 dark:text-cyan-400 mb-3">
                  Simple Process
                </span>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  How It Works
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-sm">
                  Trading within your campus has never been easier. Three steps and you're done.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Connector line (desktop only) */}
                <div className="hidden md:block absolute top-14 left-[calc(16.7%+1rem)] right-[calc(16.7%+1rem)] h-px bg-gradient-to-r from-cyan-200 via-teal-300 to-cyan-200 dark:from-cyan-800 dark:via-teal-700 dark:to-cyan-800 z-0"></div>

                {steps.map((step, i) => (
                  <div
                    key={step.number}
                    className="relative z-10 flex flex-col items-center text-center p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700 shadow-sm hover:shadow-lg transition-all duration-300 group"
                  >
                    {/* Step number badge */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {step.number}
                    </div>
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/30 border border-cyan-100 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-5 mt-4 group-hover:scale-110 transition-transform duration-200">
                      {step.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── WHY CAMPUS TRADE ── */}
          <section className="py-20 bg-slate-50 dark:bg-slate-900/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-14">
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-cyan-500 dark:text-cyan-400 mb-3">
                  Why Us
                </span>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Built for Campus Life
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-sm">
                  A marketplace designed around the unique needs of college students — safe, simple, and free.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feat) => (
                  <div
                    key={feat.title}
                    className="flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700 shadow-sm hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/30 border border-cyan-100 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 group-hover:scale-110 transition-transform duration-200">
                      {feat.icon}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{feat.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{feat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CALL TO ACTION ── */}
          <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
            {/* Background accents */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyan-500 rounded-full blur-3xl opacity-10"></div>
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-teal-500 rounded-full blur-3xl opacity-10"></div>
            </div>
            <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Got something to sell?
              </h2>
              <p className="text-gray-400 text-base mb-8 leading-relaxed">
                List your item in under 2 minutes. Reach hundreds of students on your campus for free — no fees, no commissions, ever.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/sell"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold text-sm shadow-lg hover:shadow-cyan-500/30 hover:from-cyan-400 hover:to-teal-400 transition-all duration-200 group"
                >
                  <FiTag className="text-base" />
                  List an Item
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/browse"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 text-slate-300 font-semibold text-sm hover:border-cyan-500 hover:text-cyan-400 transition-all duration-200"
                >
                  <FiSearch className="text-base" />
                  Browse Items
                </Link>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default Home;
