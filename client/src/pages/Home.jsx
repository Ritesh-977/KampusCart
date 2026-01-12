import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import ItemCard from '../components/ItemCard';
import API from '../api/axios.js';
import { toast } from "react-toastify";

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

const Home = () => {
  const [items, setItems] = useState([]);
  const [wishlist, setWishlist] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [visibleCount, setVisibleCount] = useState(8); 

  // Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState(''); 

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('search') || '';

  const categories = ['Cycles', 'Books & Notes', 'Electronics', 'Hostel Essentials', 'Stationery', 'Others'];

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await API.get('/items', {
        params: {
          search: searchQuery,
          category: selectedCategory,
          sortBy: sortBy
        }
      });
      setItems(response.data);
      setVisibleCount(8); 
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  const fetchWishlist = async () => {
    // ✅ FIX 1: Check for 'user' object instead of 'token' string
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return; 

    try {
      // API instance automatically sends the HttpOnly cookie
      const response = await API.get('/users/wishlist');
      const ids = response.data.map(item => item._id);
      setWishlist(ids);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    }
  };

  const handleToggleWishlist = async (e, itemId) => {
    e.preventDefault(); 
    e.stopPropagation();

    // ✅ FIX 2: Check for 'user' object
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        toast.warning("Please login to save items to wishlist!");
        return;
    }

    try {
      if (wishlist.includes(itemId)) {
        setWishlist(prev => prev.filter(id => id !== itemId));
      } else {
        setWishlist(prev => [...prev, itemId]);
      }
      await API.post('/users/wishlist', { itemId });
    } catch (error) {
      console.error("Failed to update wishlist", error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 100 
        >= document.documentElement.offsetHeight
      ) {
        setVisibleCount((prev) => prev + 8);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory, searchQuery, sortBy]);

  useEffect(() => {
    fetchWishlist();
  }, []);

  useEffect(() => {
    if (searchQuery && !loading) {
      const timer = setTimeout(() => {
        const itemsSection = document.getElementById('items');
        if (itemsSection) {
          const elementPosition = itemsSection.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementPosition - 280; 

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100); 

      return () => clearTimeout(timer);
    }
  }, [searchQuery, loading]); 

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Navbar />
      
      <main className="flex-grow">
        <HeroSection />

        <section className="bg-white dark:bg-gray-800 py-3 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-[150px] md:top-20 z-40 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
              
              {/* Categories */}
              <div className="flex-1 overflow-hidden">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Categories</h3>
                <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                      onClick={() => setSelectedCategory('')}
                      className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap border ${
                        selectedCategory === '' 
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-md' 
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
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
                        ? 'bg-indigo-600 text-white border-transparent shadow-md' 
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div className="flex-shrink-0 lg:border-l lg:pl-8 dark:border-gray-700">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Sort By</h3>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setSortBy(sortBy === 'priceLow' ? '' : 'priceLow')}
                    className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-all whitespace-nowrap ${
                      sortBy === 'priceLow'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Price: Low to High
                  </button>
                  <button
                    onClick={() => setSortBy(sortBy === 'priceHigh' ? '' : 'priceHigh')}
                    className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-all whitespace-nowrap ${
                      sortBy === 'priceHigh'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Price: High to Low
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* --- ITEMS GRID SECTION --- */}
        <section className="py-12 min-h-[500px]" id="items">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {searchQuery ? `Results for "${searchQuery}"` : selectedCategory ? `${selectedCategory}` : 'Fresh Recommendations'}
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Showing {Math.min(visibleCount, items.length)} of {items.length} items
              </span>
            </div>

            {/* --- REPLACED SPINNER WITH SKELETON GRID --- */}
            {loading ? (
              <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                {/* Render 8 Skeleton Cards while loading */}
                {[...Array(8)].map((_, index) => (
                  <SkeletonItemCard key={index} />
                ))}
              </div>
            ) : items.length > 0 ? (
              <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                {items.slice(0, visibleCount).map((item) => (
                  <Link to={`/item/${item._id}`} key={item._id}>
                    <ItemCard 
                      item={item} 
                      isWishlisted={wishlist.includes(item._id)}
                      onToggleWishlist={(e) => handleToggleWishlist(e, item._id)}
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No items found matching your criteria.</p>
                <button onClick={() => {setSelectedCategory(''); setSortBy('');}} className="mt-4 text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Clear Filters</button>
              </div>
            )}
            
            {!loading && items.length > visibleCount && (
               <div className="py-8 text-center text-gray-400 text-sm italic">
                 Scroll for more...
               </div>
            )}
          </div>
        </section>
      </main>
      
    </div>
  );
};

export default Home;