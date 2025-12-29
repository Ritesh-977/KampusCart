import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import ItemCard from '../components/ItemCard';
import API from '../api/axios.js';
import { toast } from "react-toastify";

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
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    const token = localStorage.getItem('token');
    if (!token) return; 

    try {
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

    const token = localStorage.getItem('token');
    if (!token) {
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

  // --- 1. SCROLL LISTENER (Infinite Scroll) ---
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

  // --- 3. AUTO-SCROLL LOGIC (FIXED WITH DELAY) ---
  useEffect(() => {
    if (searchQuery && !loading) {
      // We wait 100ms to let the browser finish "resetting" the scroll to top
      const timer = setTimeout(() => {
        const itemsSection = document.getElementById('items');
        if (itemsSection) {
          const elementPosition = itemsSection.getBoundingClientRect().top + window.scrollY;
          // Offset of 240px handles the Sticky Navbar + Filter Bar height
          const offsetPosition = elementPosition - 240; 

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100); // 100ms delay ensures reliability

      return () => clearTimeout(timer);
    }
  }, [searchQuery, loading]); 

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Navbar />
      
      <main className="flex-grow">
        <HeroSection />

        {/* --- FILTER & SORT SECTION --- */}
        <section className="bg-white dark:bg-gray-800 py-8 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-20 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
              
              <div className="flex-1 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Categories</h3>
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                      onClick={() => setSelectedCategory('')}
                      className={`inline-flex items-center px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                        selectedCategory === '' 
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      All
                    </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                      className={`inline-flex items-center px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                        selectedCategory === cat 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0 lg:border-l lg:pl-8 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sort By</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSortBy(sortBy === 'priceLow' ? '' : 'priceLow')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      sortBy === 'priceLow'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Price: Low to High
                  </button>
                  <button
                    onClick={() => setSortBy(sortBy === 'priceHigh' ? '' : 'priceHigh')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
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

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
            
            {items.length > visibleCount && (
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