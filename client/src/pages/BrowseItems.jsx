import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ItemCard from '../components/ItemCard';
import { apiCall } from '../api/apiWithFallback.js';
import { toast } from 'react-toastify';
import { useCollege } from '../context/CollegeContext';
import SEOHead from '../components/SEOHead';
import { FiArrowLeft, FiFilter, FiChevronDown } from 'react-icons/fi';

const SkeletonItemCard = () => (
  <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col h-full animate-pulse">
    <div className="aspect-[4/3] bg-surface-muted w-full"></div>
    <div className="p-4 flex flex-col flex-1 gap-3">
      <div className="flex justify-between">
        <div className="h-4 bg-surface-muted rounded w-1/3"></div>
        <div className="h-4 bg-surface-muted rounded w-1/4"></div>
      </div>
      <div className="h-6 bg-surface-muted rounded w-3/4"></div>
      <div className="h-8 bg-surface-muted rounded w-1/2 mt-auto"></div>
      <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border">
        <div className="h-8 w-8 rounded-full bg-surface-muted"></div>
        <div className="h-4 bg-surface-muted rounded w-1/3"></div>
      </div>
    </div>
  </div>
);

const categories = ['Cycles', 'Books & Notes', 'Electronics', 'Hostel Essentials', 'Stationery', 'Others'];

