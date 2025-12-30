import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { FaHeart, FaMapMarkerAlt, FaSadTear, FaExternalLinkAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Wishlist = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/users/wishlist`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWishlist();
  }, []);

  const handleRemove = async (e, itemId) => {
    e.preventDefault(); 
    setItems(items.filter(item => item._id !== itemId));

    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_SERVER_URL}/api/users/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId })
      });
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  if (loading) return (
      // FIX 1: Loading Spinner Background
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
  );

  return (
    // FIX 2: Main Page Background
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-20 transition-colors duration-200">
      <Navbar />

      {/* Header */}
      <div className="bg-pink-600 dark:bg-pink-700 pt-10 pb-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-extrabold text-white">My Wishlist</h1>
            {/* FIX 3: Subtitle Color */}
            <p className="mt-2 text-pink-100 dark:text-pink-200 text-lg">Items you are keeping an eye on.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        
        {items.length === 0 ? (
           // FIX 4: Empty State Card
           <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 text-center flex flex-col items-center border border-gray-100 dark:border-gray-700 transition-colors">
              <FaSadTear className="text-gray-300 dark:text-gray-600 text-6xl mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your wishlist is empty</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">Explore the marketplace and save items you like!</p>
              <Link to="/" className="px-6 py-3 bg-pink-600 hover:bg-pink-700 dark:bg-pink-700 dark:hover:bg-pink-600 text-white rounded-full font-bold transition shadow-md">
                  Browse Items
              </Link>
           </div>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                // FIX 5: Item Card Background & Border
                <div key={item._id} className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                    
                    <Link to={`/item/${item._id}`} className="absolute inset-0 z-0" />

                    <div className="relative h-56 w-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                       <img 
                        src={item.image || (item.images && item.images[0])} 
                        alt={item.title} 
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                       />
                       
                       {/* FIX 6: Remove Button Background */}
                       <button 
                         onClick={(e) => handleRemove(e, item._id)}
                         className="absolute top-3 right-3 z-10 p-2 bg-white dark:bg-gray-900/80 rounded-full shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition transform hover:scale-110 group/btn"
                         title="Remove from Wishlist"
                       >
                         <FaHeart className="text-pink-500 text-lg group-hover/btn:text-gray-300 dark:group-hover/btn:text-gray-500 transition-colors" />
                       </button>

                       <div className="absolute bottom-3 left-3 bg-black bg-opacity-60 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-bold">
                          ₹{item.price}
                       </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                        {/* FIX 7: Title & Category Text */}
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">{item.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-3">{item.category}</p>
                        
                        {/* FIX 8: Footer Border & Text */}
                        <div className="mt-auto flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 font-medium pt-3 border-t border-gray-100 dark:border-gray-700">
                             <span className="flex items-center"><FaMapMarkerAlt className="mr-1 text-pink-500" /> {item.location || 'Campus'}</span>
                             <span className="flex items-center text-pink-600 dark:text-pink-400 font-bold group-hover:underline">
                                View Details <FaExternalLinkAlt className="ml-1" />
                             </span>
                        </div>
                    </div>
                </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;