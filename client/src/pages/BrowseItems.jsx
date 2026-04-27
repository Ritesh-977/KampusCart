import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ItemCard from '../components/ItemCard';
import { apiCall } from '../api/apiWithFallback.js';
import { toast } from 'react-toastify';
import { useCollege } from '../context/CollegeContext';
import SEOHead from '../components/SEOHead';
import { FiArrowLeft } from 'react-icons/fi';

const SkeletonItemCard = () => (
  <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 flex flex-col">
    <div className="aspect-[4/3] w-full relative overflow-hidden bg-gray-100 dark:bg-gray-700">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent" />
    </div>
    <div className="p-4 flex flex-col gap-3">
      <div className="h-3 w-1/3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden relative">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
      </div>
      <div className="h-5 w-3/4 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden relative">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
      </div>
      <div className="h-5 w-1/2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden relative">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
      </div>
      <div className="flex items-center gap-2 mt-1 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-700" />
        <div className="h-3 w-1/3 rounded-full bg-gray-100 dark:bg-gray-700" />
      </div>
    </div>
  </div>
);

const categories = ['Cycles', 'Books & Notes', 'Electronics', 'Hostel Essentials', 'Stationery', 'Others'];
const LIMIT = 12;

const BrowseItems = () => {
  const [items, setItems]             = useState([]);
  const [wishlist, setWishlist]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);
  const [total, setTotal]             = useState(0);
  const [sortBy, setSortBy]           = useState('');

  // Refs — avoid stale closures in the observer callback
  const loaderRef      = useRef(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef     = useRef(true);
  const pageRef        = useRef(1);

  const location        = useLocation();
  const queryParams     = new URLSearchParams(location.search);
  const searchQuery     = queryParams.get('search') || '';
  const categoryFromUrl = queryParams.get('category') || '';

  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const { selectedCollege } = useCollege();
  const user = JSON.parse(localStorage.getItem('user'));
  const isViewingOtherCollege = !!(user && selectedCollege && user.college !== selectedCollege.name);

  useEffect(() => { setSelectedCategory(categoryFromUrl); }, [categoryFromUrl]);

  // Keep refs in sync with state
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { pageRef.current = page; }, [page]);

  const buildParams = useCallback((pg) => ({
    search: searchQuery,
    category: selectedCategory,
    sortBy,
    college: selectedCollege?.name || '',
    page: pg,
    limit: LIMIT,
  }), [searchQuery, selectedCategory, sortBy, selectedCollege]);

  // ── First page: reset everything ─────────────────────────────────────────
  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    setItems([]);
    setPage(1);
    setHasMore(true);
    hasMoreRef.current = true;
    pageRef.current = 1;
    try {
      const { data } = await apiCall.get('/items', { params: buildParams(1) });
      setItems(data.items || []);
      setHasMore(data.hasMore);
      setTotal(data.total || 0);
      hasMoreRef.current = data.hasMore;
    } catch (err) {
      console.error('Error fetching items:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // ── Next pages: append ────────────────────────────────────────────────────
  const fetchNextPage = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const { data } = await apiCall.get('/items', { params: buildParams(nextPage) });
      setItems(prev => [...prev, ...(data.items || [])]);
      setHasMore(data.hasMore);
      setPage(nextPage);
      hasMoreRef.current = data.hasMore;
      pageRef.current = nextPage;
    } catch (err) {
      console.error('Error fetching more items:', err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchFirstPage(); }, [fetchFirstPage]);

  // ── IntersectionObserver — rootMargin fires 300px BEFORE sentinel is visible
  // so the next page is already loading before the user hits the bottom ──────
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchNextPage(); },
      { rootMargin: '300px', threshold: 0 }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [fetchNextPage]);

  // ── Wishlist ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    apiCall.get('/users/wishlist')
      .then(({ data }) => setWishlist(data.map(i => i._id)))
      .catch(() => {});
  }, []);

  const handleToggleWishlist = async (e, itemId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.warning('Please login to save items to wishlist!'); return; }
    setWishlist(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
    try { await apiCall.post('/users/wishlist', { itemId }); } catch { /* ignore */ }
  };

  const pageTitle = searchQuery
    ? `Results for "${searchQuery}"`
    : selectedCategory || (selectedCollege ? `All Items at ${selectedCollege.shortName}` : 'Browse All Items');

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white dark:bg-slate-950 transition-colors duration-300">
      <style>{`
        @keyframes shimmer { to { transform: translateX(200%); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .item-enter {
          animation: fadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>

      <SEOHead
        title={`${pageTitle} | KampusCart`}
        description="Browse and filter all campus marketplace listings."
      />

      <div className="fixed inset-0 gradient-dark-cyan-animated opacity-15 dark:opacity-30 pointer-events-none z-0" />
      <div className="fixed top-20 right-10 w-72 h-72 bg-cyan-400 rounded-full blur-3xl opacity-20 dark:opacity-15 float-animation pointer-events-none z-0" />
      <div className="fixed bottom-20 left-10 w-80 h-80 bg-teal-500 rounded-full blur-3xl opacity-20 dark:opacity-15 float-animation pointer-events-none z-0" style={{ animationDelay: '2s' }} />

      <div className="relative z-10">
        <Navbar />

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-teal-700/30 py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors mb-4 group">
              <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">
              {pageTitle}
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              {!loading && `${total} item${total !== 1 ? 's' : ''} available`}
            </p>
          </div>
        </div>

        {/* Filter & Sort Bar */}
        <section className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 py-3 shadow-md border-b border-teal-200 dark:border-teal-700/30 sticky top-[116px] md:top-16 z-40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
              <div className="flex-1 overflow-hidden">
                <h3 className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-500 dark:from-cyan-400 dark:to-teal-400 uppercase tracking-widest mb-2">
                  Categories
                </h3>
                <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap border ${
                      selectedCategory === ''
                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-transparent shadow-lg'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-cyan-300 dark:border-cyan-600 hover:border-cyan-400'
                    }`}
                  >All</button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                      className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap border ${
                        selectedCategory === cat
                          ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-transparent shadow-lg'
                          : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-cyan-300 dark:border-cyan-600 hover:border-cyan-400'
                      }`}
                    >{cat}</button>
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0 lg:border-l lg:pl-8 dark:border-teal-700/30 border-teal-200">
                <h3 className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-500 dark:from-cyan-400 dark:to-teal-400 uppercase tracking-widest mb-2">
                  Sort By
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {[['priceLow', 'Price: Low to High'], ['priceHigh', 'Price: High to Low']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setSortBy(sortBy === val ? '' : val)}
                      className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-all whitespace-nowrap ${
                        sortBy === val
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 shadow-md'
                          : 'border-cyan-300 dark:border-cyan-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:border-cyan-400'
                      }`}
                    >{label}</button>
                  ))}
                  {(selectedCategory || sortBy) && (
                    <button
                      onClick={() => { setSelectedCategory(''); setSortBy(''); }}
                      className="px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-all whitespace-nowrap border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >Clear Filters</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Grid */}
        <main className="py-12 min-h-[500px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {isViewingOtherCollege && (
              <div className="mb-6 flex items-start gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-300 dark:border-amber-700/50 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300 shadow-sm">
                <span className="text-lg leading-snug">👀</span>
                <p>You are viewing <strong>{selectedCollege.name}</strong>. Your home campus is <strong>{user.college}</strong>. You can browse, but cannot contact sellers here.</p>
              </div>
            )}

            {!loading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-8">
                {total} item{total !== 1 ? 's' : ''} available
              </p>
            )}

            {/* Initial skeleton */}
            {loading && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(LIMIT)].map((_, i) => <SkeletonItemCard key={i} />)}
              </div>
            )}

            {/* Items */}
            {!loading && items.length > 0 && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item, i) => (
                  <div
                    key={item._id}
                    className="item-enter"
                    style={{ animationDelay: `${Math.min(i % LIMIT, 7) * 40}ms` }}
                  >
                    <ItemCard
                      item={item}
                      isWishlisted={wishlist.includes(item._id)}
                      onToggleWishlist={(e) => handleToggleWishlist(e, item._id)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && items.length === 0 && (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No items found matching your criteria.</p>
                <button
                  onClick={() => { setSelectedCategory(''); setSortBy(''); }}
                  className="mt-4 text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
                >Clear Filters</button>
              </div>
            )}

            {/* Sentinel + load-more skeletons */}
            <div ref={loaderRef} className="mt-6">
              {loadingMore && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => <SkeletonItemCard key={i} />)}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default BrowseItems;