const BrowseItems = () => {
  const [items, setItems] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('');

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('search') || '';
  const initialCategory = queryParams.get('category') || '';

  const { selectedCollege } = useCollege();
  const user = JSON.parse(localStorage.getItem('user'));
  const isViewingOtherCollege = !!(user && selectedCollege && user.college !== selectedCollege.name);

  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await apiCall.get('/items', {
        params: {
          search: searchQuery,
          category: selectedCategory,
          sortBy,
          college: selectedCollege?.name || '',
        },
      });
      const fetchedItems = Array.isArray(response.data)
        ? response.data
        : response.data.items || response.data.data || [];
      setItems(fetchedItems);
      setVisibleCount(12);
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
      const response = await apiCall.get('/users/wishlist');
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
      await apiCall.post('/users/wishlist', { itemId });
    } catch (error) {
      console.error('Failed to update wishlist', error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop + 100 >= document.documentElement.offsetHeight) {
        setVisibleCount((prev) => prev + 12);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory, searchQuery, sortBy, selectedCollege]);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const pageTitle = searchQuery
    ? `Results for "${searchQuery}"`
    : selectedCategory
    ? selectedCategory
    : selectedCollege
    ? `All Items at ${selectedCollege.shortName}`
    : 'Browse All Items';

  return (
    <div className="min-h-screen flex flex-col font-sans bg-surface transition-colors duration-300">
      <SEOHead
        title={`${pageTitle} | CampusTrade`}
        description="Browse and filter all campus marketplace listings."
      />

      {/* Background */}
      <div className="fixed inset-0 gradient-dark-cyan-animated opacity-15 dark:opacity-30 pointer-events-none z-0"></div>
      <div className="fixed top-20 right-10 w-72 h-72 bg-accent rounded-full blur-3xl opacity-20 dark:opacity-15 float-animation pointer-events-none z-0"></div>
      <div className="fixed bottom-20 left-10 w-80 h-80 bg-primary rounded-full blur-3xl opacity-20 dark:opacity-15 float-animation pointer-events-none z-0" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10">
        <Navbar />

        {/* Page Header */}
        <div className="bg-gradient-to-r from-surface-inverse to-surface-inverse border-b border-primary/30 py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent transition-colors mb-4 group"
            >
              <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              {pageTitle}
            </h1>
            <p className="text-inverse-muted mt-1 text-sm">
              {!loading && `${items.length} item${items.length !== 1 ? 's' : ''} available`}
            </p>
          </div>
        </div>

        {/* Filter & Sort Bar */}
        <section className="bg-gradient-to-r from-white to-surface-muted   py-3 shadow-md border-b border-primary sticky top-16 z-40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">

              {/* Categories */}
              <div className="flex-1 overflow-hidden">
                <h3 className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary   uppercase tracking-widest mb-2">
                  Categories
                </h3>
                <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap border ${
                      selectedCategory === ''
                        ? 'bg-gradient-to-r from-accent to-primary text-white border-transparent shadow-lg'
                        : 'bg-surface text-foreground border-accent hover:border-accent'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                      className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap border ${
                        selectedCategory === cat
                          ? 'bg-gradient-to-r from-accent to-primary text-white border-transparent shadow-lg'
                          : 'bg-surface text-foreground border-accent hover:border-accent'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div className="flex-shrink-0 lg:border-l lg:pl-8 border-primary/30">
                <h3 className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary   uppercase tracking-widest mb-2">
                  Sort By
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setSortBy(sortBy === 'priceLow' ? '' : 'priceLow')}
                    className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-all whitespace-nowrap ${
                      sortBy === 'priceLow'
                        ? 'border-accent bg-accent-muted text-accent shadow-md'
                        : 'border-accent bg-surface text-muted hover:border-accent'
                    }`}
                  >
                    Price: Low to High
                  </button>
                  <button
                    onClick={() => setSortBy(sortBy === 'priceHigh' ? '' : 'priceHigh')}
                    className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-all whitespace-nowrap ${
                      sortBy === 'priceHigh'
                        ? 'border-accent bg-accent-muted text-accent shadow-md'
                        : 'border-accent bg-surface text-muted hover:border-accent'
                    }`}
                  >
                    Price: High to Low
                  </button>
                  {(selectedCategory || sortBy) && (
                    <button
                      onClick={() => { setSelectedCategory(''); setSortBy(''); }}
                      className="px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-all whitespace-nowrap border-danger bg-surface text-danger hover:bg-danger-muted dark:hover:bg-danger/20"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Items Grid */}
        <main className="py-12 min-h-[500px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Tourist Banner */}
            {isViewingOtherCollege && (
              <div className="mb-6 flex items-start gap-3 bg-gradient-to-r from-warning-muted to-warning-muted   border border-warning rounded-xl px-4 py-3 text-sm text-warning shadow-sm">
                <span className="text-lg leading-snug">👀</span>
                <p>
                  You are viewing <strong>{selectedCollege.name}</strong>. Your home campus is{' '}
                  <strong>{user.college}</strong>. You can browse, but cannot contact sellers here.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mb-8">
              <span className="text-sm text-muted font-medium">
                Showing {Math.min(visibleCount, items.length)} of {items.length} items
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                {[...Array(12)].map((_, index) => (
                  <div key={index} style={{ animationDelay: `${index * 0.05}s` }} className="animate-in fade-in duration-500">
                    <SkeletonItemCard />
                  </div>
                ))}
              </div>
            ) : items.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                  {items.slice(0, visibleCount).map((item, index) => (
                    <div key={item._id} style={{ '--animation-delay': `${index * 0.05}s` }}>
                      <ItemCard
                        item={item}
                        isWishlisted={wishlist.includes(item._id)}
                        onToggleWishlist={(e) => handleToggleWishlist(e, item._id)}
                      />
                    </div>
                  ))}
                </div>
                {visibleCount < items.length && (
                  <div className="flex justify-center mt-12">
                    <div className="flex items-center gap-2 text-accent animate-bounce">
                      <FiChevronDown className="text-xl" />
                      <span className="text-sm font-medium">Scroll for more</span>
                      <FiChevronDown className="text-xl" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border-strong">
                <p className="text-muted text-lg font-medium">
                  No items found matching your criteria.
                </p>
                <button
                  onClick={() => { setSelectedCategory(''); setSortBy(''); }}
                  className="mt-4 text-accent font-bold hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default BrowseItems;
